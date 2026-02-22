/**
 * Génération PDF en local : Puppeteer avec son Chromium (devDependency).
 * Sur Vercel, aucun Chromium n'est déployé : utiliser PDFShift (PDFSHIFT_API_KEY).
 */

export async function getChromiumLaunchOptions(): Promise<{
  executablePath?: string
  args?: string[]
}> {
  if (process.env.VERCEL === "1") {
    throw new Error(
      "Sur Vercel, la génération PDF utilise PDFShift. Définir la variable PDFSHIFT_API_KEY dans les paramètres du projet."
    )
  }
  return {}
}

/** Lance Puppeteer (local uniquement). Sur Vercel, utiliser PDFShift (PDFSHIFT_API_KEY). */
export async function launchPdfBrowser() {
  if (process.env.VERCEL === "1") {
    throw new Error(
      "Sur Vercel, définir PDFSHIFT_API_KEY pour la génération PDF (pas de Chromium sur le serveur)."
    )
  }
  const puppeteer = await import("puppeteer")
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
}
