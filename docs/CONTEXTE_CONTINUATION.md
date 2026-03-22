# Contexte pour poursuite — DOUMA Dental Manager (TacTac)

**Objectif :** Document de handoff pour reprendre le travail dans un nouveau chat.

---

## 1. Projet

- **Nom :** DOUMA Dental Manager (TacTac)
- **Stack :** Next.js 16, Prisma (PostgreSQL), rôle-based dashboards (Admin, Comptable, Magasinier, Commercial, Client, Livreur)
- **Langue UI :** Français
- **Références :** AGENTS.md, docs/ARCHITECTURE.md

---

## 2. Module Achats — État actuel

### Phase A (terminée)
- Schéma : `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseReceipt`, `PurchaseReceiptItem`
- Actions : `createSupplierAction`, `updateSupplierAction`, `createPurchaseOrderAction`, `sendPurchaseOrderAction`, `createPurchaseReceiptAction`, `cancelPurchaseOrderAction`
- Tests : `tests/integration/purchases-workflow.test.ts`
- Fichier : `app/actions/purchases.ts`

### Phase B (en cours) — UI Fournisseurs
- Plan : `docs/PLAN_PHASE_B_ETAPE_1.md`, `docs/PLAN_PHASE_B_SUPPLIERS_UI.md`
- Étapes prévues :
  - **Étape 1 :** Sidebar + liste + placeholders `/new` et `/[id]`
  - **Étape 2 :** SupplierFilters, SupplierFormFields partagé, formulaires création/édition
  - **Étape 3 :** Finitions, liste commandes sur `[id]`

---

## 3. Ce qui a été fait (Phase B étape 1)

| Élément | Statut | Fichier(s) |
|---------|--------|------------|
| Schéma `isActive` sur Supplier | ✅ | `prisma/schema.prisma` |
| Sidebar « Fournisseurs » + COMMERCIAL | ✅ | `components/admin/Sidebar.tsx` |
| Liste paginée + état vide | ✅ | `app/admin/suppliers/page.tsx` |
| Placeholder /new | ✅ | `app/admin/suppliers/new/page.tsx` |
| Placeholder /[id] (fiche + isActive) | ✅ | `app/admin/suppliers/[id]/page.tsx` |

**À vérifier :** `npx prisma generate` et `npx prisma db push` pour `isActive`.

---

## 4. À faire ensuite

1. **Étape 2 — Formulaires :**
   - `SupplierFormFields.tsx` (composant partagé)
   - `SupplierFilters.tsx` (recherche `q`)
   - `CreateSupplierForm` dans `/admin/suppliers/new`
   - `EditSupplierForm` dans `/admin/suppliers/[id]`

2. **Permissions :**
   - ADMIN : accès complet
   - COMMERCIAL : lecture + création (modification à préciser dans le code)

3. **Actions à mettre à jour :** `createSupplierAction` et `updateSupplierAction` pour gérer `isActive`.

---

## 5. Fichiers importants

```
app/admin/suppliers/        → liste, new, [id]
app/actions/purchases.ts   → createSupplierAction, updateSupplierAction
components/admin/Sidebar.tsx
lib/pagination.ts
app/components/AdminPagination.tsx
docs/PLAN_PHASE_B_ETAPE_1.md
docs/PLAN_PHASE_B_SUPPLIERS_UI.md
```

**Patterns à copier :** `app/admin/clients/` ( ClientFilters, EditClientForm, InviteClientForm ), `app/admin/delivery-agents/` (état vide).

---

## 6. Modèle Supplier (Prisma)

```
id, name, contact, email, phone, address, city, ice, notes, isActive, createdAt, updatedAt
purchaseOrders (relation)
```

---

## 7. Commande pour démarrer

```bash
npm run dev          # serveur
npm run db:push      # si besoin après modif schéma
npm run lint         # vérification
```
