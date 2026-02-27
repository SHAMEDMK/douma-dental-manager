# Audit performance – Vercel (serverless) + PostgreSQL

Objectif : identifier les points chauds, requêtes lourdes, et proposer un plan d’optimisation sans breaking change (compatible seed/E2E).

---

## 1. Tables et champs "chauds"

| Table | Champs souvent filtrés / triés | Remarque |
|-------|--------------------------------|-----------|
| **Order** | `userId`, `status`, `createdAt`, `orderNumber`, `deliveryNoteNumber`, `deliveryAgentId` | Listes admin/portal/comptable/delivery, filtres date/statut/client |
| **Invoice** | `orderId` (unique), `invoiceNumber`, `status`, `createdAt` | Listes, exports, dashboard |
| **Payment** | `invoiceId`, `createdAt` | Toujours avec `orderBy: { createdAt: 'desc' }` |
| **AuditLog** | `entityType`, `entityId`, `userId`, `createdAt`, `action` | Page audit paginée (take/skip) |
| **StockMovement** | `productId`, `productVariantId`, `createdAt` | Listes mouvements par produit |
| **Product** | `name`, `stock`, `minStock`, `sku` | Catalogue, stock, alertes |
| **User** | `role`, `createdAt`, `email`, `clientCode`, `companyName` | Listes clients, livreurs, filtres |

---

## 2. Scan du code – endpoints / pages chauds

### Listes (findMany sans pagination)

- **admin/orders** : `order.findMany({ where, orderBy: { createdAt: 'desc' } })` + user + invoice (select léger). Pas de `take` → charge tout.
- **admin/invoices** : `invoice.findMany({ where, orderBy: { createdAt: 'desc' } })` + order.user + payments. Pas de `take`.
- **admin/payments** : `payment.findMany({ orderBy: { createdAt: 'desc' } })` + invoice + order + user. Pas de `take`.
- **portal/orders** : `order.findMany({ where: { userId } })` + orderBy createdAt. Limité par utilisateur.
- **comptable/orders**, **comptable/invoices**, **comptable/payments** : idem, findMany sans take.
- **delivery** : `order.findMany({ where: { status: 'SHIPPED' } })` puis filtres. Pas de pagination.
- **admin/clients**, **admin/users** : `user.findMany` + orderBy createdAt/name. Pas de take.
- **admin/stock/movements**, **magasinier/stock/movements** : `stockMovement.findMany` + orderBy createdAt. Pas de take.

### Exports Excel

- **GET /api/admin/export/orders** : `order.findMany` (tout) + select orderNumber, createdAt, status, total, user, invoice. **Charge tout en mémoire.**
- **GET /api/admin/export/invoices** : `invoice.findMany` (tout) + order, user, payments. **Charge tout en mémoire.**
- **GET /api/admin/export/payments** : `payment.findMany` (tout) + invoice, order, user. **Charge tout en mémoire.**
- **GET /api/admin/export/clients** : `user.findMany` (clients) + orderBy createdAt. **Charge tout.**

**Garde-fou exports (optionnel)** : variable d’environnement `EXPORT_MAX_ROWS` (ex. `20000`). Si définie, chaque route `/api/admin/export/*` fait un `count()` avant de charger les données ; si le nombre de lignes dépasse la limite, la requête est refusée avec **413 Payload Too Large** et un message clair (sans modifier le format Excel). Non définie = pas de limite (rétrocompatible). Voir aussi `lib/export-guard.ts` et **CHECKLIST_PRODUCTION_VERCEL.md**.

### Dashboard / stats

- **admin/dashboard** : `order.findMany({ where: { createdAt: { gte, lte } } })` avec **include** `user`, `items.product`, `invoice.payments`. Très lourd sur une période large.
- **GET /api/admin/stats/alerts** : Plusieurs requêtes en parallèle (count, findMany produits stock bas, aggregate factures). Bien découpé, mais filtres sur `status` / `stock` sans index dédié.

### Points de vigilance

