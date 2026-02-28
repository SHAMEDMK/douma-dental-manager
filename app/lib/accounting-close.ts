/**
 * Clôture comptable par date globale.
 * Utilise des erreurs typées pour distinguer :
 * - période clôturée (métier)
 * - date invalide (technique / sécurité)
 *
 * Standard Server Actions : toutes les actions retournent { error: string } (jamais throw
 * pour les erreurs comptables) avec ACCOUNTING_CLOSED_ERROR_MESSAGE ou ACCOUNTING_DATE_ERROR_USER_MESSAGE
 * pour une UX déterministe sur toutes les pages.
 *
 * Règle : toute entité dont entityDate (ex. invoice.createdAt) est ≤ accountingLockedUntil
 * est en période clôturée (modification interdite). Comparaison déterministe via getTime()
 * (millisecondes) ; les dates doivent être cohérentes (recommandation : UTC en DB/app).
 *
 * Si accountingLockedUntil est défini, toute entité (facture, paiement, etc.) dont la date
 * est <= à cette date ne peut plus être modifiée.
 *
 * La clôture comptable est irréversible en production : une fois la date de clôture avancée,
 * elle ne peut pas être reculée (toute nouvelle valeur < valeur actuelle est refusée).
 */

const ACCOUNTING_CLOSED_MESSAGE = 'PÉRIODE COMPTABLE CLÔTURÉE : modification interdite.'

/** Erreur levée lorsque la période comptable est clôturée (règle métier ≤). */
export class AccountingClosedError extends Error {
  constructor(message = ACCOUNTING_CLOSED_MESSAGE) {
    super(message)
    this.name = 'AccountingClosedError'
    Object.setPrototypeOf(this, AccountingClosedError.prototype)
  }
}

/** Erreur levée lorsque une date (entityDate ou accountingLockedUntil) est invalide (technique / fail-closed). */
export class AccountingDateInvalidError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccountingDateInvalidError'
    Object.setPrototypeOf(this, AccountingDateInvalidError.prototype)
  }
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime())
}

export function isAccountingClosedFor(
  entityDate: Date,
  lockedUntil: Date | null | undefined
): boolean {
  if (lockedUntil == null) return false
  if (!isValidDate(entityDate)) {
    throw new AccountingDateInvalidError('entityDate must be a valid Date')
  }
  if (!isValidDate(lockedUntil)) {
    throw new AccountingDateInvalidError('accountingLockedUntil is invalid')
  }
  return entityDate.getTime() <= lockedUntil.getTime()
}

export function assertAccountingOpen(
  entityDate: Date,
  lockedUntil: Date | null | undefined
): void {
  if (isAccountingClosedFor(entityDate, lockedUntil)) {
    throw new AccountingClosedError()
  }
}

export const ACCOUNTING_CLOSED_ERROR_MESSAGE = ACCOUNTING_CLOSED_MESSAGE

/** Message affiché à l'utilisateur en cas d'erreur de date invalide (AccountingDateInvalidError). */
export const ACCOUNTING_DATE_ERROR_USER_MESSAGE =
  "Erreur interne liée à la date comptable. Contactez l'administrateur."

/** Message d'erreur lorsque l'on tente de reculer la date de clôture (interdit). */
export const ACCOUNTING_LOCK_IRREVERSIBLE_MESSAGE =
  'La clôture comptable est irréversible : la date de clôture ne peut pas être reculée.'

/**
 * Vérifie qu'une nouvelle date de clôture n'est pas antérieure à la date actuelle.
 * La clôture comptable est irréversible en production.
 * @param currentLockedUntil - Date actuelle de clôture (null = pas de clôture)
 * @param newLockedUntil - Nouvelle date proposée
 * @throws si newLockedUntil < currentLockedUntil ou si une date est invalide
 */
export function assertAccountingLockIrreversible(
  currentLockedUntil: Date | null | undefined,
  newLockedUntil: Date
): void {
  if (!isValidDate(newLockedUntil)) {
    throw new AccountingDateInvalidError('newLockedUntil must be a valid Date')
  }
  if (currentLockedUntil == null) return
  if (!isValidDate(currentLockedUntil)) {
    throw new AccountingDateInvalidError('accountingLockedUntil is invalid')
  }
  if (newLockedUntil.getTime() < currentLockedUntil.getTime()) {
    throw new Error(ACCOUNTING_LOCK_IRREVERSIBLE_MESSAGE)
  }
}
