import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { launchPdfBrowser } from "@/app/lib/pdf-browser"
import { shouldUseExternalPdf, generatePdfFromUrl } from "@/app/lib/pdf-external"
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
  const rateLimitResponse = await withRateLimit(req, RATE_LIMIT_PRESETS.PDF)
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = "pdf/portal/orders/delivery-note/[id]"

  try {
    const { id: orderId } = await params

    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid order ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const session = await getSession()
    if (!session) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/orders/${orderId}/delivery-note`,
        "Non authentifié",
        req.headers,
        null
      )
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (session.role !== "CLIENT") {
      await logUnauthorizedAccess(
        `/api/pdf/portal/orders/${orderId}/delivery-note`,
        `Rôle requis: CLIENT (actuel: ${session.role})`,
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.info(
      "[PDF]",
      JSON.stringify({
        requestId,
        route,
        id: orderId,
        userId: session?.id,
        role: session?.role,
      })
    )

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        deliveryNoteNumber: true,
        status: true,
      },
    })

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (order.userId !== session.id) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/orders/${orderId}/delivery-note`,
        "Commande appartient à un autre utilisateur",
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!order.deliveryNoteNumber) {
      return new Response(
        JSON.stringify({ error: "Delivery note not available for this order" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    const appUrl =
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    if (
      process.env.VERCEL === "1" &&
      (!process.env.APP_URL || process.env.APP_URL.includes("localhost"))
    ) {
      if (requestId) {
        console.warn(
          "[PDF]",
          JSON.stringify({
            requestId,
            step: "CONFIG",
            message: "APP_URL missing or localhost on Vercel",
            appUrlUsed: appUrl,
          })
        )
      }
      return new Response(
        JSON.stringify({
          error: "Erreur lors de la génération du PDF",
          requestId,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    if (allCookies.length === 0) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const printUrl = `${appUrl}/pdf-export/portal/orders/${orderId}/delivery-note`
    const safeTargetUrl = printUrl
    const filename = `${order.deliveryNoteNumber}.pdf`
    const pdfCookies = allCookies.map((c) => ({ name: c.name, value: c.value }))

    if (shouldUseExternalPdf()) {
      const t0 = Date.now()
      const urlWithCacheBust = `${printUrl}${printUrl.includes("?") ? "&" : "?"}_=${Date.now()}`
      const pdfBuffer = await generatePdfFromUrl({
        url: urlWithCacheBust,
        cookies: pdfCookies,
        filename,
        requestId,
      })
      console.info(
        "[PDF]",
        JSON.stringify({
          requestId,
          route,
          id: orderId,
          userId: session?.id,
          role: session?.role,
          pdfshiftStatus: 200,
          pdfshiftDurationMs: Date.now() - t0,
          targetUrl: safeTargetUrl,
        })
      )
      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    const urlObj = new URL(appUrl)
    const domain = urlObj.hostname
    const path = "/"

    const browser = await launchPdfBrowser()
    try {
      const page = await browser.newPage()
      const puppeteerCookies = allCookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: domain === "localhost" ? "localhost" : domain.startsWith(".") ? domain : `.${domain}`,
        path,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax" as const,
      }))
      await page.setCookie(...puppeteerCookies)

      const response = await page.goto(printUrl, {
        waitUntil: "networkidle0",
        timeout: 30000,
      })

      if (response && response.status() === 404) {
        return new Response(
          JSON.stringify({ error: "Bon de livraison introuvable ou accès refusé" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      if (page.url().includes("/login")) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }

      await page.emulateMediaType("print")
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
      })

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    if (raw === "PDFSHIFT_AUTH") {
      return new Response(
        JSON.stringify({
          error: "PDF indisponible (configuration). Contactez l'administrateur.",
          requestId,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
    console.error(
      "[PDF_ERROR]",
      JSON.stringify({
        requestId,
        route,
        step: "ROUTE",
        error: raw,
      })
    )
    return new Response(
      JSON.stringify({
        error: "Erreur lors de la génération du PDF",
        requestId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
