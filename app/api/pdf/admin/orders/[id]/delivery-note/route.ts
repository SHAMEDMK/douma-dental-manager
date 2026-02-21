import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getPdfBrowser } from "@/app/lib/pdf-browser"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit-middleware"
import { logUnauthorizedAccess } from "@/lib/audit-security"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting: 20 PDF requests per minute
  const rateLimitResponse = await withRateLimit(req, RATE_LIMIT_PRESETS.PDF)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  try {
    const { id: orderId } = await params
    
    if (!orderId || typeof orderId !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid order ID" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Check authentication and role
    const session = await getSession()
    if (!session) {
      await logUnauthorizedAccess(
        `/api/pdf/admin/orders/${orderId}/delivery-note`,
        'Non authentifié',
        req.headers,
        null
      )
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (session.role !== 'ADMIN' && session.role !== 'COMPTABLE' && session.role !== 'MAGASINIER') {
      await logUnauthorizedAccess(
        `/api/pdf/admin/orders/${orderId}/delivery-note`,
        `Non autorisé - rôle requis: ADMIN, COMPTABLE ou MAGASINIER (actuel: ${session.role})`,
        req.headers,
        session
      )
      return new Response(
        JSON.stringify({ error: "Accès refusé" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Fetch order and verify it has deliveryNoteNumber
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        deliveryNoteNumber: true,
        status: true,
      },
    })

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Check if deliveryNoteNumber exists
    if (!order.deliveryNoteNumber) {
      return new Response(
        JSON.stringify({ error: "Delivery note not available for this order" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    if (process.env.VERCEL === '1' && (!process.env.APP_URL || process.env.APP_URL.includes('localhost'))) {
      return new Response(
        JSON.stringify({
          error: "Erreur lors de la génération du PDF",
          message: "Configuration serveur : définir APP_URL (URL publique) dans Vercel.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Récupérer les cookies pour injection dans Playwright
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    if (allCookies.length === 0) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const printUrl = `${appUrl}/admin/orders/${orderId}/delivery-note/print?pdf=1`

    // Extraire le hostname du appUrl
    const urlObj = new URL(appUrl)
    const domain = urlObj.hostname
    const path = '/'

    const { chromium, launchOptions } = await getPdfBrowser()
    const browser = await chromium.launch({ headless: true, ...launchOptions })
    try {
      const context = await browser.newContext()
      
      // Injecter les cookies au format Playwright (plus fiable que setExtraHTTPHeaders)
      const playwrightCookies = allCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: domain === 'localhost' ? 'localhost' : domain.startsWith('.') ? domain : `.${domain}`,
        path: path,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax' as const,
      }))
      
      await context.addCookies(playwrightCookies)
      
      const page = await context.newPage()

      // Navigate and wait for the page to load
      const response = await page.goto(printUrl, { 
        waitUntil: "networkidle",
        timeout: 30000 
      })

      // Check if the page loaded successfully (not 404)
      if (response && response.status() === 404) {
        return new Response(
          JSON.stringify({ error: "Bon de livraison introuvable ou accès refusé" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      // Check if redirected to login (status 307/308 or URL changed)
      const finalUrl = page.url()
      if (finalUrl.includes('/login')) {
        return new Response(
          JSON.stringify({ error: "Accès refusé" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      await page.emulateMedia({ media: "print" })

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
      })

      // Convert Buffer to Uint8Array for Next.js Response
      const pdfArray = new Uint8Array(pdfBuffer)

      // Use deliveryNoteNumber for filename (e.g., BL-20260104-0001.pdf)
      const filename = `${order.deliveryNoteNumber}.pdf`

      return new Response(pdfArray, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error("PDF generation error:", error)
    const raw = error instanceof Error ? error.message : String(error)
    const isVercel = process.env.VERCEL === '1'
    const message = isVercel && (raw.includes('executable') || raw.includes('ENOENT') || raw.includes('path'))
      ? "Chromium indisponible sur l'environnement de déploiement. Vérifier APP_URL et les logs Vercel."
      : (raw || "Erreur lors de la génération du PDF. Veuillez réessayer.")
    return new Response(
      JSON.stringify({ error: "Erreur lors de la génération du PDF", message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
