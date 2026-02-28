# Audit technique — `app/lib/accounting-close.ts`

Audit ligne par ligne : règle comptable, risques (timezone, off-by-one, null, source de date, E2E, erreurs silencieuses, cohérence).

---

## A) Tableau Ligne / Code / Problème / Gravité / Correction

| Ligne | Code | Problème | Gravité | Correction |
|-------|------|----------|---------|------------|
| 1-8 | Commentaire bloc | Règle "date <= accountingLockedUntil" bien décrite ; pas de mention explicite UTC/source de date. | Faible | Documenter en commentaire que les dates doivent être comparables (recommandation : UTC côté DB et app). |
| 10-12 | `entityDate: Date` | Type strict mais pas de garde runtime : si un caller passe `undefined` ou une string, `entityDate.getTime()` lance. | Faible | Optionnel : en début de fonction, si `entityDate == null` ou `Number.isNaN(entityDate.getTime())`, traiter (throw ou considérer fermé). |
| 14 | `if (!lockedUntil) return false` | `null` et `undefined` correctement traités. Pas de traitement pour `lockedUntil` invalide (Invalid Date). | Moyenne | Si `lockedUntil` est une Date invalide (`Number.isNaN(lockedUntil.getTime())`), comportement actuel : `entityDate.getTime() <= NaN` → false. Pour cohérence, considérer "pas de clôture" (actuel) ou throw. Recommandation : documenter + optionnellement rejeter les dates invalides. |
| 15 | `return entityDate.getTime() <= lockedUntil.getTime()` | Comparaison déterministe (millisecondes UTC). `<=` conforme à la règle "≤ = clôturé". | Aucune | — |
| 15 | (même) | Si `entityDate` est Invalid Date, `getTime()` = NaN, `NaN <= x` = false → entité considérée "ouverte". Risque : autoriser une modification alors que la date est incohérente. | Moyenne | Traiter Invalid Date : soit throw, soit considérer fermé (safe). Recommandation : `if (Number.isNaN(entityDate.getTime())) throw new Error('entityDate must be a valid Date')`. |
| 18 | `ACCOUNTING_CLOSED_MESSAGE` | Message explicite et constant exporté. | Aucune | — |
| 20-26 | `assertAccountingOpen` | Délègue à `isAccountingClosedFor` → aucune incohérence. Même sémantique. | Aucune | — |
| 41-49 | `assertAccountingLockIrreversible` | Utilise `<` (strict) : reculer interdit, garder la même date autorisé. `currentLockedUntil == null` correct. | Aucune | — |
| 46 | `if (newLockedUntil.getTime() < ...)` | Si `newLockedUntil` est Invalid Date, NaN < x = false → pas d’exception (on n’empêche pas une date invalide). | Faible | Optionnel : valider que `newLockedUntil` est une Date valide avant comparaison. |

**Résumé gravité :** 0 critique, 2 moyennes (Invalid Date sur entityDate / lockedUntil), 2 faibles (doc UTC, validation optionnelle).

---

## B) Patch proposé (déterministe + gardes optionnelles)

Objectif : garder la logique métier (≤ = clôturé), ajouter des gardes pour dates invalides et documenter UTC. Aucun changement de règle métier.

```diff
--- a/app/lib/accounting-close.ts
+++ b/app/lib/accounting-close.ts
@@ -1,5 +1,8 @@
 /**
  * Clôture comptable par date globale.
+ * Règle : toute entité dont entityDate (ex. invoice.createdAt) est ≤ accountingLockedUntil
+ * est considérée en période clôturée (modification interdite). Comparaison déterministe
+ * via getTime() (millisecondes UTC) ; les dates doivent être cohérentes (recommandation : UTC en DB/app).
  * Si accountingLockedUntil est défini, toute entité (facture, paiement, etc.) dont la date
  * est <= à cette date ne peut plus être modifiée.
  *
@@ -9,10 +12,18 @@
  * elle ne peut pas être reculée (toute nouvelle valeur < valeur actuelle est refusée).
  */
 
+function isValidDate(d: Date): boolean {
+  return d instanceof Date && !Number.isNaN(d.getTime())
+}
+
 export function isAccountingClosedFor(
   entityDate: Date,
   lockedUntil: Date | null | undefined
 ): boolean {
   if (!lockedUntil) return false
+  if (!isValidDate(entityDate)) {
+    throw new Error('accounting-close: entityDate must be a valid Date')
+  }
+  if (!isValidDate(lockedUntil)) return false // pas de clôture si date de verrou invalide
   return entityDate.getTime() <= lockedUntil.getTime()
 }
```

