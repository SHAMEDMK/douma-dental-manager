/**
 * Génération PDF : sur Vercel = puppeteer-core + @sparticuz/chromium (full).
 * Le package full inclut le binaire (extraction locale), pas de téléchargement réseau = pas de timeout.
 * En local = puppeteer avec son Chromium.
 */

export async function getChromiumLaunchOptions(): Promise<{
  executablePath?: string
  args?: string[]
}> {
  if (process.env.VERCEL !== "1") {
    return {}
  }
  try {
    const chromium = await import("@sparticuz/chromium")
    const executablePath = await chromium.default.executablePath()
    const args = chromium.default.args ?? []
    return {
      executablePath,
      args: [
        ...args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
        "--no-first-run",
      ],
    }
  } catch (e) {
    console.error("getChromiumLaunchOptions failed:", e)
    throw new Error(
      `Chromium serverless indisponible: ${e instanceof Error ? e.message : String(e)}`
    )
  }
}

/** Lance Puppeteer : puppeteer-core + @sparticuz/chromium sur Vercel, puppeteer en local. */
export async function launchPdfBrowser() {
  const launchOptions = await getChromiumLaunchOptions()
  if (process.env.VERCEL === "1") {
    const puppeteer = await import("puppeteer-core")
    return puppeteer.default.launch({
      headless: true,
      executablePath: launchOptions.executablePath,
      args: launchOptions.args ?? [],
      defaultViewport: { width: 1280, height: 800 },
    })
  }
  const puppeteer = await import("puppeteer")
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
}
