# Rapport : 0 throw résiduel pour les erreurs comptables

**Objectif** : S’assurer qu’aucun `AccountingClosedError` / `AccountingDateInvalidError` ne remonte jusqu’à la runtime Next (500) et que le standard `{ error: string }` est respecté partout.

---

## 1) Recherche effectuée

| Pattern | Emplacement | Rôle |
|--------|-------------|------|
| `throw new AccountingClosedError()` | `app/lib/accounting-close.ts` (l.65) | **Source** : levée par `assertAccountingOpen()` quand période clôturée. Attrapée par les Server Actions. |
| `throw new AccountingDateInvalidError(...)` | `app/lib/accounting-close.ts` (l.52, 55, 91, 95) | **Source** : levée par `isAccountingClosedFor` / `assertAccountingLockIrreversible`. Attrapée par les Server Actions. |
| `instanceof AccountingClosedError` | order.ts, admin-orders.ts, admin-payments.ts | **Catch** : retour `{ error: ACCOUNTING_CLOSED_ERROR_MESSAGE }`. |
| `instanceof AccountingDateInvalidError` | order.ts, admin-orders.ts, admin-payments.ts, company-settings.ts | **Catch** : logSecurityEvent + retour `{ error: ACCOUNTING_DATE_ERROR_USER_MESSAGE }`. |

---

## 2) Vérification par fichier

### `app/actions/order.ts`

- **Throw à l’intérieur des transactions** : dans le callback de `prisma.$transaction()`, en cas d’erreur comptable le code fait `throw e` ou `throw new Error(ACCOUNTING_DATE_ERROR_USER_MESSAGE)` pour faire échouer la transaction.
- **Catch externe** : chaque action est dans un bloc `try { ... await prisma.$transaction(...) ... } catch (error: unknown) { ... }` qui :
  - teste `if (error instanceof AccountingClosedError) return { error: ACCOUNTING_CLOSED_ERROR_MESSAGE }`
  - teste `if (error instanceof AccountingDateInvalidError) return { error: ACCOUNTING_DATE_ERROR_USER_MESSAGE }`
  - sinon retourne `{ error: error.message }` ou message par défaut.
- **Conclusion** : aucun throw ne sort de l’action ; tout est converti en `return { error }`.

### `app/actions/admin-orders.ts`

- `updateOrderStatus` (cancelOrder) et `markInvoicePaid` : `assertAccountingOpen` est dans un `try/catch` qui fait `return { error: ACCOUNTING_CLOSED_ERROR_MESSAGE }` ou `return { error: ACCOUNTING_DATE_ERROR_USER_MESSAGE }` (avec logSecurityEvent pour la date invalide). Pas de rethrow des erreurs comptables.

### `app/actions/admin-payments.ts`

- `deletePaymentAction`, `updatePaymentAction`, `deleteInvoiceAction` : même schéma, catch explicite avec `return { error }` et logSecurityEvent pour `AccountingDateInvalidError`. Pas de rethrow.

### `app/actions/company-settings.ts`

- `updateAccountingLockAction` : catch de `AccountingDateInvalidError` avec logSecurityEvent et `return { success: false, error: ACCOUNTING_DATE_ERROR_USER_MESSAGE }`. Pas de rethrow.

---

## 3) Synthèse

| Critère | Statut |
|--------|--------|
| Aucun throw ne remonte jusqu’à Next (500) pour les erreurs comptables | ✅ |
| Tous les catch retournent `{ error: CONSTANTE }` | ✅ |
| logSecurityEvent pour date invalide dans tous les chemins concernés | ✅ |
| UI consomme `result.error` (voir `docs/ACCOUNTING_CLOSE_UI_STANDARD.md`) | ✅ |

**Résultat : 0 throw résiduel.** Aucun correctif à apporter ; le rapport tient lieu de vérification.
