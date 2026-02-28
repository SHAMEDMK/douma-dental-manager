# Snapshot technique — Douma Dental Manager (finalisation production)

Document de référence pour audit et mise en production.

---

## 1) STACK TECHNIQUE

| Élément | Version / choix |
|--------|------------------|
| **Framework** | Next.js 16.1.6 (App Router) |
| **TypeScript** | ^5 |
| **Prisma** | ^5.22.0 |
| **Base de données** | PostgreSQL (Neon ou autre ; `DATABASE_URL` + `DIRECT_URL`) |
| **Auth** | Custom JWT (jose) — cookies `session` httpOnly, pas next-auth |
| **State management** | React state local + Server Actions ; pas Redux/Zustand global |
| **UI** | React 19, Tailwind CSS 4, Lucide React, react-hot-toast |
| **Librairies importantes** | exceljs (export Excel), bcryptjs (mots de passe), zod (validation), date-fns, resend (email), sharp (images) |
| **Rate limiting** | In-memory (`lib/rate-limit.ts` + `lib/rate-limit-middleware.ts`) — à remplacer par Redis en multi-instance |
| **Audit** | `lib/audit.ts` + `AuditLog` Prisma ; `lib/audit-security.ts` (événements sécurité) |

---

## 2) ARCHITECTURE

### Arborescence simplifiée

```
tactac/
├── app/                    # Next.js App Router
│   ├── actions/            # Server Actions (admin-orders, admin-payments, auth, order, delivery, etc.)
│   ├── admin/              # Back-office (layout + getSession, redirect si non ADMIN/COMMERCIAL)
│   ├── api/                # Routes API (auth, export, pdf, delivery, favorites, health, upload)
│   ├── comptable/          # Espace comptable (layout propre)
│   ├── delivery/           # Espace livreur (MAGASINIER userType LIVREUR)
│   ├── lib/                # Utilitaires métier (invoice-utils, tax, invoice-lock, accounting-close, etc.)
│   ├── login/
│   ├── magasinier/         # Espace magasinier (stock)
│   ├── portal/             # Espace client (CLIENT)
│   └── components/
├── lib/                    # Partagé (auth, prisma, audit, rate-limit, excel, api-guards)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── scripts/                # Scripts DB / E2E (set-accounting-close-e2e, backup, etc.)
├── tests/
│   ├── e2e/                # Playwright (auth.setup, specs par module)
│   ├── global-setup.ts
│   └── helpers/
└── components/              # Composants partagés (admin Sidebar, etc.)
```

### Séparation des responsabilités

