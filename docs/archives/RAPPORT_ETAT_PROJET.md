# 📊 ÉTAT DU PROJET - RAPPORT COMPLET

**Projet :** tactac (DOUMA Dental Manager)  
**Version :** 0.1.0  
**Date du rapport :** Janvier 2025

---

## 1. 📁 Structure du projet

### Arborescence principale

```
tactac/
├── app/                          # Application Next.js (App Router)
│   ├── actions/                  # Server Actions (16 fichiers .ts)
│   │   ├── admin-orders.ts
│   │   ├── admin-payments.ts
│   │   ├── admin-settings.ts
│   │   ├── admin.ts
│   │   ├── auth.ts
│   │   ├── client-request.ts
│   │   ├── client.ts
│   │   ├── company-settings.ts
│   │   ├── delivery-agent.ts
│   │   ├── delivery.ts
│   │   ├── invitation.ts
│   │   ├── invite.ts
│   │   ├── order.ts
│   │   ├── product.ts
│   │   ├── stock.ts
│   │   └── user.ts
│   ├── admin/                    # Espace administrateur
│   │   ├── audit/                # Audit logs + emails
│   │   ├── clients/              # Gestion clients (liste, [id], invite)
│   │   ├── dashboard/
│   │   ├── delivery-agents/
│   │   ├── invoices/             # Factures (liste, [id], print)
│   │   ├── orders/                # Commandes (liste, [id], BL, modals)
│   │   ├── products/             # Produits (liste, [id], new)
│   │   ├── requests/              # Demandes clients
│   │   ├── settings/             # Admin + Company settings
│   │   ├── stock/                 # Stock + mouvements
│   │   ├── users/                 # Comptables, magasiniers
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/                      # Routes API
│   │   ├── admin/                # backup, export (clients, invoices, orders), stats/alerts
│   │   ├── auth/                 # login, logout
│   │   ├── delivery/             # agents, orders-count
│   │   ├── favorites/
│   │   ├── health/
│   │   ├── pdf/                  # admin + portal (invoices, delivery-note)
│   │   └── upload/               # company-logo, product-image
│   ├── components/               # Composants partagés (Print, PDF, Pagination, etc.)
│   ├── comptable/                # Espace comptable (dashboard, invoices, orders, payments)
│   ├── delivery/                 # Espace livreur (page, layout, modals)
│   ├── forgot-password/
│   ├── invite/[token]/
│   ├── lib/                      # Utilitaires app (orderNumber, tax, pricing, etc.) + __tests__
│   ├── login/
│   ├── magasinier/                # Espace magasinier (dashboard, orders, stock)
│   ├── portal/                   # Portail client (catalogue, panier, commandes, factures, demandes)
│   ├── reset-password/[token]/
│   ├── error.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── components/                   # Layouts par rôle
│   ├── admin/                    # Sidebar, AdminMobileHeader
│   ├── comptable/
│   └── magasinier/
├── lib/                          # Bibliothèques partagées
│   ├── api-guards.ts
│   ├── audit-email.ts
│   ├── audit-security.ts
│   ├── audit.ts
│   ├── auth.ts
│   ├── email-audit.ts
│   ├── email.ts
│   ├── excel.ts
│   ├── prisma.ts
│   ├── rate-limit-middleware.ts
│   └── rate-limit.ts
├── prisma/
│   ├── migrations/               # 12 migrations SQL + migration_lock.toml
│   ├── schema.prisma
│   ├── schema.postgresql.prisma.example
│   └── seed.ts
├── public/
├── scripts/                      # ~29 scripts (backup, reset password, migrations, etc.)
├── tests/
│   ├── e2e/                      # 24 specs Playwright
│   ├── helpers/
│   ├── integration/
│   ├── setup.ts
│   └── README.md
├── docs/                         # Documentation (guides, vérifications)
├── .env.example, .env.production.example
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── (nombreux .md de suivi : PROJET_STATUS, PHASE1_SECURITE, etc.)
```

### Architecture globale

- **Framework :** Next.js 16 (App Router), React 19
- **Base de données :** SQLite via Prisma
- **Auth :** Sessions JWT (lib/auth.ts), rôles : ADMIN, CLIENT, COMPTABLE, MAGASINIER
- **Pattern :** Server Components par défaut, Server Actions pour mutations, Client Components pour formulaires/interactivité
- **Emails :** Resend (lib/email.ts), expéditeur depuis CompanySettings
- **Styles :** Tailwind CSS v4

---

## 2. 🔧 Analyse technique

### Dépendances (package.json)

