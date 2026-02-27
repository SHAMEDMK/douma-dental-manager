import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Pour les requêtes vers une page "print" avec ?pdf=1 (utilisées par PDFShift),
 * on ajoute un header pour que les layouts admin/comptable/portal n'affichent pas
 * la sidebar ni l'en-tête (DOUMAAdmin, etc.) dans le PDF généré.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl
  if (url.pathname.includes("/print") && url.searchParams.get("pdf") === "1") {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-pdf-export", "1")
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/comptable/:path*", "/portal/:path*"],
}
