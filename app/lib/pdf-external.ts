/**
 * Génération PDF via un service externe (PDFShift).
 * Utilisé sur Vercel quand PDFSHIFT_API_KEY est défini : pas de Chromium, pas de timeout.
 * Doc : https://docs.pdfshift.io
 */

export type PdfExternalCookie = { name: string; value: string }

export type GeneratePdfFromUrlOptions = {
  url: string
  cookies: PdfExternalCookie[]
  filename: string
}

const PDFSHIFT_API = "https://api.pdfshift.io/v3/convert/pdf"

/**
 * Génère un PDF en envoyant l'URL + cookies à PDFShift.
 * Retourne le buffer PDF ou lance une erreur.
 */
export async function generatePdfFromUrl(
  options: GeneratePdfFromUrlOptions
): Promise<Buffer> {
  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) {
    throw new Error("PDFSHIFT_API_KEY non configurée")
  }

  const body = {
    source: options.url,
    cookies: options.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      http_only: true,
      secure: process.env.NODE_ENV === "production",
    })),
    format: "A4",
    print_background: true,
    margin: {
      top: "10mm",
      bottom: "10mm",
      left: "10mm",
      right: "10mm",
    },
  }

  const auth = Buffer.from(`${apiKey}:`, "utf8").toString("base64")
  const res = await fetch(PDFSHIFT_API, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    let errMsg = `PDFShift error ${res.status}: ${text}`
    try {
      const json = JSON.parse(text)
      if (json.error || json.message) errMsg = json.error || json.message
    } catch {
      // keep errMsg as is
    }
    throw new Error(errMsg)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** Retourne true si on doit utiliser le service externe (PDFShift) pour le PDF. */
export function useExternalPdf(): boolean {
  return Boolean(process.env.PDFSHIFT_API_KEY)
}
