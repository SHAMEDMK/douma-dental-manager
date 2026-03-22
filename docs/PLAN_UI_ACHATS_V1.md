# Plan module Achats : validation backend + UI V1

**Date :** 2025-03-06  
**Objectif :** Passer à la phase UI du module Achats en validant d'abord le backend, puis en implémentant l'interface admin selon un ordre ERP cohérent.

---

## Partie 1 — Plan de validation backend

### 1.1 Actions à valider

| Action | Méthode de test recommandée |
|--------|-----------------------------|
| `createSupplierAction` | Test unitaire / intégration (Vitest) |
| `createPurchaseOrderAction` | Test unitaire / intégration |
| `sendPurchaseOrderAction` | Test unitaire / intégration |
| `createPurchaseReceiptAction` | Test intégration (avec DB ou mock Prisma) |
| `cancelPurchaseOrderAction` | Test unitaire / intégration |

### 1.2 Checklist de validation backend

#### createSupplierAction

| # | Cas | Données d'entrée | Résultat attendu |
|---|-----|------------------|------------------|
| 1 | Succès | `{ name: "Fournisseur Test", email: "f@test.com" }` | `{ supplierId: "xxx" }`, fournisseur créé en DB, AuditLog SUPPLIER_CREATED |
| 2 | Refus : non authentifié | session null | `{ error: "Non authentifié" }` |
| 3 | Refus : rôle CLIENT | session.role = CLIENT | `{ error: "Accès refusé" }` |
| 4 | Refus : nom vide | `{ name: "" }` | `{ error: "Le nom du fournisseur est obligatoire" }` |
| 5 | Refus : nom blanc | `{ name: "   " }` | `{ error: "Le nom du fournisseur est obligatoire" }` |
| 6 | Succès : champs optionnels | `{ name: "Test", contact: "Jean", phone: "0612" }` | Tous les champs sauvegardés |

#### createPurchaseOrderAction

| # | Cas | Données d'entrée | Résultat attendu |
|---|-----|------------------|------------------|
| 1 | Succès | supplierId valide + items[{ productId, quantityOrdered: 10, unitCost: 5 }] | `{ purchaseOrderId }`, PO créée DRAFT, orderNumber PO-YYYY-XXXX |
| 2 | Refus : non authentifié | session null | `{ error: "Non authentifié" }` |
| 3 | Refus : fournisseur inexistant | supplierId invalide | `{ error: "Fournisseur introuvable" }` |
| 4 | Refus : items vides | items: [] | `{ error: "Articles invalides..." }` |
| 5 | Refus : quantité ≤ 0 | items[{ quantityOrdered: 0 }] | `{ error: "Articles invalides..." }` |
| 6 | Refus : coût < 0 | items[{ unitCost: -1 }] | `{ error: "Articles invalides..." }` |
| 7 | Succès : produit + variante | items avec productVariantId | PO créée avec variante |

#### sendPurchaseOrderAction

| # | Cas | Contexte | Résultat attendu |
|---|-----|----------|------------------|
| 1 | Succès | PO en DRAFT | status → SENT, sentAt défini |
| 2 | Refus : PO inexistant | purchaseOrderId invalide | `{ error: "Commande fournisseur introuvable" }` |
| 3 | Refus : PO déjà SENT | status = SENT | `{ error: "Seules les commandes en brouillon..." }` |
| 4 | Refus : période clôturée | accountingLockedUntil > po.createdAt | `{ error: "Période comptable clôturée..." }` |
| 5 | Refus : rôle MAGASINIER | session.role = MAGASINIER | `{ error: "Accès refusé" }` |

#### createPurchaseReceiptAction

