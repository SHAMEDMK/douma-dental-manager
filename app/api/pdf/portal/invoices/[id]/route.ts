import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { launchPdfBrowser } from "@/app/lib/pdf-browser"
import { useExternalPdf, generatePdfFromUrl } from "@/app/lib/pdf-external"
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
  const rateLimitResponse = await withRateLimit(req, RATE_LIMIT_PRESETS.PDF)
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = "pdf/portal/invoices/[id]"

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
        `/api/pdf/portal/invoices/${invoiceId}`,
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
        `/api/pdf/portal/invoices/${invoiceId}`,
        `Rôle requis: CLIENT (actuel: ${session.role})`,
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        id: true,
        createdAt: true,
        order: { select: { userId: true } },
      },
    })

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (invoice.order.userId !== session.id) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/invoices/${invoiceId}`,
        `Facture appartient à un autre utilisateur`,
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
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
      return new Response(
        JSON.stringify({
          error: "Erreur lors de la génération du PDF",
          message: "Définir APP_URL (URL publique) dans Vercel.",
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

    const printUrl = `${appUrl}/portal/invoices/${invoiceId}/print?pdf=1`
    const pdfCookies = allCookies.map((c) => ({ name: c.name, value: c.value }))

    if (useExternalPdf()) {
      const pdfBuffer = await generatePdfFromUrl({
        url: printUrl,
        cookies: pdfCookies,
        filename,
      })
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
    const stack = error instanceof Error ? error.stack : undefined
    console.error(JSON.stringify({
      requestId,
      route,
      error: raw,
      stack: process.env.NODE_ENV === "development" ? stack : undefined,
    }))
    const isVercel = process.env.VERCEL === "1"
    const message =
      isVercel &&
      (raw.includes("executable") || raw.includes("ENOENT") || raw.includes("path"))
        ? "Chromium indisponible. Vérifier APP_URL et les logs Vercel."
        : raw || "Erreur inattendue lors de la génération du PDF."
    return new Response(
      JSON.stringify({
        error: "Erreur lors de la génération du PDF",
        message,
        requestId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
