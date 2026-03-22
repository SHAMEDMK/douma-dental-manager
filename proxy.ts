import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const key = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

/**
 * Limite les comptes MAGASINIER (entrepôt) aux zones achat + stock dans /admin.
 * Les autres rôles ne sont pas filtrés ici.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value
  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.next()
  }

  let payload: { role?: string; userType?: string | null } | null = null
  try {
    const { payload: p } = await jwtVerify(token, key)
    payload = p as { role?: string; userType?: string | null }
  } catch {
    return NextResponse.next()
  }

  if (payload?.role !== 'MAGASINIER') {
    return NextResponse.next()
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
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/admin/purchases', request.url))
}

export const config = {
  matcher: ['/admin/:path*'],
}
