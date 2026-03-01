import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { launchPdfBrowser } from "@/app/lib/pdf-browser"
import { shouldUseExternalPdf, generatePdfFromUrl } from "@/app/lib/pdf-external"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit-middleware"
import { logUnauthorizedAccess } from "@/lib/audit-security"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const testId = req.headers.get("X-Rate-Limit-Test-Id")
  const rateLimitResponse = await withRateLimit(
    req,
    RATE_LIMIT_PRESETS.PDF,
    testId ? { identifierOverride: testId } : undefined
  )
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = "pdf/admin/invoices/[id]"

  try {
    const { id: invoiceId } = await params

    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid invoice ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const session = await getSession()
    if (!session) {
      await logUnauthorizedAccess(
        `/api/pdf/admin/invoices/${invoiceId}`,
        "Non authentifié",
        req.headers,
        null
      )
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (session.role !== "ADMIN" && session.role !== "COMPTABLE" && session.role !== "MAGASINIER") {
      await logUnauthorizedAccess(
        `/api/pdf/admin/invoices/${invoiceId}`,
        `Rôle requis: ADMIN, COMPTABLE ou MAGASINIER (actuel: ${session.role})`,
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
        id: invoiceId,
        userId: session?.id,
        role: session?.role,
      })
    )

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { invoiceNumber: true, id: true, createdAt: true },
    })

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const safeId = invoice.id.replace(/[^a-zA-Z0-9_-]/g, "")
    const rawNumber = invoice.invoiceNumber?.trim() ?? ""
    const invoiceNumber = rawNumber.length > 0 ? rawNumber : `FAC-${safeId}`
    const filename = `${invoiceNumber}.pdf`

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

    const printUrl =
      session.role === "COMPTABLE"
        ? `${appUrl}/pdf-export/comptable/invoices/${invoiceId}`
        : `${appUrl}/pdf-export/admin/invoices/${invoiceId}`

    const safeTargetUrl = printUrl

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
          id: invoiceId,
          userId: session?.id,
          role: session?.role,
          pdfshiftStatus: 200,
          pdfshiftDurationMs: Date.now() - t0,
          targetUrl: safeTargetUrl,
        })
      )
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
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
          JSON.stringify({ error: "Facture introuvable ou accès refusé" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      const finalUrl = page.url()
      if (finalUrl.includes("/login")) {
        return new Response(JSON.stringify({ error: "Accès refusé" }), {
          status: 403,
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
        status: 200,
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