| # | Cas | Contexte | Résultat attendu |
|---|-----|----------|------------------|
| 1 | Succès réception partielle | PO SENT, items[{ purchaseOrderItemId, quantityReceived: 2 }] (sur 10) | PurchaseReceipt créé, quantityReceived += 2, StockMovement IN source PURCHASE_RECEIPT, PO → PARTIALLY_RECEIVED |
| 2 | Succès réception totale | Toutes lignes reçues entièrement | PO → RECEIVED |
| 3 | Refus : quantité > restant | quantityReceived: 15 sur ligne restant 5 | `{ error: "Quantité supérieure au reste..." }` |
| 4 | Refus : PO RECEIVED | status = RECEIVED | `{ error: "Cette commande est déjà entièrement réceptionnée" }` |
| 5 | Refus : PO CANCELLED | status = CANCELLED | `{ error: "Impossible de réceptionner une commande annulée" }` |
| 6 | Refus : items vides | items avec quantityReceived: 0 partout | `{ error: "Aucune quantité à réceptionner" }` |
| 7 | Vérification stock | Réception produit sans variante | Product.stock incrémenté |
| 8 | Vérification stock variante | Réception variante | ProductVariant.stock incrémenté |

#### cancelPurchaseOrderAction

| # | Cas | Contexte | Résultat attendu |
|---|-----|----------|------------------|
| 1 | Succès | PO DRAFT ou SENT sans réception | status → CANCELLED |
| 2 | Refus : PO avec réceptions | receipts.length > 0 | `{ error: "Impossible d'annuler une commande ayant des réceptions" }` |
| 3 | Refus : PO PARTIALLY_RECEIVED | status = PARTIALLY_RECEIVED | `{ error: "Impossible d'annuler une commande déjà réceptionnée..." }` |
| 4 | Refus : rôle COMMERCIAL | session.role = COMMERCIAL | `{ error: "Accès refusé" }` (ADMIN only) |
| 5 | Refus : période clôturée | accountingLockedUntil > po.createdAt | `{ error: "Période comptable clôturée..." }` |

### 1.3 Ordre d'exécution des tests

1. **createSupplierAction** (isolé, pas de dépendance)
2. **createPurchaseOrderAction** (dépend de Supplier et Product)
3. **sendPurchaseOrderAction** (dépend de PO DRAFT)
4. **createPurchaseReceiptAction** (dépend de PO SENT, vérifie stock + StockMovement)
5. **cancelPurchaseOrderAction** (dépend de PO DRAFT/SENT sans réception)

### 1.4 Fichier de test proposé

```
tests/integration/purchases-workflow.test.ts
```

---

## Partie 2 — Structure UI V1

### 2.1 Actions backend à ajouter (pour l'UI)

| Action | Description | Priorité |
|--------|-------------|----------|
| `updateSupplierAction` | Modifier un fournisseur | P1 |
| `getSuppliersAction` ou lecture Prisma directe | Liste fournisseurs (page peut charger via Prisma) | — |
| `getPurchaseOrdersAction` ou Prisma | Liste commandes (idem) | — |
| Lecture seule : pas d'action dédiée, pages server-side avec Prisma | — | — |

> Les pages admin existantes (clients, orders) chargent les données via `prisma.*.findMany` dans la page serveur. Aucune action dédiée « liste » n'est nécessaire.

### 2.2 Arborescence des écrans

```
/admin/suppliers          → Liste fournisseurs
/admin/suppliers/new      → Créer un fournisseur
/admin/suppliers/[id]     → Détail / modifier fournisseur

/admin/purchases          → Liste commandes fournisseur
/admin/purchases/new      → Créer une commande (DRAFT)
/admin/purchases/[id]     → Détail commande (lecture, actions : Envoyer, Annuler, Réceptionner)
/admin/purchases/[id]/receive → Formulaire de réception
```

### 2.3 Rôles et accès

