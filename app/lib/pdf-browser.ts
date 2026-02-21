/** URL du binaire Chromium pour Vercel (chromium-min télécharge à la demande, pas dans le bundle). */
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"

/**
 * Options de lancement Chromium pour la génération PDF.
 * Sur Vercel : playwright-core + @sparticuz/chromium-min (binaire téléchargé via URL, pas dans le bundle).
 * En local : Chromium fourni par le package playwright (devDependency).
 */
export async function getChromiumLaunchOptions(): Promise<{
  executablePath?: string
  args?: string[]
}> {
  if (process.env.VERCEL !== '1') {
    return {}
  }
  try {
    const chromiumMin = await import('@sparticuz/chromium-min')
    const executablePath = await chromiumMin.default.executablePath(CHROMIUM_PACK_URL)
    const args = chromiumMin.default.args ?? []
    const serverlessArgs = [
      ...args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--no-first-run',
    ]
    return { executablePath, args: serverlessArgs }
  } catch (e) {
    console.error('getChromiumLaunchOptions failed:', e)
    throw new Error(
      `Chromium serverless indisponible: ${e instanceof Error ? e.message : String(e)}`
    )
  }
}

/** Chromium (BrowserType) + options pour PDF. Sur Vercel : playwright-core + @sparticuz/chromium-min. En local : playwright. */
export async function getPdfBrowser(): Promise<{
  chromium: { launch: (options?: Record<string, unknown>) => Promise<{ newContext: () => Promise<unknown>; close: () => Promise<void> }> }
  launchOptions: { executablePath?: string; args?: string[] }
}> {
  const launchOptions = await getChromiumLaunchOptions()
  if (process.env.VERCEL === '1') {
    const playwrightCore = await import('playwright-core')
    return { chromium: playwrightCore.chromium, launchOptions }
  }
  const playwright = await import('playwright')
  return { chromium: playwright.chromium, launchOptions }
}
