# Audit ligne par ligne — `app/lib/invoice-lock.ts`

## A) Tableau : Ligne / Code / Problème / Gravité / Correction

| Ligne | Code | Problème | Gravité | Correction |
|------|------|----------|---------|------------|
| 54 | `canModifyInvoiceAmount(invoice: { createdAt: Date \| null } \| null \| undefined)` | Le type déclaré ne contient que `createdAt` alors que `isInvoiceLocked` utilise `lockedAt`, `status`, `payments`/`totalPaid`. Les callers passent l’invoice complète ; le type est trompeur et ne reflète pas le contrat. | Faible | Aligner le type sur l’objet attendu par `isInvoiceLocked` (au minimum `lockedAt`, `status`, `payments` ou `totalPaid`) ou documenter que l’appelant doit fournir une invoice complète. |
| 70-72 | `canModifyOrder(order: { status, invoice?: { createdAt, status } })` | Le type de `order.invoice` ne mentionne pas `lockedAt` ni `payments`/`totalPaid`, alors que `isInvoiceLocked(order.invoice)` les utilise. Même risque de sous-typage. | Faible | Étendre le type de `order.invoice` pour inclure les champs requis par `isInvoiceLocked` ou documenter. |
| — | (hors fichier) | **admin-payments** : ordre des checks = invoice-lock puis accounting. Recommandation métier = accounting puis invoice-lock. | Moyenne | Dans deletePaymentAction / updatePaymentAction / deleteInvoiceAction : appeler d’abord `assertAccountingOpen`, puis vérifier `isInvoiceLocked`. |
| — | (hors fichier) | **order.ts** : refus invoice-lock via `throw new Error(ORDER_NOT_MODIFIABLE_ERROR)` / `INVOICE_LOCKED_ERROR` dans la transaction. Le catch externe renvoie bien `{ error: error.message }`, donc pas de 500, mais le standard explicite serait `return { error }` avant la transaction. | Faible | Optionnel : pour uniformité avec le standard “return { error }”, faire le check `canModifyOrder` / `canModifyInvoiceAmount` avant la transaction et retourner `{ error: CONSTANTE }` au lieu de throw. |
| — | (hors fichier) | **cancelOrder** (admin + portal) : annulation autorisée si `invoice?.status !== 'PAID'`. Une facture PARTIAL (lockée) peut donc être annulée. Règle métier à clarifier. | Moyenne | Décision : soit bloquer annulation si `isInvoiceLocked(order.invoice)` (aligné “lock strict”), soit documenter que l’annulation avec facture PARTIAL est voulue. |

Aucun problème **critique** dans `invoice-lock.ts` lui-même : logique de lock stricte (lockedAt / PARTIAL|PAID / paidAmount > 0), post-livraison (DELIVERED bloqué), et messages constants sont cohérents.

---

## B) Patch proposé

### B1) `app/lib/invoice-lock.ts` — Types et doc (sans changer les règles métier)

```diff
--- a/app/lib/invoice-lock.ts
+++ b/app/lib/invoice-lock.ts
@@ -48,6 +48,7 @@ export const NUMBER_ALREADY_ASSIGNED_ERROR = 'Ce numéro est déjà attribué et ne
 /**
  * Vérifie si une facture peut être modifiée (montants).
  * Invoice.status PARTIAL ou PAID (ou lockedAt / paidAmount > 0) → modification des montants interdite.
+ * @param invoice - Doit exposer au minimum les champs lus par isInvoiceLocked (lockedAt, status, payments ou totalPaid).
  */
-export function canModifyInvoiceAmount(invoice: { createdAt: Date | null } | null | undefined): boolean {
+export function canModifyInvoiceAmount(invoice: Parameters<typeof isInvoiceLocked>[0]): boolean {
   return !isInvoiceLocked(invoice)
 }
@@ -64,6 +65,7 @@ export function canModifyInvoiceAmount(invoice: Parameters<typeof isInvoiceLocked
  * - Facture émise / verrouillée (isInvoiceLocked) → INTERDIT
  *
  * @param order Order avec invoice
+ * @param order.invoice - Doit exposer les champs requis par isInvoiceLocked (lockedAt, status, payments ou totalPaid).
  * @returns true si la commande peut être modifiée
  */
 export function canModifyOrder(order: {
```

