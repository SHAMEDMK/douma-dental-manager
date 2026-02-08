/**
 * Logger structuré pour la production.
 * En production : sortie JSON (une ligne par log) pour agrégation (ex. Datadog, CloudWatch).
 * En développement : sortie lisible (console.log/error).
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta && Object.keys(meta).length > 0 && { meta }),
  }
  if (process.env.NODE_ENV === 'production') {
    const out = level === 'error' ? console.error : console.log
    out(JSON.stringify(payload))
  } else {
    if (level === 'error') {
      console.error(`[${level}]`, message, meta ?? '')
    } else {
      console.log(`[${level}]`, message, meta ?? '')
    }
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
}
