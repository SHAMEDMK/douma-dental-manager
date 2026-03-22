# Architecture du module Achats

**Date :** 2025-03-06  
**Statut :** Implémenté (backend), UI à venir.

---

## 1. Vue d'ensemble

Le module Achats gère le flux : **Fournisseur → Commande fournisseur → Réception → Stock**.

| Entité | Rôle |
|--------|------|
| **Supplier** | Fournisseur (nom, contact, ICE, etc.) |
| **PurchaseOrder** | Commande fournisseur (numéro PO-YYYY-XXXX) |
| **PurchaseOrderItem** | Lignes de commande (produit/variante, quantité, coût unitaire) |
| **PurchaseReceipt** | Réception (liée à une PO) |
| **PurchaseReceiptItem** | Quantités reçues par ligne |

---

## 2. Schéma Prisma

### Modèles

- `Supplier` : nom, contact, email, phone, address, city, ice, notes
- `PurchaseOrder` : orderNumber (unique), supplierId, status, sentAt
- `PurchaseOrderItem` : purchaseOrderId, productId, productVariantId?, quantityOrdered, quantityReceived, unitCost
- `PurchaseReceipt` : purchaseOrderId, receivedAt, createdBy
- `PurchaseReceiptItem` : purchaseReceiptId, purchaseOrderItemId, quantityReceived

### remainingQty

`remainingQty` = `quantityOrdered - quantityReceived` (calculé). La quantité reçue est stockée sur `PurchaseOrderItem.quantityReceived`.

### Intégration StockMovement

- **Champ `source`** : `StockMovement.source` peut être `PURCHASE_RECEIPT`, `MANUAL`, `ORDER_OUT`, `ORDER_CANCELLED`
- Lors d'une réception : création de `StockMovement` avec `type: 'IN'`, `source: 'PURCHASE_RECEIPT'`, `reference: receiptId`
- Produit ou variante : aligné sur `PurchaseOrderItem` (productId + productVariantId optionnel)

---

## 3. Numérotation

Format : **PO-YYYY-XXXX** (ex. PO-2025-0001)

- Clé `GlobalSequence` : `PURCHASE_ORDER-{year}`
- Incrément annuel, séquence continue sur l'année
- Générée dans `app/lib/sequence.ts` : `getNextPurchaseOrderNumber()`

---

## 4. Statuts et transitions

| Statut | Signification | Modifiable ? |
|--------|---------------|--------------|
| **DRAFT** | Brouillon | Oui (items, quantités, fournisseur) |
| **SENT** | Envoyée au fournisseur | Non |
| **PARTIALLY_RECEIVED** | Au moins une réception partielle | Non |
| **RECEIVED** | Entièrement réceptionnée | Bloqué |
| **CANCELLED** | Annulée | Bloqué |

### Transitions

- `DRAFT → SENT` : envoi au fournisseur (action `sendPurchaseOrderAction`)
- `SENT → PARTIALLY_RECEIVED` : première réception partielle
- `PARTIALLY_RECEIVED → RECEIVED` : toutes les lignes totalement reçues
- `DRAFT` ou `SENT` → `CANCELLED` : annulation (uniquement si aucune réception)

---

## 5. Règles métier

### Réception partielle

- Chaque ligne peut être réceptionnée en plusieurs fois
- Pour chaque réception : `quantityReceived ≤ remainingQty` par ligne
- Agrégation par ligne dans une même soumission (évite doublons)

### Blocage après réception

- Statut `RECEIVED` : aucune nouvelle réception autorisée
- Statut `CANCELLED` : aucune modification

### Clôture comptable

- `accountingLockedUntil` (CompanySettings) appliqué aux PO
- Envoi et annulation refusés si `po.createdAt <= accountingLockedUntil`

---

## 6. Protections

| Risque | Mitigation |
|--------|------------|
| Double réception (même soumission) | Transaction atomique, validation avant update |
| Quantité > remainingQty | Validation stricte par ligne |
| Réception sur PO annulée ou RECEIVED | Vérification du statut avant réception |
| Doublons par ligne dans le payload | Agrégation par `purchaseOrderItemId` |

---

## 7. RBAC (permissions)

| Action | Rôles |
|--------|-------|
| Créer fournisseur | ADMIN, COMMERCIAL |
| Créer commande fournisseur (DRAFT) | ADMIN, COMMERCIAL |
| Envoyer commande (DRAFT → SENT) | ADMIN, COMMERCIAL |
| Réceptionner | ADMIN, MAGASINIER |
| Annuler commande | ADMIN |

---

## 8. Audit

Actions auditées (`lib/audit.ts`) :

- `SUPPLIER_CREATED`, `SUPPLIER_UPDATED`, `SUPPLIER_DELETED`
- `PURCHASE_ORDER_CREATED`, `PURCHASE_ORDER_STATUS_CHANGED`, `PURCHASE_ORDER_CANCELLED`
- `PURCHASE_RECEIPT_CREATED`

---

## 9. Fichiers

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Modèles Supplier, PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem ; champ `source` sur StockMovement |
| `app/lib/sequence.ts` | `getNextPurchaseOrderNumber()` |
| `app/actions/purchases.ts` | createSupplierAction, createPurchaseOrderAction, sendPurchaseOrderAction, createPurchaseReceiptAction, cancelPurchaseOrderAction |
| `lib/audit.ts` | Types d'audit Achats |

---

## 10. Prochaines étapes (UI)

1. Pages admin : liste fournisseurs, CRUD fournisseur
2. Pages admin : liste commandes fournisseur, détail, création
3. Formulaire de réception (par PO, saisie des quantités reçues par ligne)
4. Intégration dans la sidebar admin (menu Achats)

---

## 11. Migration

Après modification du schéma, exécuter :

```bash
npx prisma migrate dev --name add_purchases_module
# ou en dev sans migration formelle :
npx prisma db push
npx prisma generate
```
