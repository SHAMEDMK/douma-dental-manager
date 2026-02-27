/**
 * Tests unitaires déterministes pour app/lib/accounting-close.ts.
 * Dates en ISO UTC explicites (ex. "2024-01-15T12:00:00.000Z") pour éviter toute dépendance timezone.
 *
 * Exécution : npm run test:run
 * Fichier seul : npx vitest run app/lib/__tests__/accounting-close.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  isAccountingClosedFor,
  assertAccountingOpen,
  assertAccountingLockIrreversible,
  ACCOUNTING_CLOSED_ERROR_MESSAGE,
  ACCOUNTING_LOCK_IRREVERSIBLE_MESSAGE,
  AccountingClosedError,
  AccountingDateInvalidError,
} from '../accounting-close'

describe('accounting-close', () => {
  const lockedUntil = new Date('2024-01-15T12:00:00.000Z')

  describe('isAccountingClosedFor', () => {
    it('returns false when lockedUntil is null', () => {
      expect(isAccountingClosedFor(new Date('2024-01-01T00:00:00.000Z'), null)).toBe(false)
    })

    it('returns false when lockedUntil is undefined', () => {
      expect(isAccountingClosedFor(new Date('2024-01-01T00:00:00.000Z'), undefined)).toBe(false)
    })

    it('returns true when entityDate equals lockedUntil', () => {
      const same = new Date('2024-01-15T12:00:00.000Z')
      expect(isAccountingClosedFor(same, lockedUntil)).toBe(true)
    })

    it('returns true when entityDate is 1ms before lockedUntil', () => {
      const before = new Date(lockedUntil.getTime() - 1)
      expect(isAccountingClosedFor(before, lockedUntil)).toBe(true)
    })

    it('returns false when entityDate is 1ms after lockedUntil', () => {
      const after = new Date(lockedUntil.getTime() + 1)
      expect(isAccountingClosedFor(after, lockedUntil)).toBe(false)
    })

    it('throws AccountingDateInvalidError when entityDate is invalid (Invalid Date)', () => {
      const invalid = new Date('invalid')
      expect(() => isAccountingClosedFor(invalid, lockedUntil)).toThrow(AccountingDateInvalidError)
      expect(() => isAccountingClosedFor(invalid, lockedUntil)).toThrow(
        'entityDate must be a valid Date'
      )
    })

    it('throws AccountingDateInvalidError when lockedUntil is invalid (Invalid Date)', () => {
      const invalidLocked = new Date('invalid')
      expect(() => isAccountingClosedFor(new Date('2024-01-01T00:00:00.000Z'), invalidLocked)).toThrow(AccountingDateInvalidError)
      expect(() => isAccountingClosedFor(new Date('2024-01-01T00:00:00.000Z'), invalidLocked)).toThrow(
        'accountingLockedUntil is invalid'
      )
    })
  })

  describe('assertAccountingOpen', () => {
    it('does not throw when period is open (entityDate > lockedUntil)', () => {
      const after = new Date(lockedUntil.getTime() + 1)
      expect(() => assertAccountingOpen(after, lockedUntil)).not.toThrow()
    })

    it('does not throw when lockedUntil is null', () => {
      expect(() => assertAccountingOpen(new Date(), null)).not.toThrow()
    })

    it('throws AccountingClosedError with ACCOUNTING_CLOSED_ERROR_MESSAGE when entityDate <= lockedUntil', () => {
      const same = new Date('2024-01-15T12:00:00.000Z')
      expect(() => assertAccountingOpen(same, lockedUntil)).toThrow(AccountingClosedError)
      expect(() => assertAccountingOpen(same, lockedUntil)).toThrow(ACCOUNTING_CLOSED_ERROR_MESSAGE)
      const before = new Date(lockedUntil.getTime() - 1)
      expect(() => assertAccountingOpen(before, lockedUntil)).toThrow(AccountingClosedError)
      expect(() => assertAccountingOpen(before, lockedUntil)).toThrow(ACCOUNTING_CLOSED_ERROR_MESSAGE)
    })

    it('throws AccountingDateInvalidError when entityDate is invalid (propagates from isAccountingClosedFor)', () => {
      expect(() => assertAccountingOpen(new Date('invalid'), lockedUntil)).toThrow(AccountingDateInvalidError)
      expect(() => assertAccountingOpen(new Date('invalid'), lockedUntil)).toThrow(
        'entityDate must be a valid Date'
      )
    })

    it('throws AccountingDateInvalidError when lockedUntil is invalid (propagates from isAccountingClosedFor)', () => {
      expect(() =>
        assertAccountingOpen(new Date('2024-01-01T00:00:00.000Z'), new Date('invalid'))
      ).toThrow(AccountingDateInvalidError)
      expect(() =>
        assertAccountingOpen(new Date('2024-01-01T00:00:00.000Z'), new Date('invalid'))
      ).toThrow('accountingLockedUntil is invalid')
    })
  })

  describe('assertAccountingLockIrreversible', () => {
    it('throws AccountingDateInvalidError when newLockedUntil is invalid', () => {
      expect(() =>
        assertAccountingLockIrreversible(lockedUntil, new Date('invalid'))
      ).toThrow(AccountingDateInvalidError)
      expect(() =>
        assertAccountingLockIrreversible(lockedUntil, new Date('invalid'))
      ).toThrow('newLockedUntil must be a valid Date')
    })

    it('throws AccountingDateInvalidError when currentLockedUntil exists but is invalid', () => {
      const invalidCurrent = new Date('invalid')
      expect(() =>
        assertAccountingLockIrreversible(invalidCurrent, new Date('2024-01-20T00:00:00.000Z'))
      ).toThrow(AccountingDateInvalidError)
      expect(() =>
        assertAccountingLockIrreversible(invalidCurrent, new Date('2024-01-20T00:00:00.000Z'))
      ).toThrow('accountingLockedUntil is invalid')
    })

    it('does not throw when currentLockedUntil is null', () => {
      expect(() =>
        assertAccountingLockIrreversible(null, new Date('2024-01-20T00:00:00.000Z'))
      ).not.toThrow()
    })

    it('does not throw when currentLockedUntil is undefined', () => {
      expect(() =>
        assertAccountingLockIrreversible(undefined, new Date('2024-01-20T00:00:00.000Z'))
      ).not.toThrow()
    })

    it('throws when new < current (strict)', () => {
      const newEarlier = new Date(lockedUntil.getTime() - 1)
      expect(() => assertAccountingLockIrreversible(lockedUntil, newEarlier)).toThrow(
        ACCOUNTING_LOCK_IRREVERSIBLE_MESSAGE
      )
    })

    it('does not throw when new == current', () => {
      const same = new Date(lockedUntil.getTime())
      expect(() => assertAccountingLockIrreversible(lockedUntil, same)).not.toThrow()
    })

    it('does not throw when new > current', () => {
      const newLater = new Date(lockedUntil.getTime() + 1)
      expect(() => assertAccountingLockIrreversible(lockedUntil, newLater)).not.toThrow()
    })
  })
})