(Alternative : garder les types actuels et ajouter uniquement les commentaires @param pour documenter les champs requis.)

### B2) Ordre des checks (accounting puis invoice-lock) — `app/actions/admin-payments.ts`

Pour **deletePaymentAction** et **updatePaymentAction**, inverser l’ordre : d’abord clôture comptable, puis invoice-lock.

- **deletePaymentAction** : déplacer le bloc `assertAccountingOpen` + catch (lignes 50–78) **avant** le `if (isInvoiceLocked(payment.invoice))` (l.46–48). Idem pour **updatePaymentAction** (assertAccountingOpen avant isInvoiceLocked).
- **deleteInvoiceAction** : l’ordre actuel est déjà accounting (try/catch) puis `if (isInvoiceLocked(invoice))`. À conserver.

Aucun changement de règle métier : seul l’ordre des vérifications change pour respecter “assertAccountingOpen() puis invoice-lock”.

---

## C) Règles métier confirmées

1. **Lock facture** : une facture est verrouillée si **au moins une** des conditions : `lockedAt != null`, `status` IN (PARTIAL, PAID), ou `paidAmount > 0`. Les trois critères sont **complémentaires** (fail-safe).
2. **Post-livraison** : si `Order.status === DELIVERED` ou `CANCELLED`, la commande n’est plus modifiable (lignes, quantités, prix), **même sans facture ni paiement**. Règle appliquée dans `canModifyOrder` (invoice-lock.ts).
3. **Suppression / modification paiement** : `deletePaymentAction` et `updatePaymentAction` refusent si `isInvoiceLocked(payment.invoice)` et retournent `{ error: string }`.
4. **Suppression facture** : `deleteInvoiceAction` refusent si `isInvoiceLocked(invoice)` et retournent `{ error }` + audit INVOICE_MODIFICATION_REFUSED.
5. **Modification commande (order.ts)** : toutes les actions concernées vérifient `canModifyOrder(order)` et `canModifyInvoiceAmount(order.invoice)` ; en cas de refus, l’erreur remonte au catch externe qui retourne `{ error: error.message }` (pas de 500).
6. **Messages** : utilisation des constantes `INVOICE_LOCKED_ERROR`, `ORDER_NOT_MODIFIABLE_ERROR` ; pas de message ad hoc pour le lock dans invoice-lock.ts.

---

## D) Règles manquantes ou ambiguës + décision proposée

| Règle / point | Décision proposée |
|---------------|-------------------|
| **Annulation commande avec facture PARTIAL** : actuellement autorisée (seul PAID bloque). | **Option A (recommandée)** : Bloquer l’annulation si `isInvoiceLocked(order.invoice)` (alignement “lock strict dès 1er paiement”). **Option B** : Conserver le comportement actuel et documenter que l’annulation avec facture PARTIAL est volontaire (traitement ultérieur type avoir). |
| **Facture CANCELLED** : `isInvoiceLocked` ne teste pas `status === 'CANCELLED'`. Une facture CANCELLED avec `lockedAt` ou `paidAmount > 0` reste “locked”. | Conserver : une facture annulée mais ayant eu des paiements reste non modifiable (cohérent ERP). Si besoin, on peut ajouter un court commentaire dans invoice-lock.ts. |
| **Ordre des checks (accounting vs invoice-lock)** : aujourd’hui dans admin-payments, invoice-lock avant accounting. | Uniformiser : **toujours assertAccountingOpen (ou équivalent) puis isInvoiceLocked / canModifyOrder**, et documenter dans un commentaire en tête de chaque action concernée. |

---

## E) Liste des callers (actions + routes / pages)

### Actions