- **N+1** : Pas de boucle explicite sur des IDs avec requêtes individuelles ; les listes utilisent des `include`/`select` en une requête. Risque principal = **include trop large** (ex. dashboard : user + items + product + invoice + payments).
- **Includes profonds** : admin dashboard (order → user, items → product, invoice → payments) ; détail commande/facture avec plusieurs niveaux. À limiter au strict nécessaire.
- **Absence de pagination** : Toutes les listes admin/comptable (orders, invoices, payments, clients, users, mouvements) chargent tout. À terme : ajouter `take`/`skip` + paramètres de page.
- **Tri sur colonne non indexée** : Beaucoup de `orderBy: { createdAt: 'desc' }` sur Order, Invoice, Payment, AuditLog. Les index proposés ciblent ces tris et les filtres courants.

---

## 3. Index recommandés (Prisma @@index)

Cohérent avec les filtres/tris identifiés. Aucun changement de contrainte, uniquement des index.

- **Order** :  
  - `@@index([userId, createdAt])` — portal orders, listes par client.  
  - `@@index([status, createdAt])` — listes par statut, delivery (SHIPPED).  
  - `@@index([createdAt])` — tris généraux, dashboard (déjà couvert partiellement par les composites ci‑dessus selon le moteur).
- **Invoice** :  
  - `@@index([status])` — filtres statut, stats.  
  - `@@index([createdAt])` — listes et exports triés par date.
- **Payment** :  
  - `@@index([invoiceId])` — jointures invoice → payments.  
  - `@@index([invoiceId, createdAt])` — listes de paiements par facture triées par date.
- **StockMovement** :  
  - `@@index([productId])` — listes par produit.  
  - `@@index([createdAt])` — listes mouvements récents (admin/magasinier).
- **User** (optionnel, si listes clients/livreurs lourdes) :  
  - `@@index([role])` — filtres par rôle.  
  - `@@index([createdAt])` — listes clients triées par date.

### AuditLog indexes

Index présents dans le schéma pour accélérer l’UI audit et les filtres :

| Index | Rôle |
|-------|------|
| `@@index([action])` | Filtre par type d’action (ORDER_CREATED, PAYMENT_RECORDED, etc.). |
| `@@index([entityType, entityId])` | Recherche par entité (ex. tous les logs d’une commande ou d’une facture). |
| `@@index([userId])` | Filtre « par utilisateur ». |
| `@@index([userId, createdAt])` | Filtre par utilisateur + tri par date (liste paginée « actions de l’utilisateur »). |
| `@@index([createdAt])` | Tri par date (liste globale paginée, ordre décroissant). |

Migration dédiée : `20260214000000_auditlog_indexes` (CREATE INDEX uniquement, pas de breaking change).

---

## 4. Vercel / Prisma

- **DATABASE_URL / DIRECT_URL** : Le schéma utilise `url = env("DATABASE_URL")` et `directUrl = env("DIRECT_URL")`. En prod Vercel, **DATABASE_URL** doit être une URL **pooled** (ex. Neon “Pooled”, PgBouncer) pour limiter les connexions serverless ; **DIRECT_URL** sans pooling pour `prisma migrate deploy`. Déjà documenté dans SNAPSHOT_TECHNIQUE_PRODUCTION.md / PROCEDURE_DEPLOIEMENT_VERCEL.md.
- **Prisma Accelerate / Neon** : Optionnel. Si timeouts ou cold start, ajouter `?connect_timeout=15` à DATABASE_URL ; Prisma Accelerate ou Neon serverless peuvent réduire la latence perçue. Pas obligatoire si le pooling est correct.
- **Exports** : Aujourd’hui les exports font un `findMany` sans `take` → tout est chargé en mémoire. Garde-fou : **EXPORT_MAX_ROWS** (optionnel) refuse les exports au-delà du seuil (réponse 413). À terme (PR3) : pagination/cursor ou streaming (ex. stream Excel par lots) pour ne pas tout charger d’un coup.

---

## 5. Plan "safe" (3 PRs)

### PR1 : Index uniquement

