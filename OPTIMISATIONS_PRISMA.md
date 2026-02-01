# Optimisations des requêtes Prisma

## 1. Requêtes combinées (réduction des allers-retours)

| Page / API | Avant | Après |
|------------|--------|--------|
| **admin/orders** | 3 requêtes séquentielles (AdminSettings, CompanySettings, Order.findMany) | 1 round-trip : `Promise.all([getSettingsForOrders(), prisma.order.findMany(...)])` |
| **admin/orders/[id]** | 3 séquentielles (settings, companySettings, order) | 1 round-trip : `Promise.all([getSettingsForOrders(), prisma.order.findUnique(...)])` |
| **admin/page** (tableau de bord) | 4 séquentielles (count orders, aggregate invoices, count products, findMany users) | 1 round-trip : `Promise.all([order.count, invoice.aggregate, product.count, user.findMany])` |
| **portal/page** (catalogue) | Jusqu’à 4 (user, products, count, companySettings) | 1 round-trip : `Promise.all([user?, products, count, companySettings])` |
| **admin/invoices** | 2 séquentielles (companySettings, findMany invoices) | 1 round-trip : `Promise.all([getCompanySettings(), invoice.findMany(...)])` |
| **admin/audit** | Déjà en `Promise.all([findMany, count])` | Inchangé, + `select` pour limiter les colonnes |
| **comptable/dashboard** | 4 requêtes (payments, invoices findMany, aggregate unpaid, count pending) | 1 round-trip : `Promise.all([payments, invoice.aggregate(période), invoice.aggregate(unpaid)])` + suppression de la requête `pendingInvoicesCount` (déjà dans `unpaidInvoices._count`) |
| **api/admin/stats/alerts** | 5–6 séquentielles | 1 round-trip : `Promise.all([products, order.count, invoice.aggregate, order.count(approval), clientRequest.count])` |

---

## 2. Données statiques / cache

- **AdminSettings** (id: `'default'`) et **CompanySettings** (id: `'default'`) changent rarement.
- **Module** : `app/lib/settings-cache.ts`
  - `getAdminSettings()` : cache Next.js `unstable_cache` 60 s
  - `getCompanySettings()` : idem
  - `getSettingsForOrders()` : retourne `{ approvalMessage, vatRate }` en parallèle (2 requêtes ou cache)
  - `getVatRate()` : uniquement le taux TVA
- Les pages commandes / factures / détail commande utilisent ce module au lieu d’appeler directement `prisma.adminSettings` / `prisma.companySettings`.

---

## 3. Optimisation des appels (select + agrégations)

| Fichier | Modification |
|---------|--------------|
| **admin/audit** | `auditLog.findMany` avec `select: { id, action, entityType, entityId, userEmail, userRole, details, createdAt }` (plus de colonnes inutiles comme ipAddress, userAgent, userId). |
| **admin/products** | `product.findMany` avec `select: { id, sku, name, category, price, stock }`. |
| **admin/invoices** | `invoice.findMany` avec `select` explicite (déjà partiellement fait ; conservé dans la version parallélisée). |
| **comptable/dashboard** | Remplacement de `invoice.findMany` (période) par `invoice.aggregate` avec `_sum: { amount: true }, _count: true` ; `payments` en `select` minimal (id, amount, method, createdAt, invoice avec champs nécessaires). |
| **api/admin/stats/alerts** | `product.findMany` déjà en `select: { id, name, stock, minStock }`. |

---

## Fichiers modifiés (résumé)

1. **app/lib/settings-cache.ts** (nouveau) – Cache et helpers pour AdminSettings / CompanySettings.
2. **app/admin/orders/page.tsx** – `getSettingsForOrders()` + `Promise.all` avec `order.findMany`.
3. **app/admin/orders/[id]/page.tsx** – `Promise.all([getSettingsForOrders(), order.findUnique])`.
4. **app/admin/page.tsx** – `Promise.all` pour les 4 requêtes du tableau de bord.
5. **app/admin/invoices/page.tsx** – `Promise.all([getCompanySettings(), invoice.findMany])`, suppression du doublon where/findMany.
6. **app/admin/audit/page.tsx** – `select` sur `auditLog.findMany`.
7. **app/admin/products/page.tsx** – `select` sur `product.findMany`.
8. **app/portal/page.tsx** – `Promise.all([user?, products, count, companySettings])`.
9. **app/comptable/dashboard/page.tsx** – `Promise.all` (payments, aggregate période, aggregate unpaid), `select` sur payments, suppression de `pendingInvoicesCount`.
10. **app/api/admin/stats/alerts/route.ts** – `Promise.all` pour toutes les alertes.

---

## Impact attendu

- **Moins de round-trips** : pages principales passent de 3–4 requêtes séquentielles à 1–2 (dont une souvent mise en cache).
- **Cache 60 s** sur AdminSettings et CompanySettings : moins de lectures DB sur les pages listes/détails.
- **Moins de données transférées** : `select` réduit les colonnes lues (audit, products, comptable).
- **Agrégations** : comptable utilise `aggregate` au lieu de `findMany` + reduce pour la période et pour les impayés.
