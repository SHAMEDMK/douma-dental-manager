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
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Formatage monétaire avec symbole (ex: "123,45 Dh") */
export function formatCurrencyWithSymbol(value: number): string {
  return `${formatCurrency(value)} ${CURRENCY_SYMBOL}`
}

/** Formatage de date (courte) */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE)
}

/** Formatage date + heure */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString(DEFAULT_LOCALE)
}