- Ajouter les `@@index` ci‑dessus dans `prisma/schema.prisma`.
- Créer une migration (que des `CREATE INDEX`).
- Déployer la migration (pas de changement de données, pas de breaking change).
- **Vérification** : après déploiement, exécuter les mêmes requêtes (listes, exports) et comparer les temps (voir section 6). Seed et E2E inchangés.

### PR2 : Pagination / requêtes

- Introduire une pagination (take/skip ou cursor) sur les listes lourdes : admin orders, invoices, payments, clients, audit (déjà paginé), mouvements de stock.
- Réduire les `include` trop larges (ex. dashboard : select ciblé au lieu de `user: true`, limiter la profondeur).
- Pas de changement de contrat API/public ; seulement ajout de paramètres (page, limit) et réduction de charge.

### PR3 : Exports (optionnel)

- Exports Excel : éviter de charger tout en mémoire (cursor/stream ou requêtes paginées + écriture Excel par blocs).
- Optionnel : job en arrière-plan (ex. Vercel Background / queue) pour très gros exports.

---

## 6. Comment vérifier que c’est mieux

- **Temps de réponse** :  
  - Avant/après PR1 : mesurer (navigateur DevTools Network ou logs serveur) les temps pour listes admin (orders, invoices, payments) et pour un export Excel.  
  - Cible : réduction sensible des requêtes lentes (> 500 ms) sur listes et exports.
- **Pagination** :  
  - Après PR2 : vérifier que la première page charge en < 1 s avec un `take` fixe (ex. 25 ou 50). Vérifier que la page 2+ fonctionne (skip/take ou cursor).
- **Exports** :  
  - Après PR3 (si fait) : exporter un volume réaliste (ex. 1k commandes) et vérifier absence de timeout et mémoire stable (pas de pic démesuré).
- **E2E / seed** :  
  - `npm run db:seed` et les tests E2E existants doivent passer sans changement. Les index n’altèrent pas le comportement fonctionnel.

---

## 7. Diagnostic erreur PDF en production (Vercel + PDFShift)

En cas d’erreur lors du téléchargement d’un PDF en production :

1. **Récupérer le code affiché** : l’UI affiche « Erreur PDF. Code: &lt;requestId&gt; » (ex. `b91c3602-b25c-40fe-ba08-5f71ad54499c`).
2. **Ouvrir les logs Vercel** : projet → Logs (ou Deployments → fonction → Logs). Filtrer ou rechercher par ce **requestId**.
3. **Interpréter les logs** :
   - **`[PDF]`** (info) : début de la requête (route, id, userId, role) ou succès (pdfshiftStatus 200, pdfshiftDurationMs, targetUrl).
   - **`[PDF_ERROR]`** avec **step: CONFIG** : `PDFSHIFT_API_KEY` manquante ou trop courte, ou APP_URL manquante/localhost sur Vercel. Vérifier les variables d’environnement (Production) et redéployer.
   - **`[PDF_ERROR]`** avec **step: PDFSHIFT_CALL** : erreur côté PDFShift (status HTTP, durationMs, bodyPreview). Causes possibles : clé API invalide (401/403), quota, domaine interdit, timeout ou erreur sur l’URL cible (targetUrl). Contacter support@pdfshift.io avec le requestId si besoin.
   - **`[PDF_ERROR]`** avec **step: ROUTE** : exception dans la route (ex. Chromium indisponible en local, autre erreur serveur). Le champ `error` contient le message sans stack.

Les réponses 500 ne renvoient jamais la stack ni le détail brut PDFShift ; uniquement `{ error, requestId }` pour tracer dans les logs.

---

## 8. Résumé des risques actuels

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| Listes sans pagination | Moyenne | PR2 : take/skip ou cursor |
| Exports chargent tout | Haute (gros volume) | PR3 : stream / pagination |
| Tris/filtres sans index | Moyenne | PR1 : index (déjà proposés) |
| Dashboard include lourd | Moyenne | PR2 : select réduit, agrégations si besoin |
| Connexions serverless | Faible si pooling | DATABASE_URL pooled + DIRECT_URL |
