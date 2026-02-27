# Vérification : DELIVERED = aucune modification financière

**Règle ERP standard :** DELIVERED interdit toute **modification structurelle** (lignes, montants, suppression facture/paiement), **mais le paiement est autorisé après livraison** (COD/délai) si la période comptable est ouverte. Ordre des checks : accounting-close puis invoice-lock ; message d’erreur constant.

## 1) Actions qui modifient OrderItem / Invoice amount / Payments / Cancel / Delete

| # | Action | Fichier | Modifie |
|---|--------|---------|---------|
| 1 | updateOrderItemAction | order.ts | OrderItem (qté/prix), Invoice amount |
| 2 | updateOrderItemsAction | order.ts | OrderItem, Invoice amount |
| 3 | addItemsToOrderAction | order.ts | OrderItem, Invoice amount |
| 4 | addOrderItemAction | order.ts | OrderItem, Invoice amount |
| 5 | addOrderLinesAction | order.ts | OrderItem, Invoice amount |
| 6 | cancelOrderAction | order.ts | Annulation commande, invoice status, stock |
| 7 | updateOrderStatus(orderId, 'CANCELLED') | admin-orders.ts | Annulation commande, invoice, stock |
| 8 | markInvoicePaid | admin-orders.ts | Payment create, Invoice amount/status/balance |
| 9 | deletePaymentAction | admin-payments.ts | Payment delete, Invoice recalc |
| 10 | updatePaymentAction | admin-payments.ts | Payment update, Invoice recalc |
| 11 | deleteInvoiceAction | admin-payments.ts | Payments delete, Invoice delete |

Autres actions (hors modification financière directe) : updateOrderStatus (autres statuts), updateDeliveryInfoAction, updateDeliveryInfo, markOrderShippedAction, deliverOrderAction, markOrderDeliveredAction, approveOrderAction — non incluses dans la matrice ci‑dessous.

---

## 2) Matrice : Actions × Règles (DELIVERED, invoiceLock, accountingClose, return { error })

| Action | DELIVERED bloqué ? | Invoice lock bloqué ? | Accounting close bloqué ? | Retourne { error } (pas throw) ? |
|--------|--------------------|------------------------|----------------------------|-----------------------------------|
| updateOrderItemAction | Oui (canModifyOrder) | Oui (canModifyOrder + canModifyInvoiceAmount) | Oui (assertAccountingOpen, catch → return) | Oui (catch externe) |
| updateOrderItemsAction | Oui (canModifyOrder) | Oui (idem) | Oui | Oui |
| addItemsToOrderAction | Oui (canModifyOrder) | Oui (idem) | Oui | Oui |
| addOrderItemAction | Oui (canModifyOrder) | Oui (idem) | Oui | Oui |
| addOrderLinesAction | Oui (canModifyOrder) | Oui (idem) | Oui | Oui |
| cancelOrderAction | Oui (isCancellable = CONFIRMED \|\| PREPARED) | Partiel (invoice.status !== 'PAID' seulement) | Oui | Oui |
| updateOrderStatus(..., 'CANCELLED') | Oui (l.85–86 : DELIVERED/CANCELLED → return error) | Implicite (pas de passage si DELIVERED) | Oui (cancel path) | Oui |
| markInvoicePaid | Non (paiement autorisé après livraison si période ouverte) | N/A (ajout paiement ; 1er paiement → lock) | Oui | Oui |
| deletePaymentAction | Implicite (invoice lock en pratique) | Oui (isInvoiceLocked) | Oui | Oui |
| updatePaymentAction | Implicite (invoice lock en pratique) | Oui (isInvoiceLocked) | Oui | Oui |
| deleteInvoiceAction | Non (order non chargé) | Oui (isInvoiceLocked) | Oui | Oui |

Légende :
- **DELIVERED bloqué** : la règle « aucune modification financière si Order.status === DELIVERED » est appliquée (explicitement ou via canModifyOrder / statut).
- **Invoice lock** : blocage si facture verrouillée (isInvoiceLocked / canModifyOrder / canModifyInvoiceAmount).
- **Accounting close** : blocage si période clôturée (assertAccountingOpen + catch avec return { error }).
- **Retourne { error }** : l’action ne laisse pas remonter un throw vers l’UI ; le refus est toujours sous forme `return { error: string }` (éventuellement via catch externe).

---

## 3) Manques identifiés + patch

### 3.1) Manques

| Manque | Gravité | Action concernée |
|--------|---------|------------------|
| ~~markInvoicePaid bloqué si DELIVERED~~ : règle ERP = **paiement autorisé après livraison** (COD/délai). Le check DELIVERED dans markInvoicePaid a été **supprimé**. | — | markInvoicePaid |
| deleteInvoiceAction ne charge pas l’order : pas de blocage explicite si `order.status === DELIVERED`. En pratique isInvoiceLocked bloque souvent (facture livrée = souvent lockée), mais une commande DELIVERED avec facture sans paiement (edge case) pourrait être supprimée. | Faible | deleteInvoiceAction |
| cancelOrderAction / updateOrderStatus(..., 'CANCELLED') : blocage sur invoice seulement si status === 'PAID'. Une facture PARTIAL (lockée) permet encore l’annulation. Aligné ou non avec « lock strict » selon décision métier (voir AUDIT_INVOICE_LOCK.md). | Faible | cancelOrderAction, updateOrderStatus |
| order.ts : refus invoice-lock / DELIVERED via throw dans la transaction, puis catch qui retourne { error }. Conforme au standard « pas de 500 », mais pour uniformité on pourrait faire le check avant la transaction et retourner { error } directement. | Faible | order.ts (toutes les actions listées) |

