/**
 * Génération PDF via un service externe (PDFShift).
 * Utilisé sur Vercel quand PDFSHIFT_API_KEY est défini : pas de Chromium, pas de timeout.
 * Doc : https://docs.pdfshift.io
 */

import { createHash } from "crypto"

export type PdfExternalCookie = { name: string; value: string }

export type GeneratePdfFromUrlOptions = {
  url: string
  cookies: PdfExternalCookie[]
  filename: string
  /** Optionnel : pour les logs structurés (requestId) */
  requestId?: string
}

const PDFSHIFT_API = "https://api.pdfshift.io/v3/convert/pdf"

/**
 * Génère un PDF en envoyant l'URL + cookies à PDFShift.
 * Retourne le buffer PDF ou lance une erreur.
 */
export async function generatePdfFromUrl(
  options: GeneratePdfFromUrlOptions
): Promise<Buffer> {
  const requestId = options.requestId ?? ""
  const keyA = process.env.PDFSHIFT_API_KEY ?? ""
  const keyB = process.env.PDFSHIFT_KEY ?? ""
  const vercelEnv = process.env.VERCEL_ENV ?? "unknown"

  // Clé utilisée (PDFSHIFT_API_KEY prioritaire)
  const key = (keyA || keyB).replace(/\s+/g, "").trim()
  if (!key) {
    if (requestId) {
      console.error(
        JSON.stringify({
          requestId,
          step: "CONFIG",
          message: "PDFSHIFT_API_KEY and PDFSHIFT_KEY both missing",
        })
      )
    }
    throw new Error("PDFSHIFT_API_KEY non configurée dans Vercel (Settings → Environment Variables).")
  }

  const keyLen = key.length
  const keyHash8 = createHash("sha256").update(key, "utf8").digest("hex").slice(0, 8)

  console.info(
    "[PDF_CONFIG]",
    JSON.stringify({
      requestId,
      vercelEnv,
      keyLen,
      keyHash8,
    })
  )

  if (keyLen < 20) {
    if (requestId) {
      console.error(JSON.stringify({
        requestId,
        step: "CONFIG",
        message: "PDFSHIFT_API_KEY too short",
      }))
    }
    throw new Error("PDFSHIFT_API_KEY trop courte. Copiez la clé complète depuis le dashboard PDFShift (pdfshift.io).")
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
    margin: {
      top: "10mm",
      bottom: "10mm",
      left: "10mm",
      right: "10mm",
    },
  }

  const t0 = Date.now()
  const res = await fetch(PDFSHIFT_API, {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const durationMs = Date.now() - t0

  if (!res.ok) {
    const text = await res.text()
    const bodyPreview = text.slice(0, 500)
    const isAuthError =
      res.status === 401 ||
      res.status === 403 ||
      /API Key was not found/i.test(text)

    if (requestId && isAuthError) {
      console.error(
        "[PDF_ERROR]",
        JSON.stringify({
          requestId,
          step: "PDFSHIFT_AUTH",
          vercelEnv,
          keyHash8,
          status: res.status,
          bodyPreview,
          message: "PDFSHIFT_API_KEY invalid in Vercel Production env vars",
        })
      )
      throw new Error("PDFSHIFT_AUTH")
    }

    if (requestId) {
      let logPayload: Record<string, unknown> = {
        requestId,
        step: "PDFSHIFT_CALL",
        status: res.status,
        durationMs,
        bodyPreview,
      }
      try {
        const json = JSON.parse(text) as { code?: string; message?: string; error?: string }
        if (json.code != null || json.message != null || json.error != null) {
          logPayload = { ...logPayload, code: json.code, message: json.message ?? json.error }
        }
      } catch {
        // keep logPayload as is
      }
      console.error("[PDF_ERROR]", JSON.stringify(logPayload))
    }
    let errMsg = `PDFShift error ${res.status}: ${text}`
    try {
      const json = JSON.parse(text) as { error?: string; message?: string }
      if (json.error || json.message) errMsg = json.error ?? json.message ?? errMsg
    } catch {
      // keep errMsg as is
    }
    if (res.status === 401 || res.status === 403) {
      if (/not found|invalid|unauthorized/i.test(errMsg)) {
        const hint =
          "Clé non reconnue par PDFShift. Vérifiez : 1) Dashboard https://app.pdfshift.io → créez une NOUVELLE clé et copiez-la ; 2) Vercel → Settings → Environment Variables → PDFSHIFT_API_KEY = cette clé (Production), sans espace ; 3) Redeploy. Si ça persiste : support@pdfshift.io avec le Code ci‑dessous."
        errMsg = `${errMsg} — ${hint}`
      }
    }
    throw new Error(errMsg)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** Retourne true si on doit utiliser le service externe (PDFShift) pour le PDF. */
export function isExternalPdfEnabled(): boolean {
  const a = process.env.PDFSHIFT_API_KEY ?? ""
  const b = process.env.PDFSHIFT_KEY ?? ""
  return a.length > 0 || b.length > 0
}

/** @deprecated Use isExternalPdfEnabled() instead */
export const useExternalPdf = isExternalPdfEnabled
export const shouldUseExternalPdf = isExternalPdfEnabled
