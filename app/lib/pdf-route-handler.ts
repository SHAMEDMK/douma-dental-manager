import { cookies } from "next/headers"
import { launchPdfBrowser } from "./pdf-browser"
import { useExternalPdf, generatePdfFromUrl } from "./pdf-external"

interface GeneratePdfOptions {
  printUrl: string
  filename: string
  route: string
  requestId: string
  notFoundMessage?: string
}

function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  )
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function validateVercelAppUrl(requestId: string): Response | null {
  if (
    process.env.VERCEL === "1" &&
    (!process.env.APP_URL || process.env.APP_URL.includes("localhost"))
  ) {
    return jsonResponse(
      {
        error: "Erreur lors de la génération du PDF",
        message: "Définir la variable APP_URL (URL publique) dans Vercel.",
        requestId,
      },
      500
    )
  }
  return null
}

export async function generatePdfResponse(
  options: GeneratePdfOptions
): Promise<Response> {
  const { printUrl, filename, route, requestId, notFoundMessage } = options

  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  if (allCookies.length === 0) {
    return jsonResponse({ error: "Non authentifié" }, 401)
  }

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

  const appUrl = getAppUrl()
  const urlObj = new URL(appUrl)
  const domain = urlObj.hostname

  const browser = await launchPdfBrowser()
  try {
    const page = await browser.newPage()
    const puppeteerCookies = allCookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: domain === "localhost" ? "localhost" : domain.startsWith(".") ? domain : `.${domain}`,
      path: "/",
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
      return jsonResponse(
        { error: notFoundMessage || "Document introuvable ou accès refusé" },
        404
      )
    }

    if (page.url().includes("/login")) {
      return jsonResponse({ error: "Accès refusé" }, 403)
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
}

export function handlePdfError(error: unknown, route: string, requestId: string): Response {
  const raw = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  console.error(
    JSON.stringify({
      requestId,
      route,
      error: raw,
      stack: process.env.NODE_ENV === "development" ? stack : undefined,
    })
  )
  const isVercel = process.env.VERCEL === "1"
  const message =
    isVercel &&
    (raw.includes("executable") || raw.includes("ENOENT") || raw.includes("path"))
      ? "Chromium indisponible. Vérifier APP_URL et les logs Vercel."
      : raw || "Erreur inattendue lors de la génération du PDF."
  return jsonResponse({ error: "Erreur lors de la génération du PDF", message, requestId }, 500)
}

export function getResolvedAppUrl(): string {
  return getAppUrl()
}