### 3.2) Patch proposés

#### Patch 1 — markInvoicePaid : **pas de blocage si DELIVERED** (règle ERP)

Paiement autorisé après livraison (COD/délai). Dans `app/actions/admin-orders.ts`, **aucun** check sur `order.status === 'DELIVERED'`. Ordre des checks : 1) assertAccountingOpen(invoice.createdAt, …), 2) solde restant / montant (refus si remaining ≤ 0 ou amount &gt; remaining). Le 1er paiement verrouille la facture (invoice-lock inchangé).

#### Patch 2 — deleteInvoiceAction : bloquer si order.status === DELIVERED — **APPLIQUÉ**

Dans `app/actions/admin-payments.ts`, après le fetch de l’invoice, chargement de l’order et refus si DELIVERED :

```ts
const order = await prisma.order.findUnique({
  where: { id: invoice.orderId },
  select: { status: true },
})
if (order?.status === 'DELIVERED') {
  return { error: 'Impossible de supprimer la facture d\'une commande déjà livrée.' }
}
```

Puis conservation des checks existants (assertAccountingOpen, isInvoiceLocked).

#### Patch 3 (optionnel) — order.ts : return { error } explicite avant transaction

Pour uniformiser avec le standard « toujours return { error } sans throw pour refus métier », on peut pour chaque action qui appelle canModifyOrder / canModifyInvoiceAmount :

- Avant d’entrer dans `prisma.$transaction`, récupérer l’order (déjà fait dans la transaction aujourd’hui), appeler canModifyOrder / canModifyInvoiceAmount, et si false retourner `return { error: ORDER_NOT_MODIFIABLE_ERROR }` ou `return { error: INVOICE_LOCKED_ERROR }` sans lancer la transaction. Cela évite le throw dans le callback. Les tests et l’UI restent inchangés (même message, même forme de retour).

---

## 4) Récapitulatif par règle

- **DELIVERED = aucune modification structurelle ; paiement autorisé si période ouverte**  
  - Modification/suppression interdites : OrderItem / Invoice amount (canModifyOrder), annulation (CONFIRMED/PREPARED uniquement), modification/suppression de paiement (invoice lock), suppression de facture (invoice lock + bloc DELIVERED dans deleteInvoiceAction).  
  - **Paiement (markInvoicePaid)** : autorisé après livraison ; pas de check DELIVERED ; ordre accounting-close puis solde/montant.

- **Invoice lock**  
  - Appliqué partout où c’est pertinent (order.ts via canModifyOrder/canModifyInvoiceAmount, admin-payments via isInvoiceLocked).  
  - Annulation avec facture PARTIAL : voir AUDIT_INVOICE_LOCK.md (décision à trancher).

- **Accounting close**  
  - Appliqué partout (assertAccountingOpen + catch avec return { error } et logSecurityEvent pour date invalide).

- **Retour { error } (pas throw)**  
  - Toutes les actions concernées retournent bien `{ error }` à l’appelant (order.ts via catch externe, admin-orders et admin-payments en direct). Aucun throw non géré vers la runtime Next.

---

## 5) Tests ciblés à ajouter (si manquants)

- **Unit (invoice-lock / order flow)**  
  - canModifyOrder(order avec status DELIVERED) → false.  
  - canModifyOrder(order avec status CONFIRMED, invoice null) → true.  
  (Déjà couverts ou à ajouter dans `app/lib/__tests__/invoice-lock.test.ts`.)

- **E2E**  
  - Scénario : commande livrée (seed ou workflow) → tentative modification quantité depuis le portail ou admin → message d’erreur attendu (ORDER_NOT_MODIFIABLE_ERROR ou équivalent), pas de succès.  
  - Scénario : facture verrouillée → tentative suppression paiement → message d’erreur, pas de succès.  
  - (À intégrer dans ou à côté de `tests/e2e/invoice-lock.spec.ts` / accounting-close si besoin.)

- **Tests ciblés manquants aujourd’hui**  
  - Aucun test unitaire dédié dans le repo pour invoice-lock (pas de `invoice-lock.test.ts`).  
  - E2E invoice-lock existant : tests présents mais à renforcer avec données déterministes et assertions sur message d’erreur (voir AUDIT_INVOICE_LOCK.md section F).

---

## 6) Synthèse

- **Matrice** : tableau ci‑dessus (section 2).  
- **Manques** : deleteInvoiceAction avec check DELIVERED (Patch 2 appliqué) ; annulation avec facture PARTIAL (déjà documenté).  
- **Patch** : Patch 1 = paiement autorisé après livraison (check DELIVERED supprimé dans markInvoicePaid), Patch 2 (deleteInvoiceAction), Patch 3 (order.ts, optionnel).  
- **Tests** : ajout de tests unitaires invoice-lock (dont DELIVERED) et renforcement E2E avec messages d’erreur stables et données déterministes.
