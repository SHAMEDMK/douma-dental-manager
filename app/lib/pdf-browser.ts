/**
 * Options de lancement Chromium pour la génération PDF.
 * Sur Vercel (serverless), on utilise playwright-core + @sparticuz/chromium
 * pour rester sous la limite de taille des fonctions. En local, on utilise
 * le Chromium fourni par le package playwright (devDependency).
 */
export async function getChromiumLaunchOptions(): Promise<{
  executablePath?: string
  args?: string[]
}> {
  if (process.env.VERCEL !== '1') {
    return {}
  }
  try {
    const chromiumPkg = await import('@sparticuz/chromium')
    const executablePath = await chromiumPkg.default.executablePath()
    const args = chromiumPkg.default.args ?? []
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

/** Chromium (BrowserType) + options pour PDF. Sur Vercel : playwright-core + @sparticuz/chromium. En local : playwright. */
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