| Catégorie        | Package           | Version   |
|------------------|-------------------|-----------|
| Runtime          | next              | 16.1.6    |
|                  | react             | 19.2.1    |
|                  | @prisma/client    | ^5.22.0   |
|                  | prisma            | ^5.22.0   |
| Auth / Utils     | bcryptjs          | ^3.0.3    |
|                  | jose              | ^6.1.3    |
|                  | zod               | ^4.3.5    |
| UI / Data        | lucide-react      | ^0.561.0  |
|                  | react-hot-toast   | ^2.6.0    |
|                  | xlsx              | ^0.18.5   |
| Email            | resend            | ^6.7.0    |
| Autres           | date-fns, dotenv, clsx, tailwind-merge, sharp | diverses |

### DevDependencies

- **Tests :** Vitest ^4.0.17, @vitest/ui, Playwright ^1.57.0, @playwright/test ^1.57.0  
- **Testing Library :** @testing-library/react, @testing-library/jest-dom, @testing-library/user-event  
- **Lint / Config :** eslint ^9, eslint-config-next 16.1.6  
- **Types :** @types/node, @types/react, @types/react-dom, @types/bcryptjs, etc.  
- **Build :** tailwindcss ^4, @tailwindcss/postcss ^4, typescript ^5, tsx ^4.21.0  

### Configuration

