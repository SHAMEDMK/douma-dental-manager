/**
 * Génération PDF : sur Vercel on utilise puppeteer-core + @sparticuz/chromium-min
 * (stack recommandée par Vercel). En local on utilise puppeteer (binaire inclus).
 */

const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"

export async function getChromiumLaunchOptions(): Promise<{
  executablePath?: string
  args?: string[]
}> {
  if (process.env.VERCEL !== "1") {
    return {}
  }
  try {
    const chromiumMin = await import("@sparticuz/chromium-min")
    const executablePath = await chromiumMin.default.executablePath(CHROMIUM_PACK_URL)
    const args = chromiumMin.default.args ?? []
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

/** Lance Puppeteer : puppeteer-core + chromium-min sur Vercel, puppeteer en local. */
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
