import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { chromium } from "playwright"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit-middleware"
import { logUnauthorizedAccess } from "@/lib/audit-security"

export const runtime = "nodejs" // IMPORTANT: Playwright nécessite Node runtime (pas Edge)

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
    const { id: invoiceId } = await params
    
    if (!invoiceId || typeof invoiceId !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid invoice ID" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Vérifier la session AVANT de lancer Playwright
    const session = await getSession()
    if (!session) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/invoices/${invoiceId}`,
        'Non authentifié',
        req.headers,
        null
      )
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Vérifier que l'utilisateur est un CLIENT (portal)
    if (session.role !== 'CLIENT') {
      await logUnauthorizedAccess(
        `/api/pdf/portal/invoices/${invoiceId}`,
        `Non autorisé - rôle requis: CLIENT (actuel: ${session.role})`,
        req.headers,
        session
      )
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Récupérer le numéro de facture officiel pour le nom de fichier
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        id: true,
        createdAt: true,
        order: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Vérifier que la facture appartient au client connecté
    if (invoice.order.userId !== session.id) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/invoices/${invoiceId}`,
        `Accès refusé - facture appartient à un autre utilisateur (userId: ${invoice.order.userId}, sessionId: ${session.id})`,
        req.headers,
        session
      )
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // ✅ Nom de fichier PDF (admin + client) : FAC-YYYYMMDD-####.pdf
    // ✅ Fallback si invoiceNumber est null : FAC-{invoice.id}.pdf
    const safeId = invoice.id.replace(/[^a-zA-Z0-9_-]/g, '')
    const invoiceNumber = (invoice.invoiceNumber && invoice.invoiceNumber.trim().length > 0)
      ? invoice.invoiceNumber.trim()
      : `FAC-${safeId}`

    const filename = `${invoiceNumber}.pdf`

    const appUrl = process.env.APP_URL || "http://localhost:3000"

    // Récupérer les cookies pour injection dans Playwright
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    if (allCookies.length === 0) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const printUrl = `${appUrl}/portal/invoices/${invoiceId}/print?pdf=1`

    // Extraire le hostname du appUrl
    const urlObj = new URL(appUrl)
    const domain = urlObj.hostname
    const path = '/'

    const browser = await chromium.launch({ headless: true })
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
          JSON.stringify({ error: "Invoice not found or access denied" }),
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
          JSON.stringify({ error: "Authentication failed" }),
          {
            status: 401,
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
      const pdfBytes = new Uint8Array(pdfBuffer)

      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error("PDF generation error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ 
        error: "Erreur lors de la génération du PDF",
        message: errorMessage || "Une erreur inattendue s'est produite lors de la génération du PDF. Veuillez réessayer."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
