/**
 * Configuration centralisée de l'application.
 * Source unique pour devise, locale, segments clients.
 * Facilite l'extensibilité vers un ERP multi-devise, multi-locale.
 */

/** Devise par défaut (Dh = Dirham marocain) */
export const DEFAULT_CURRENCY = process.env.APP_CURRENCY ?? 'Dh'

/** Symbole affiché pour la devise */
export const CURRENCY_SYMBOL = process.env.APP_CURRENCY_SYMBOL ?? 'Dh'

/** Locale pour formatage des dates et nombres */
export const DEFAULT_LOCALE = process.env.APP_LOCALE ?? 'fr-FR'

/** Segments clients (extensible via env ou future table DB) */
export const SEGMENTS = ['LABO', 'DENTISTE', 'REVENDEUR'] as const
export type Segment = (typeof SEGMENTS)[number]

/** Libellés des segments (i18n future) */
export const SEGMENT_LABELS: Record<Segment, string> = {
  LABO: 'Labo',
  DENTISTE: 'Dentiste',
  REVENDEUR: 'Revendeur',
}

/** Formatage monétaire unifié */
export function formatCurrency(value: number): string {
  const v = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

/** Formatage monétaire avec symbole (ex: "123,45 Dh") */
export function formatCurrencyWithSymbol(value: number): string {
  return `${formatCurrency(value)} ${CURRENCY_SYMBOL}`
}

/** Formatage de date (courte, ex: 15/03/2026) */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE)
}

/** Formatage de date longue (ex: 15 mars 2026) */
export function formatDateLong(date: Date | string): string {
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Formatage heure (ex: 14:30) */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Formatage date + heure */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString(DEFAULT_LOCALE)
}

/** Formatage nombre (2 décimales) */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