- **app/actions/** — Mutations métier : commandes, paiements, livraison, auth, paramètres. Vérifications RBAC et clôture comptable dans les actions.
- **app/lib/** — Logique métier côté app (factures, TVA, verrou facture, clôture comptable).
- **lib/** — Auth (JWT, getSession), Prisma, audit, rate-limit, guards API, Excel.
- **prisma/** — Schéma, migrations, seed.

### Où sont gérées les fonctionnalités transverses

| Fonctionnalité | Emplacement |
|----------------|-------------|
| **Auth** | `lib/auth.ts` (JWT, cookies). Layouts `app/admin/layout.tsx`, `app/portal/layout.tsx`, `app/comptable/`, `app/delivery/`, `app/magasinier/` : `getSession()` + redirect si non autorisé. |
| **RBAC** | Layouts par rôle ; API : `lib/api-guards.ts` (`requireAdminAuth`, `requireClientAuth`). Actions : `getSession()` + vérification `session.role`. |
| **Rate limit** | `lib/rate-limit.ts` (in-memory) ; `lib/rate-limit-middleware.ts` (`withRateLimit`). Utilisé sur login, PDF, exports, favorites, health, backup. |
| **Audit logs** | `lib/audit.ts` (`createAuditLog`) ; `lib/audit-security.ts` (sécurité / rate limit). Modèle `AuditLog` (action, entityType, entityId, userId, details, etc.). |
| **Accounting close** | `app/lib/accounting-close.ts` (`isAccountingClosedFor`, `assertAccountingOpen`). Utilisé dans `admin-orders.ts`, `admin-payments.ts`, `order.ts` avant modifications facture/paiement. |
| **Invoice lock** | `app/lib/invoice-lock.ts` (`isInvoiceLocked`, `canModifyOrder`, `canModifyInvoiceAmount`). Utilisé dans actions et UI (admin/portal) pour bloquer modifications. |

---

## 3) SCHÉMA PRISMA — MODÈLES PRINCIPAUX

| Modèle | Rôle principal |
|--------|----------------|
| **User** | id, email, passwordHash, role (ADMIN, CLIENT, COMPTABLE, MAGASINIER, COMMERCIAL), userType (MAGASINIER/LIVREUR), name, clientCode, segment, discountRate, balance, creditLimit, coordonnées. |
| **Order** | id, userId, orderNumber, deliveryNoteNumber, status (CONFIRMED, PREPARED, SHIPPED, DELIVERED, CANCELLED), total, requiresAdminApproval, infos livraison, deliveryAgentId, deliveredToName, deliveryConfirmationCode, etc. |
| **OrderItem** | orderId, productId, productVariantId, quantity, priceAtTime, costAtTime. |
| **Invoice** | id, orderId (unique), invoiceNumber, status (UNPAID, PARTIAL, PAID, CANCELLED), amount, balance, paidBy, lockedAt, paidAt. |
| **Payment** | id, invoiceId, amount, method (CASH, CHECK, TRANSFER, COD, CARD), reference, createdBy. |
| **CompanySettings** | id 'default', name, address, city, country, ice, vatRate, paymentTerms, bankName, rib, **accountingLockedUntil** (clôture comptable). |
| **AdminSettings** | id 'default', règles d’approbation (marge négative, seuil, message), blockWorkflowUntilApproved. |
| **AuditLog** | action, entityType, entityId, userId, userEmail, userRole, details (JSON), ipAddress, userAgent, createdAt. |
| **Product / ProductVariant / ProductPrice / StockMovement** | Catalogue, prix par segment, stock. |
| **DeliveryNote** | Lien order → bon de livraison (number). |
| **GlobalSequence** | Numérotation (ORDER-YYYY, INVOICE-YYYY, DELIVERY-YYYY). |

---

## 4) WORKFLOWS MÉTIERS

### Workflow commande

- **CONFIRMED** → **PREPARED** (génération BL si absent) → **SHIPPED** (assignation livreur, code confirmation) → **DELIVERED** (confirmation livraison : deliveredToName, etc.).
- Transitions validées dans `admin-orders.ts` (`updateOrderStatus`, `markOrderShippedAction`, `markOrderDeliveredAction`). Préparer / Expédier peuvent être bloqués par `requiresAdminApproval` (AdminSettings) ; approbation via `approveOrderAction`.
- Annulation possible depuis CONFIRMED ou PREPARED.

### Workflow facture

- Création automatique à la livraison (DELIVERED) ou selon règles métier. Numéro séquentiel (sequence).
- Statuts : UNPAID → PARTIAL (paiements partiels) → PAID. Verrouillage : dès premier paiement (`lockedAt`) ou statut PARTIAL/PAID ; plus de modification des montants/lignes (`invoice-lock`).

### Workflow paiement

- Enregistrement via `markInvoicePaid` (admin-orders) ou actions admin-payments. Vérifications : clôture comptable (`assertAccountingOpen`), solde restant, mise à jour statut facture et balance client. Audit `PAYMENT_RECORDED`.

### Workflow livraison

- **Expédier** : choix du livreur (deliveryAgentId), génération `deliveryConfirmationCode`. **Livrer** : saisie deliveredToName, code de confirmation (optionnel), passage à DELIVERED ; création facture si applicable.

### Workflow clôture comptable

- `CompanySettings.accountingLockedUntil` : date limite ; toute entité dont la date (ex. `invoice.createdAt`) ≤ cette date ne peut plus être modifiée (paiement, modification facture, etc.). Vérification dans admin-orders, admin-payments, order via `assertAccountingOpen`. Message utilisateur : « PÉRIODE COMPTABLE CLÔTURÉE : modification interdite. »

**Note (dates invalides, compta/prod)** : Toute date invalide (`entityDate` ou `accountingLockedUntil`) déclenche une erreur explicite dans `app/lib/accounting-close.ts` (comportement *fail closed*) : objectif éviter toute modification accidentelle en prod. Les dates utilisées en tests et E2E (script `set-accounting-close-e2e`, specs) doivent être en **ISO UTC** (ex. `2024-01-15T12:00:00.000Z`) pour un comportement déterministe.

---

## 5) SÉCURITÉ

### Guards API

- **requireAdminAuth(request, allowedRoles)** — `lib/api-guards.ts`. 401 si non authentifié, 403 si rôle non dans la liste. Rôles typés : ADMIN, COMPTABLE, MAGASINIER.
- **requireClientAuth(request)** — CLIENT uniquement.
- Utilisés sur : exports (admin), backup, stats/alerts, etc.

### Middlewares

- Aucun `middleware.ts` global. Contrôle d’accès par layout (getSession + redirect) et par route API (guards).

### Vérifications de rôle

- Layouts : admin (ADMIN ou COMMERCIAL), comptable, delivery, magasinier, portal (accès client).
- Server Actions : `getSession()` puis vérification `session.role` (ADMIN, COMPTABLE, etc.) selon l’action.

### Période clôturée

- `assertAccountingOpen(entityDate, accountingLockedUntil)` avant toute modification impactant une facture/paiement en période clôturée. Retour erreur côté action ; message affiché dans l’UI (ex. formulaire paiement).

### Facture verrouillée

- `isInvoiceLocked(invoice)` : lockedAt non null, ou statut PARTIAL/PAID, ou total payé > 0. Blocage modification commande/facture et suppression paiement dans admin-payments ; `canModifyOrder` dans order.ts pour modifications panier/commande.

### Audit (AuditLog)

- **AuditLog est protégé par trigger DB, append-only.** Une migration PostgreSQL (`audit_log_immutable`) ajoute un trigger `BEFORE UPDATE OR DELETE` sur la table `"AuditLog"` qui lève l’exception `AuditLog is immutable`. Même en contournant l’application, UPDATE et DELETE sont impossibles. Vérification : `npx tsx scripts/verify-auditlog-immutable.ts`.

---

## 6) EXPORTS EXCEL

**Les calculs d’export (HT, TVA, TTC, total payé, solde) sont centralisés dans `computeInvoiceTotals` (`app/lib/invoice-utils.ts`).** Les routes export (orders, invoices, payments) utilisent cette fonction unique ; aucun recalcul ad-hoc. TTC = HT + TVA (arrondi à 0,01 près).

| Route | Rôles autorisés | Rate limit | Colonnes principales |
|-------|------------------|------------|----------------------|
| **GET /api/admin/export/orders** | ADMIN, COMPTABLE, MAGASINIER | 10/min | Numéro commande, Date, Client, Email, Segment, Statut, Total HT, TVA (taux), TVA (Dh), Total TTC, BL, Facture, Statut facture |
| **GET /api/admin/export/invoices** | ADMIN, COMPTABLE | 10/min | Numéro facture, Date facture, Commande, Client, Email, Montant HT, TVA (taux), TVA (Dh), Montant TTC, Total payé, Solde restant, Statut, Date paiement |
| **GET /api/admin/export/payments** | ADMIN, COMPTABLE | 10/min | Date paiement, Client, Email, Facture, Commande, Montant, Mode, Référence, Statut facture, Facture verrouillée, TVA (taux), TVA (montant) (Dh) |
| **GET /api/admin/export/clients** | ADMIN | 10/min | Nom, Raison sociale, Email, Téléphone, Adresse, Ville, ICE, Segment, Remise %, Plafond crédit, Solde, Disponible, Total commandes, CA total, Date création |

Fichiers générés via `lib/excel.ts` (ExcelJS). Nom de fichier avec date du jour.

---

## 7) TESTS E2E

- **Environnement** : Playwright, globalSetup (seed E2E + script clôture), webServer `npm run dev`, baseURL 127.0.0.1:3000.
- **Projets** : auth-setup (sauvegarde sessions), admin (storageState .auth/admin.json), client (storageState .auth/client.json), no-auth (auth, rate-limit, api-admin-security).
- **Fichiers de spec** : 27 fichiers dans `tests/e2e/` (dont auth.setup.spec.ts, _template.spec.ts).
- **Couverture** : auth, accounting-close, admin-approval, audit-logs, backups, client-management, credit-limit, dashboard-admin, delivery-agents, delivery-workflow, filters-advanced, full-workflow-delivery, invoice-lock, order-workflow, payment-workflow, pdf-generation, product-management, rate-limit-login, rate-limit-pdf, settings-admin, smoke, stock-management, workflow-complet, workflow.order-to-prepared, api-admin-security.
- **Tests critiques** : auth.setup, accounting-close (période clôturée + livraison en période ouverte), invoice-lock, payment-workflow, order-workflow, delivery-workflow, credit-limit, admin-approval.
- **Fragilités connues** : accounting-close a été stabilisé (script clôture + vérification DB, dates fixes, exécution du script dans le test). Rate-limit et PDF dépendent des presets (LOGIN, PDF). Exports non couverts par E2E spécifiques (sécurisation testée via api-admin-security).

---

## 8) POINTS À FAIRE / TODO

- **tests/integration/order-workflow.test.ts** : Plusieurs `// TODO: Implement test` (cas non implémentés).
- **Rate limit** : In-memory ; en production multi-instance, prévoir Redis (ou équivalent) pour partager les compteurs.
- **Prisma** : Mise à jour majeure possible (5.22 → 7.x) ; à planifier avec prudence.

Aucun TODO/FIXME critique repéré dans les fichiers app/lib principaux.

---

## 9) CONFIGURATION ENV

| Variable | Usage | Production |
|----------|--------|------------|
| **DATABASE_URL** | Connexion PostgreSQL (pooled) | Requise, avec `sslmode=require` si Neon |
| **DIRECT_URL** | Connexion directe (migrations) | Requise |
| **JWT_SECRET** | Signature des sessions JWT | Requise, forte valeur (ex. openssl rand -base64 32) |
| **NODE_ENV** | development / production | production |
| **NEXT_PUBLIC_APP_URL** | URL publique de l’app | Requise (ex. https://...) |
| **ADMIN_PASSWORD** | Seed / reset admin | Optionnel en prod (ne pas utiliser le seed prod sans précaution) |
| **E2E_SEED** | Seed E2E (mots de passe connus) | À ne pas définir en prod ; utilisé uniquement par `npm run test:e2e` |

Fichier de référence : `.env.example`. Ne pas committer `.env` avec secrets.

---

## 10) RISQUES TECHNIQUES POTENTIELS

| Risque | Contexte | Recommandation |
|--------|----------|----------------|
| **Race conditions** | Paiements / mise à jour solde facture et client | Les mutations sensibles passent par des transactions Prisma (`prisma.$transaction`) ; vérifier que tous les chemins critiques sont couverts. |
| **Clôture comptable** | Script E2E modifie `accountingLockedUntil` et dates factures | En prod, désactiver ou sécuriser les scripts E2E ; clôture uniquement via une interface ou des scripts dédiés avec contrôle d’accès. |
| **Rate limit in-memory** | Perte des compteurs entre redémarrages ; non partagé entre instances | Pour plusieurs instances, déployer un rate limiter partagé (Redis). |
| **Sessions JWT** | Secret faible ou exposé | JWT_SECRET fort, rotation possible (invalider les anciennes sessions). |
| **Exports lourds** | Gros volumes commandes/factures/paiements | Rate limit déjà en place (10/min) ; surveiller timeouts et mémoire ; envisager jobs async si besoin. |
| **Transactions longues** | Très grosses transactions Prisma | Éviter de charger trop de relations dans une seule transaction ; découper si nécessaire. |
| **Audit / logs** | Échec d’écriture audit ne doit pas bloquer l’action | Les appels `createAuditLog` / `logSecurityEvent` sont déjà dans des try/catch pour ne pas faire échouer l’opération principale. |
| **Invoice lock** | Incohérence si facture modifiée en base sans passer par l’app | Toutes les modifications facture/commande passent par les actions qui vérifient `isInvoiceLocked` / `canModifyOrder`. |

---

## 11) DÉPLOIEMENT

### Hébergeur cible et modèle

- **Cible documentée dans le projet :** **Vercel** (Next.js serverless). Les procédures détaillées sont dans `docs/CHECKLIST_PRODUCTION_VERCEL.md` et `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md`.
- **Modèle d’exécution :** **Multi-instance** (Vercel = une invocation = une instance éphémère). Le rate limit actuel est **in-memory** donc **par instance** ; en prod Vercel il ne sera pas partagé entre requêtes. Acceptable pour limiter le bruteforce par requête ; pour un plafond global par IP, prévoir Redis (ou équivalent) plus tard.
- **Base de données :** PostgreSQL managée recommandée (Neon, Supabase, Railway, etc.) avec **pooling** pour DATABASE_URL (serverless) et **DIRECT_URL** sans pooling pour les migrations.

### Variables d’environnement (production)

À configurer dans **Vercel → Project → Settings → Environment Variables** (scope **Production**) :

| Variable | Obligatoire | Exemple / note |
|----------|-------------|----------------|
| `NODE_ENV` | Oui | `production` |
| `DATABASE_URL` | Oui | URL PostgreSQL **pooled** (ex. Neon « Pooled »). Option : `&connect_timeout=15` si timeouts (cold start). |
| `DIRECT_URL` | Oui | URL PostgreSQL **sans pooling** (ex. Neon « Direct »), pour `prisma migrate deploy`. |
| `JWT_SECRET` | Oui | Fort, 32+ caractères (ex. `openssl rand -base64 32`). |
| `NEXT_PUBLIC_APP_URL` | Oui | URL publique (ex. `https://ton-domaine.vercel.app` ou domaine custom). |
| `ADMIN_PASSWORD` | Pour seed | Mot de passe fort pour le premier admin (utilisé par `npm run db:seed`). Ne pas exposer en clair. |
| `RESEND_API_KEY` | Optionnel | Envoi d’emails (invitations, etc.). Si absent : pas d’envoi, log warning. |
| `RESEND_FROM` | Optionnel | Expéditeur (ex. `DOUMA <noreply@domaine.com>`). |
| `VERCEL_ENV` | Lecture seule | Vercel le met à `production` ; utile pour guardrails. |

**À ne pas définir en prod :** `E2E_SEED` (réservé aux tests E2E).

### Ordre des opérations (à chaque déploiement)

1. **Pré-déploiement (local)**  
   - Lint + build : `npm run lint` puis `npm run build`.  
   - Toutes les migrations sont **commitées** dans `prisma/migrations/` (jamais `db push` en prod).

2. **Migrations (une seule fois par déploiement, jamais en parallèle)**  
   Exécuter **avant** de pousser le nouveau code :
   ```bash
   # Avec .env ou .env.production pointant vers la DB prod (DATABASE_URL + DIRECT_URL)
   npx prisma migrate deploy
   ```
   - **Ne pas** lancer `migrate deploy` dans le build Vercel (risque d’exécution multiple).  
   - Option : le faire depuis un pipeline CI (étape 1 : migrate deploy ; étape 2 : trigger deploy Vercel).

3. **Seed (premier déploiement uniquement)**  
   Après création de la DB prod, une fois :
   ```bash
   # DATABASE_URL = prod
   npm run db:seed
   ```

4. **Déploiement**  
   - Push sur la branche liée à Vercel (souvent `main`) : `git push origin main`  
   - Ou Vercel Dashboard → Deployments → Redeploy.

5. **Post-déploiement**  
   Smoke 5 min (login, dashboard, liste commandes/factures, un workflow, PDF, 401/403 + rate limit).

### Commandes récap

| Contexte | Commande |
|----------|----------|
| Build (Vercel le fait automatiquement) | `prisma generate && next build` (défini dans `package.json` → `build`) |
| Migrations en prod | `npx prisma migrate deploy` (hors build, une fois par déploiement) |
| Seed initial prod | `npm run db:seed` (une fois, avec DATABASE_URL prod) |
| À ne jamais faire en prod | `prisma db push`, `prisma migrate reset` |

### Autres hébergeurs (VPS, Railway, Render, Fly)

- **Même liste de variables** (sans `VERCEL_ENV` si hors Vercel).  
- **Même ordre** : migrations (`prisma migrate deploy`) **avant** de mettre le nouveau code en ligne.  
- **VPS / mono-instance :** `npm run build` puis `npm start` (ou PM2) ; le rate limit in-memory est alors partagé sur cette instance.  
- **Railway / Render / Fly :** suivre leur doc (build = `prisma generate && next build`, start = `next start` ; migrations en step séparé ou au démarrage **une seule fois**).

---

*Document généré pour audit final et finalisation production — Douma Dental Manager (Tactac).*