| Fichier | Export / usage |
|---------|-----------------|
| **app/actions/order.ts** | `canModifyOrder`, `canModifyInvoiceAmount`, `ORDER_NOT_MODIFIABLE_ERROR`, `INVOICE_LOCKED_ERROR` — createOrder, updateOrderItem, updateOrderItems, addItemsToOrder, addOrderItem, addOrderLines, cancelOrder (vérifient modification commande / facture). |
| **app/actions/admin-orders.ts** | `isDeliveryNoteNumberAlreadyAssigned`, `NUMBER_ALREADY_ASSIGNED_ERROR` ; usage de `lockedAt` / audit INVOICE_LOCKED_ON_PAYMENT dans markInvoicePaid. |
| **app/actions/admin-payments.ts** | `isInvoiceLocked` — deletePaymentAction, updatePaymentAction, deleteInvoiceAction. |

### Routes

- Aucune route API directe qui importe invoice-lock (les contrôles passent par les Server Actions ci‑dessus).

### Pages / composants (lecture seule pour affichage)

| Fichier | Usage |
|---------|--------|
| app/admin/invoices/[id]/page.tsx | `isInvoiceLocked(invoice)` pour affichage. |
| app/admin/orders/[id]/page.tsx | `isInvoiceLocked(order.invoice)` → prop `invoiceLocked`. |
| app/portal/orders/OrderCard.tsx | prop `isInvoiceLocked`. |
| app/portal/orders/OrdersList.tsx | `isInvoiceLocked(order.invoice)` pour prop. |
| app/admin/orders/OrderActionButtons.tsx | prop `isInvoiceLocked` → si true, retourne null. |
| app/admin/orders/OrderStatusSelect.tsx | prop `isInvoiceLocked` → désactive le select. |
| app/admin/invoices/[id]/print/page.tsx | `isInvoiceLocked(invoice)`. |
| app/portal/invoices/[id]/print/page.tsx | `isInvoiceLocked(invoice)`. |
| app/comptable/invoices/[id]/print/page.tsx | `isInvoiceLocked(invoice)`. |
| app/magasinier/orders/page.tsx, [id]/page.tsx | `isInvoiceLocked={false}` en dur — à vérifier si le magasinier doit voir le verrouillage (sinon risque d’afficher des actions interdites). |

---

## F) Tests à ajouter

### F1) Unit (app/lib/__tests__/invoice-lock.test.ts)

- **isInvoiceLocked**  
  - `null` / `undefined` → false.  
  - `lockedAt` non null → true.  
  - `status === 'PARTIAL'` ou `'PAID'` → true.  
  - `totalPaid > 0` (sans lockedAt, sans PARTIAL/PAID) → true.  
  - `payments: [{ amount: 10 }]` (totalPaid absent) → true.  
  - `status === 'CANCELLED'`, pas de lockedAt, paidAmount 0 → false.  
  - `status === 'UNPAID'`, lockedAt null, paidAmount 0 → false.  
- **canModifyOrder**  
  - order.status DELIVERED / CANCELLED → false (avec ou sans invoice).  
  - order.status CONFIRMED, invoice null → true.  
  - order.status CONFIRMED, invoice PARTIAL → false.  
  - order.status CONFIRMED, invoice UNPAID, lockedAt null, paidAmount 0 → true.  
- **canModifyInvoiceAmount** : délégué à isInvoiceLocked → au moins un cas true et un false.  
- **isInvoiceNumberAlreadyAssigned** / **isDeliveryNoteNumberAlreadyAssigned** : null, '', chaîne non vide.  
- Pas de dépendance à `Date.now` : utiliser des dates fixes ou des objets sans date pour les cas non concernés.

### F2) E2E (tests/e2e/invoice-lock.spec.ts)