- **tsconfig.json**  
  - `strict: true`, `paths: { "@/*": ["./*"] }`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`.

- **next.config.ts**  
  - Réduit les logs des requêtes entrantes en dev ; pas de config Turbopack/Webpack particulière.

- **eslint.config.mjs**  
  - Basé sur `eslint-config-next` (core-web-vitals + typescript).

- **vitest.config.ts**  
  - `environment: jsdom`, `setupFiles: ['./tests/setup.ts']`, include `**/*.{test,spec}.{ts,tsx}`, exclude `tests/e2e/**`.

- **Prisma**  
  - Provider SQLite, seed via `tsx prisma/seed.ts`.

---

## 3. 📂 Analyse du code

### Patterns d’architecture

1. **App Router Next.js**  
   - Pages en Server Components, données via `prisma` dans la page ou layout.  
   - Formulaires et UI interactive en Client Components avec `'use client'`.

2. **Server Actions**  
   - Mutations centralisées dans `app/actions/*.ts` (ordre, client, produit, stock, livraison, auth, etc.).  
   - Validation (Zod où utilisé), audit (lib/audit.ts), revalidatePath.

3. **Accès données**  
   - Prisma singleton `lib/prisma.ts`, pas de couche repository dédiée.

4. **Sécurité**  
   - `getSession()` (lib/auth.ts) sur les pages et APIs sensibles.  
   - Redirection par rôle (admin, comptable, magasinier, portal).  
   - Rate limiting (lib/rate-limit.ts, lib/rate-limit-middleware.ts).  
   - Audit (lib/audit.ts, lib/audit-email.ts).

5. **Emails**  
   - `lib/email.ts` : `getCompanyInfo()` (CompanySettings) pour l’expéditeur, `sendEmail()` avec audit, mode debug si pas de RESEND_API_KEY.  
   - Types : ORDER_CONFIRMATION, ORDER_STATUS_UPDATE, INVOICE_NOTIFICATION, CLIENT_INVITATION, PASSWORD_RESET.

### Modules principaux

| Module           | Rôle |
|------------------|------|
| app/actions/order.ts | Création/modification commandes, approbation, envoi email confirmation |
| app/actions/admin-orders.ts | Changement statut, expédition, livraison, réassignation livreur |
| app/actions/admin-payments.ts | Paiements, mise à jour solde client |
| app/actions/product.ts | CRUD produits, unicité SKU |
| app/actions/client.ts | CRUD clients, unicité clientCode |
| app/actions/delivery.ts | Confirmation livraison (code client) |
| lib/auth.ts | Sessions JWT, getSession |
| lib/audit.ts | createAuditLog, types d’actions |
| lib/email.ts | sendEmail, sendOrderConfirmationEmail, etc. |
| lib/prisma.ts | Instance Prisma |
| app/lib/*.ts | orderNumber, tax, pricing, invoice-utils, sequence, delivery-code, invoice-lock |

### Modèles Prisma (17)

User, Invitation, PasswordResetToken, Product, ProductPrice, StockMovement, Order, OrderItem, DeliveryNote, Invoice, GlobalSequence, Payment, AdminSettings, CompanySettings, FavoriteProduct, ClientRequest, AuditLog.

---

## 4. ✅ Statut des fonctionnalités

### Fonctionnel (aligné avec PROJET_STATUS.md et structure actuelle)

- Authentification (login, rôles, invitation, reset password).  
- Gestion clients (CRUD, segment, remise, plafond crédit, clientCode).  
- Catalogue produits (CRUD, SKU, prix par segment, stock, upload image).  
- Portail client (catalogue, panier, crédit, commandes, factures, demandes contact).  
- Commandes (création, statuts, approbation marge, numérotation CMD/BL).  
- Facturation (création à la livraison, numérotation FAC, paiements, verrouillage).  
- Bons de livraison (génération, PDF).  
- Espaces admin, comptable, magasinier, livreur (delivery).  
- Paramètres (AdminSettings, CompanySettings).  
- Audit (logs, emails).  
- Exports Excel (commandes, clients, factures).  
- PDF (factures, BL) admin + portail.  
- Rate limiting, backups API.

### En développement / à compléter

- **tests/integration/order-workflow.test.ts** : 10 `// TODO: Implement test` (tests non implémentés).  
- Aucun FIXME/HACK repéré dans le code ; quelques placeholders "XXX" dans libellés (ex. téléphone "+212 6XX XXX XXX").

### Tests existants

- **E2E (Playwright)** : 24 specs dans `tests/e2e/` (auth, workflow commande, livraison, approbation admin, verrou facture, PDF, rate limit, backups, etc.).  
- **Unitaires (Vitest)** : `app/lib/__tests__/` — invoice-utils.test.ts, pricing.test.ts, sequence.test.ts, tax.test.ts.  
- **Setup** : `tests/setup.ts`, `vitest.config.ts` avec jsdom.

---

## 5. ⚠️ Problèmes potentiels

### Typage

- **~164 occurrences de `any`** (ou `as any`) dans `app/` (60 fichiers), notamment dans :
  - `app/actions/order.ts` (26)
  - `app/actions/admin-orders.ts` (19)
  - `app/actions/product.ts` (8)
  - `app/actions/client.ts`, `app/actions/auth.ts`, etc. (quelques-unes par fichier).  
- Risque : perte de sécurité TypeScript et refactors plus fragiles. Recommandation : remplacer progressivement par des types précis (interfaces, types Prisma, Zod).

### Imports / build

- Aucune erreur de compilation ou import manquant évident d’après l’analyse (tsconfig strict, alias `@/*` cohérent).  
- Lint : config Next.js standard ; pas de vérification des lints exécutée dans ce rapport.

### Pratiques / risques

1. **Session / typage** : `session as any` dans certains appels audit ou guards ; à typer (ex. type `Session` ou type dérivé de getSession).  
2. **where: any** : clauses Prisma dynamiques en `any` dans quelques pages (filtres) ; préférer des types dérivés de Prisma ou Zod pour les filtres.  
3. **Mode email** : si `RESEND_API_KEY` absent ou factice, les emails sont simulés (audit seulement) ; bien documenté sur la page Audit emails.  
4. **SQLite** : adapté au développement et petites prod ; pour plus de charge ou multi-process, une migration PostgreSQL est prévue (schema.postgresql.prisma.example présent).  
5. **Migrations Prisma** : présence de migrations ; en prod, exécuter `prisma migrate deploy` après déploiement.

### Sécurité

- Authentification et redirections par rôle en place.  
- Rate limiting sur login et PDF.  
- Audit des actions sensibles.  
- Pas de stockage de secrets en clair repéré (utilisation de variables d’environnement).

---

## 6. 📋 Synthèse

| Critère              | État |
|----------------------|------|
| Structure du projet  | ✅ Claire, App Router, séparation actions/api/pages par rôle |
| Dépendances          | ✅ À jour (Next 16, React 19, Prisma 5) |
| Configuration        | ✅ TypeScript strict, ESLint Next, Vitest + Playwright |
| Modèles données      | ✅ 17 modèles Prisma, migrations présentes |
| Fonctionnalités métier | ✅ Couverture large (commandes, facturation, livraison, clients, produits, audit) |
| Tests                | ✅ E2E Playwright étendus ; unitaires sur lib ; intégration à compléter (TODOs) |
| Typage               | ⚠️ Nombreuses utilisations de `any` à réduire |
| Documentation        | ✅ Nombreux .md (PROJET_STATUS, docs/, guides) |

**Conclusion :** Le projet est structuré, opérationnel pour un usage type “gestion dentaire” (commandes, facturation, livraison, multi-rôles), avec une bonne couverture E2E et des utilitaires testés. Les principaux axes d’amélioration sont le typage (réduction de `any`) et la finalisation des tests d’intégration (order-workflow).