| Route | ADMIN | COMMERCIAL | MAGASINIER | COMPTABLE |
|-------|-------|------------|------------|-----------|
| /admin/suppliers/* | ✅ | ✅ | ❌ | ❌ |
| /admin/purchases | ✅ | ✅ | ✅ (lecture) | ✅ (lecture) |
| /admin/purchases/new | ✅ | ✅ | ❌ | ❌ |
| /admin/purchases/[id] | ✅ | ✅ | ✅ | ✅ |
| /admin/purchases/[id]/receive | ✅ | ❌ | ✅ | ❌ |

---

## Partie 3 — Fiche détaillée par écran

### 3.1 /admin/suppliers — Liste fournisseurs

| Élément | Détail |
|---------|--------|
| **Objectif** | Lister, rechercher et accéder aux fournisseurs |
| **Données affichées** | Tableau : Nom, Contact, Email, Téléphone, Ville, ICE, Nb commandes, Actions |
| **Filtres** | Recherche texte (nom, contact, email, ICE) |
| **Pagination** | Oui (parsePaginationParams, 20 par page) |
| **Champs** | — |
| **Boutons** | « Nouveau fournisseur » (→ /admin/suppliers/new) |
| **Actions** | Clic ligne ou lien → /admin/suppliers/[id] |
| **Pattern à réutiliser** | clients/page.tsx (ClientFilters, AdminPagination, ExportExcel si pertinent) |

### 3.2 /admin/suppliers/new — Créer un fournisseur

| Élément | Détail |
|---------|--------|
| **Objectif** | Créer un nouveau fournisseur |
| **Données affichées** | Formulaire |
| **Champs** | name* (obligatoire), contact, email, phone, address, city, ice, notes |
| **Boutons** | « Enregistrer » (createSupplierAction), « Annuler » (retour liste) |
| **Actions** | Succès → redirect /admin/suppliers/[id] ou /admin/suppliers |
| **Pattern** | products/new (CreateProductForm), clients invite |

### 3.3 /admin/suppliers/[id] — Détail / modifier fournisseur

| Élément | Détail |
|---------|--------|
| **Objectif** | Afficher et modifier un fournisseur, voir ses commandes |
| **Données affichées** | Fiche fournisseur + liste des PO du fournisseur (sous-tableau) |
| **Champs** | name*, contact, email, phone, address, city, ice, notes (éditables) |
| **Boutons** | « Enregistrer » (updateSupplierAction), « Retour liste » |
| **Actions** | Lien vers chaque PO → /admin/purchases/[id] |
| **Pattern** | clients/[id] (EditClientForm, affichage + édition) |

### 3.4 /admin/purchases — Liste commandes fournisseur

| Élément | Détail |
|---------|--------|
| **Objectif** | Lister les commandes fournisseur avec filtres |
| **Données affichées** | Tableau : N° PO, Fournisseur, Date, Statut, Montant total, Nb items, Actions |
| **Filtres** | Statut (DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED), Fournisseur (recherche), Date (from/to) |
| **Pagination** | Oui (20 par page) |
| **Champs** | — |
| **Boutons** | « Nouvelle commande » (→ /admin/purchases/new) |
| **Actions** | Lien → /admin/purchases/[id] |
| **Pattern** | orders/page.tsx (OrderFilters, status, dates) |

### 3.5 /admin/purchases/new — Créer une commande

| Élément | Détail |
|---------|--------|
| **Objectif** | Créer une commande fournisseur (DRAFT) |
| **Données affichées** | Formulaire : sélection fournisseur + lignes (produit/variante, qté, coût unitaire) |
| **Champs** | supplierId* (select), items[] : productId*, productVariantId?, quantityOrdered*, unitCost* |
| **Boutons** | « Ajouter une ligne », « Supprimer ligne », « Enregistrer » (createPurchaseOrderAction) |
| **Actions** | Succès → redirect /admin/purchases/[id] |
| **Pattern** | Lignes dynamiques type panier (addItemsToOrder côté client), select produits comme orders |

### 3.6 /admin/purchases/[id] — Détail commande

| Élément | Détail |
|---------|--------|
| **Objectif** | Voir une commande, envoyer (DRAFT→SENT), annuler, accéder à la réception |
| **Données affichées** | En-tête : N° PO, Fournisseur, Statut, Date création, Date envoi. Tableau lignes : Produit, Qté commandée, Qté reçue, Restant, Coût unitaire, Total. Bloc Réceptions : liste des réceptions (date, créateur). |
| **Champs** | — (lecture seule sauf actions) |
| **Boutons** | « Envoyer au fournisseur » (si DRAFT), « Annuler » (si DRAFT/SENT sans réception, ADMIN), « Réceptionner » (si SENT ou PARTIALLY_RECEIVED) |
| **Actions** | Envoyer → sendPurchaseOrderAction ; Annuler → cancelPurchaseOrderAction ; Réceptionner → lien /admin/purchases/[id]/receive |
| **Pattern** | orders/[id] (OrderStatusSelect, OrderActionButtons) |

### 3.7 /admin/purchases/[id]/receive — Réceptionner

| Élément | Détail |
|---------|--------|
| **Objectif** | Saisir les quantités reçues par ligne |
| **Données affichées** | En-tête PO + fournisseur. Tableau : Produit, Qté commandée, Qté déjà reçue, Restant, [Champ Qté reçue] |
| **Champs** | Par ligne : input number quantityReceived (max = restant) |
| **Boutons** | « Valider la réception » (createPurchaseReceiptAction), « Annuler » |
| **Actions** | Succès → redirect /admin/purchases/[id] avec message |
| **Pattern** | Formulaire avec validation client (qté ≤ restant) |

---

## Partie 4 — Ordre de développement recommandé

### Phase A — Backend complémentaire + validation

1. **Ajouter `updateSupplierAction`** dans `app/actions/purchases.ts`
2. **Écrire `tests/integration/purchases-workflow.test.ts`** selon la checklist §1.2
3. **Valider** : `npm run test:run` passe

### Phase B — Fournisseurs (fondation)

4. **Menu sidebar** : ajouter « Achats » ou « Fournisseurs » + « Commandes » (référence `components/admin/Sidebar.tsx`)
5. **`/admin/suppliers`** : page liste + SupplierFilters (recherche)
6. **`/admin/suppliers/new`** : CreateSupplierForm + page
7. **`/admin/suppliers/[id]`** : détail + EditSupplierForm (updateSupplierAction)

### Phase C — Commandes fournisseur

8. **`/admin/purchases`** : page liste + PurchaseOrderFilters (statut, fournisseur, dates)
9. **`/admin/purchases/new`** : CreatePurchaseOrderForm (fournisseur + lignes produits)
10. **`/admin/purchases/[id]`** : détail + boutons Envoyer / Annuler / Réceptionner

### Phase D — Réception

11. **`/admin/purchases/[id]/receive`** : formulaire de réception (quantités par ligne)
12. **Tests E2E** (optionnel) : parcours complet création PO → envoi → réception

### Synthèse

```
A1 → A2 → A3  (backend + tests)
B4 → B5 → B6 → B7  (fournisseurs)
C8 → C9 → C10  (commandes)
D11 → D12  (réception + E2E)
```

---

## Partie 5 — Réutilisation des patterns existants

| Composant / pattern | Source | Usage Achats |
|---------------------|--------|--------------|
| `parsePaginationParams`, `computeSkipTake`, `computeTotalPages` | lib/pagination.ts | suppliers, purchases listes |
| `AdminPagination` | app/components/AdminPagination | idem |
| `ClientFilters` | app/admin/clients/ClientFilters | SupplierFilters (recherche) |
| `OrderFilters` | app/admin/orders/OrderFilters | PurchaseOrderFilters (statut, fournisseur, dates) |
| `EditClientForm` | app/admin/clients/[id]/EditClientForm | EditSupplierForm |
| `OrderActionButtons` | app/admin/orders/OrderActionButtons | Boutons PO (Envoyer, Annuler, Réceptionner) |
| `getSession` + redirect | Toutes pages admin | Vérification rôle sur suppliers/purchases |
| Layout admin | app/admin/layout.tsx | Déjà utilisé |

---

## Partie 6 — Livrable synthétique

### Checklist backend (à cocher avant UI)

- [ ] createSupplierAction : 6 cas validés
- [ ] createPurchaseOrderAction : 7 cas validés
- [ ] sendPurchaseOrderAction : 5 cas validés
- [ ] createPurchaseReceiptAction : 8 cas validés
- [ ] cancelPurchaseOrderAction : 5 cas validés
- [ ] updateSupplierAction ajouté et testé

### Structure UI V1

| Écran | Route | Priorité |
|-------|-------|----------|
| Liste fournisseurs | /admin/suppliers | P1 |
| Créer fournisseur | /admin/suppliers/new | P1 |
| Détail/éditer fournisseur | /admin/suppliers/[id] | P1 |
| Liste commandes | /admin/purchases | P2 |
| Créer commande | /admin/purchases/new | P2 |
| Détail commande | /admin/purchases/[id] | P2 |
| Réceptionner | /admin/purchases/[id]/receive | P3 |

### Ordre conseillé

```
Backend (updateSupplier + tests) → Sidebar → Suppliers (3 écrans) → Purchases liste + new + détail → Receive
```