- Scénario déterministe avec **données seed** : une commande livrée + facture avec 1 paiement (lock).  
- Test 1 : admin ouvre la commande → pas de bouton “Modifier” (ou désactivé) ; message / badge “Facture verrouillée” ou équivalent.  
- Test 2 : admin ouvre une facture verrouillée → pas de suppression de paiement possible (bouton absent ou désactivé) ; tentative suppression facture → message d’erreur attendu (toast / bloc).  
- Test 3 : refus explicite avec **message constant** (ex. INVOICE_LOCKED_ERROR ou texte “Facture verrouillée”) pour éviter régression.  
- Pas de `Date.now` dans les seeds : timestamps fixes (ex. ISO UTC).

---

## Points vérifiés (résumé)

1. **Définition du lock** : les 3 critères (lockedAt, status PARTIAL/PAID, totalPaid > 0) sont **complémentaires** ; au moins un suffit. Aucune redondance stricte (ex. lockedAt peut être posé indépendamment du statut dans un flux métier).  
2. **Post-livraison** : oui, `Order.status === DELIVERED` est bloquant dans `canModifyOrder` même sans facture ni paiement. Règle dans invoice-lock.ts.  
3. **Suppression / modification paiement** : deletePaymentAction et updatePaymentAction refusent bien si `isInvoiceLocked` ; deleteInvoiceAction idem. cancelOrderAction : bloque seulement si `invoice?.status === 'PAID'` (voir D).  
4. **Clôture comptable** : ordre recommandé = assertAccountingOpen puis invoice-lock ; à appliquer dans admin-payments (patch B2). Messages stables (constantes) + audit déjà en place.  
5. **Edge cases** :  
   - Paiement + rollback : lockedAt est mis dans la même transaction que le paiement (markInvoicePaid) → cohérent.  
   - Concurrence : deux paiements simultanés peuvent tous deux passer isInvoiceLocked avant mise à jour ; le premier qui commit pose lockedAt ; le second peut encore enregistrer un paiement (comportement acceptable pour “dès 1er paiement” si lockedAt est mis à jour dans la même transaction que l’insert du paiement).  
   - Invoice CANCELLED : considérée locked seulement si lockedAt ou paidAmount > 0 (voir D).  
6. **UX / Server Actions** : les refus passent par `return { error: string }` dans admin-payments ; dans order.ts par throw puis catch externe qui retourne `{ error: error.message }`. Pas de 500 ; standard respecté.

---

## Plan de durcissement en 3 PRs

### PR1 — Règles + helpers (invoice-lock.ts + doc)

- Appliquer le patch B1 (types / doc `canModifyInvoiceAmount` et `canModifyOrder`).  
- Documenter en en-tête de invoice-lock.ts : définition du lock (3 critères), post-livraison, et ordre recommandé des checks (accounting puis invoice-lock).  
- Décision et implémentation éventuelle : annulation commande avec facture PARTIAL (bloquer si isInvoiceLocked ou documenter le choix actuel).  
- Pas de changement de comportement des actions dans cette PR.

### PR2 — Enforcement dans actions / routes

- **admin-payments** : ordre des checks = assertAccountingOpen puis isInvoiceLocked pour deletePaymentAction, updatePaymentAction (patch B2).  
- **order.ts** (optionnel) : si souhait d’uniformiser à 100 % avec “return { error }” sans throw, faire les checks canModifyOrder / canModifyInvoiceAmount en amont de la transaction et retourner `{ error: ORDER_NOT_MODIFIABLE_ERROR }` ou `INVOICE_LOCKED_ERROR` au lieu de throw dans la transaction.  
- Vérifier qu’aucune route API n’effectue de modification facture/commande/paiement sans passer par ces actions (déjà le cas aujourd’hui).

### PR3 — Tests (unit + E2E)

- Créer **app/lib/__tests__/invoice-lock.test.ts** avec les cas listés en F1 (dates/objets déterministes, pas de Date.now).  
- Adapter / renforcer **tests/e2e/invoice-lock.spec.ts** : seed déterministe (commande livrée + facture avec 1 paiement), assertions sur absence de modification, message d’erreur constant, et pas de dépendance au temps.  
- Exécuter les tests et s’assurer qu’ils passent (y compris après correctifs E2E existants si besoin).
