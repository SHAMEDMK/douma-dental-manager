import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const key = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

/**
 * Limite les comptes MAGASINIER (entrepôt) aux zones achat + stock dans /admin.
 * Limite COMMERCIAL au même périmètre que la sidebar (clients, commandes hors BL, fournisseurs, achats, dashboard).
 * ADMIN / COMPTABLE : pas de filtrage ici (COMPTABLE est redirigé vers /comptable depuis le layout sauf exceptions).
 */
function nextWithInvokePath(request: NextRequest, pathname: string) {
  const h = new Headers(request.headers)
  h.set('x-invoke-path', pathname)
  return NextResponse.next({ request: { headers: h } })
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value
  if (!token || !process.env.JWT_SECRET) {
    return nextWithInvokePath(request, pathname)
  }

  let payload: { role?: string; userType?: string | null } | null = null
  try {
    const { payload: p } = await jwtVerify(token, key)
    payload = p as { role?: string; userType?: string | null }
  } catch {
    return nextWithInvokePath(request, pathname)
  }

  if (payload?.role === 'COMMERCIAL') {
    if (pathname === '/admin' || pathname === '/admin/') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    const isOrderDeliveryNote =
      pathname.startsWith('/admin/orders/') && pathname.includes('/delivery-note')

    if (isOrderDeliveryNote) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    const ok =
      pathname.startsWith('/admin/dashboard') ||
      pathname.startsWith('/admin/clients') ||
      pathname.startsWith('/admin/suppliers') ||
      pathname.startsWith('/admin/purchases') ||
      pathname === '/admin/orders' ||
      pathname.startsWith('/admin/orders/')

    if (ok) {
      return nextWithInvokePath(request, pathname)
    }

    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  if (payload?.role !== 'MAGASINIER') {
    return nextWithInvokePath(request, pathname)
  }

  if (payload.userType === 'LIVREUR') {
    return NextResponse.redirect(new URL('/delivery', request.url))
  }

  const allowed =
    pathname === '/admin/purchases' ||
    pathname.startsWith('/admin/purchases/') ||
    pathname === '/admin/stock' ||
    pathname.startsWith('/admin/stock/')

  if (allowed) {
    return nextWithInvokePath(request, pathname)
  }

  return NextResponse.redirect(new URL('/admin/purchases', request.url))
}

export const config = {
  matcher: ['/admin/:path*'],
}
