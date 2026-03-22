# AGENTS.md

## Cursor Cloud specific instructions

### Overview

DOUMA Dental Manager ("TacTac") is a Next.js 16 dental supply management platform (French UI). Single app with role-based dashboards: Admin, Comptable, Magasinier, Commercial, Client portal, Delivery agent.

### Services

| Service | How to run | Notes |
|---|---|---|
| PostgreSQL 15 | `sudo docker compose up -d` (from repo root) | Required. Docker must be running first (`sudo dockerd`). |
| Next.js dev server | `npm run dev` | Listens on `0.0.0.0:3000`. |

### Key commands

See `package.json` for the full list. Highlights:

- **Lint**: `npm run lint` (warnings uniquement ; 0 erreur bloquante)
- **Unit + integration tests**: `npm run test:run` (Vitest ; ~132 tests, 12 fichiers)
- **E2E tests**: `npm run test:e2e` (Playwright; requires `npx playwright install --with-deps chromium` first). CI: `npm run test:e2e:ci` (80 passent, 7 skippés)
- **DB push**: `npm run db:push` (syncs Prisma schema to PostgreSQL)
- **DB seed**: `npm run db:seed` (creates demo users + 5 products)
- **DB seed E2E**: `npm run db:seed:e2e` (E2E_SEED=1 ; passwords connus, INV-E2E-0001, CMD-E2E-PREPARED, CMD-E2E-DELIVERED)
- **DB reset**: `npm run db:reset` (wipes and re-seeds)

### Demo accounts (from seed)

- Admin: `admin@douma.com` / `password` (E2E seed: idem)
- Comptable: `compta@douma.com` / `password`
- Magasinier: `stock@douma.com` / `password`
- Commercial: `commercial@douma.com` / `password`
- Livreur: `livreur@douma.com` / `password`
- Client: `client@dental.com` / `password123` (E2E seed)

### Environment setup gotchas

- The `.env` file must have `DATABASE_URL` and `DIRECT_URL` pointing to the PostgreSQL instance (Docker Compose uses `postgresql://douma:password@localhost:5432/douma_dental?schema=public`).
- `JWT_SECRET` must be set in `.env` for authentication to work.
- Docker runs inside a nested container (Firecracker VM). Requires `fuse-overlayfs` storage driver and `iptables-legacy`. Start Docker daemon with `sudo dockerd &>/tmp/dockerd.log &`.
- The `postinstall` script runs `prisma generate` automatically on `npm install`.
- Health check endpoint: `GET /api/health` returns DB connection status and user/order counts.

### Déploiement et migrations (Vercel / preview / production)

- Le script **`npm run build`** lance `prisma generate` puis `next build` : il **n’applique pas** les migrations SQL sur la base distante.
- Après un merge qui ajoute des fichiers sous **`prisma/migrations/`**, exécuter sur **chaque** base concernée (preview, production, etc.) : **`npm run db:migrate:deploy`** (équivalent `npx prisma migrate deploy`) avec **`DATABASE_URL`** / **`DIRECT_URL`** pointant vers cette base (en local en surchargeant l’env, ou depuis la machine / CI ayant accès à l’URL Postgres).
- Sans cette étape, le build Vercel peut réussir alors que l’app échoue au runtime (colonnes ou tables manquantes).

### Numérotation ERP (documents métier)

**Format unifié pour les nouveaux numéros** générés par l’app : `PREFIX-ANNÉE-NNNN` (4 chiffres séquentiels par année, réinitialisation à chaque année civile).

| Préfixe | Document |
|---------|----------|
| `CMD` | Commande client |
| `FAC` | Facture |
| `BL` | Bon de livraison |
| `PO` | Commande fournisseur |
| `SUP` | Code fournisseur (séquence globale, pas calée sur l’année) |

Exemples : `CMD-2026-0001`, `FAC-2026-0003`, `BL-2026-0002`, `PO-2026-0001`.

- **Implémentation** : `app/lib/sequence.ts` (`getNextOrderNumber`, `getNextInvoiceNumber`, `getNextDeliveryNoteNumber`, `getNextPurchaseOrderNumber`, etc.) ; compteurs dans `GlobalSequence` par clé du type `ORDER-2026`, `INVOICE-2026`, …
- **Données déjà en base** : les anciens formats (ex. `FAC-20260312-0002`, `CMD-YYYYMMDD-NNNN`) **restent inchangés** ; seuls les **nouveaux** enregistrements utilisent le format `PREFIX-YYYY-NNNN`.
- **BL / FAC / devis PDF** dérivés du n° commande : `parseCmdOrderNumber` accepte encore **`CMD-YYYYMMDD-NNNN`** (historique) et **`CMD-YYYY-NNNN`** (nouveau), pour garder la cohérence BL/FAC/DEV avec la commande.

### Template facture PDF (base figée)

Le template `app/components/invoice-pdf/` est la **base officielle** du rendu facture.  
**Ne pas modifier le design** sauf bug réel. Règles et constantes : **docs/TEMPLATE_FACTURE_PDF.md**.  
Sert de référence pour futurs documents (devis, BL, avoir, reçu).