- **Changement de comportement** : si `entityDate` est une Date invalide, on **lance** au lieu de retourner false (évite d’autoriser une modification par erreur). Si `lockedUntil` est une Date invalide, on considère "pas de clôture" (retour false) pour ne pas bloquer tout.
- **Règle métier** : inchangée (≤ = clôturé, comparaison par getTime()).

---

## C) Règles métier confirmées (5 lignes max)

1. **Clôture** : entité avec `entityDate` **≤** `accountingLockedUntil` → période clôturée, modification interdite.
2. **Comparaison** : déterministe via `getTime()` (millisecondes), pas de timezone dans cette fonction ; la cohérence (ex. UTC) doit être assurée par les callers et la DB.
3. **Pas de clôture** : si `accountingLockedUntil` est null/undefined → toute entité est considérée ouverte.
4. **Irréversibilité** : une nouvelle date de clôture **strictement inférieure** à l’actuelle est refusée ; égal ou supérieur autorisé.
5. **Source de date** : les callers utilisent `invoice.createdAt` (ou `payment.invoice.createdAt`) comme `entityDate` ; ce fichier n’impose pas la source (pas d’ambiguïté dans le module).

---

## D) Tests à ajouter (unit + E2E)

### Unit (fichier dédié ex. `app/lib/__tests__/accounting-close.test.ts`)

- **isAccountingClosedFor**
  - `lockedUntil` null → false.
  - `lockedUntil` undefined → false.
  - `entityDate` même instant que `lockedUntil` (ex. même ms) → true (≤).
  - `entityDate` 1 ms avant `lockedUntil` → true.
  - `entityDate` 1 ms après `lockedUntil` → false.
  - Dates en ISO UTC (ex. `2024-01-15T12:00:00.000Z` vs `2024-01-15T23:59:59.999Z`) pour garantir déterministe.
  - (Après patch) `entityDate` Invalid Date → throw.
  - (Après patch) `lockedUntil` Invalid Date → false.

- **assertAccountingOpen**
  - Période ouverte (entityDate > lockedUntil) → ne lance pas.
  - Période clôturée (entityDate ≤ lockedUntil) → throw avec `ACCOUNTING_CLOSED_ERROR_MESSAGE`.

- **assertAccountingLockIrreversible**
  - `currentLockedUntil` null → ne lance pas.
  - `newLockedUntil` >= current → ne lance pas.
  - `newLockedUntil` < current → throw avec `ACCOUNTING_LOCK_IRREVERSIBLE_MESSAGE`.

### E2E (compléter / ajouter dans `tests/e2e/accounting-close.spec.ts` ou équivalent)

- Vérifier qu’une facture dont `createdAt` est **strictement antérieure** à `accountingLockedUntil` (dates fixes ISO, ex. script E2E) ne peut pas recevoir de paiement (ou modification) et affiche un message de période clôturée.
- Vérifier qu’une facture dont `createdAt` est **strictement postérieure** à `accountingLockedUntil` peut être modifiée / payée (période ouverte).
- Cas limite : `createdAt` égal à `accountingLockedUntil` (même jour/heure en ISO) → doit être traité comme clôturé (réponse ou message cohérent avec "modification interdite").

---

## Dépendances

- **Aucun import** : le fichier n’utilise aucun helper externe (pas de `date-fns`, pas d’autre module `app/lib` ou `lib`).
- **Comparaison** : uniquement `Date.getTime()` (nombre de millisecondes depuis l’epoch), donc déterministe tant que les `Date` passées sont cohérentes (même convention, idéalement UTC).
- **Callers** : fournissent `invoice.createdAt` ou `payment.invoice.createdAt` (Prisma) et `companySettings.accountingLockedUntil` (Prisma). La sémantique timezone dépend de la config PostgreSQL/Prisma (recommandation : UTC en prod, dates E2E en ISO UTC comme dans `set-accounting-close-e2e.ts`).

---

## Synthèse impact prod

- **Comportement actuel** : règle ≤ correcte et déterministe ; risque principal = dates invalides (entityDate → "ouvert" à tort) ou timezone si la DB/app mélangent local et UTC.
- **Recommandations sans changement de logique** : documenter UTC/source des dates ; E2E/seed avec dates ISO UTC (déjà le cas dans le script E2E).
- **Recommandation avec changement mineur** : valider/refuser les dates invalides (patch B) pour éviter des autorisations incorrectes en prod.
