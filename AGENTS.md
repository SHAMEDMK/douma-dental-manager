# AGENTS.md

## Cursor Cloud specific instructions

### Overview

DOUMA Dental Manager ("TacTac") is a Next.js 16 dental supply management platform (French UI). Single app with role-based dashboards: Admin, Comptable, Magasinier, Client portal, Delivery agent.

### Services

| Service | How to run | Notes |
|---|---|---|
| PostgreSQL 15 | `sudo docker compose up -d` (from repo root) | Required. Docker must be running first (`sudo dockerd`). |
| Next.js dev server | `npm run dev` | Listens on `0.0.0.0:3000`. |

### Key commands

See `package.json` for the full list. Highlights:

- **Lint**: `npm run lint` (pre-existing 8 errors from React hooks violations in PDF code; 438 warnings)
- **Unit tests**: `npm run test:run` (Vitest; 1 pre-existing failure in `tests/integration/order-workflow.test.ts` due to incomplete Prisma mock)
- **E2E tests**: `npm run test:e2e` (Playwright; requires `npx playwright install --with-deps chromium` first)
- **DB push**: `npm run db:push` (syncs Prisma schema to PostgreSQL)
- **DB seed**: `npm run db:seed` (creates demo users + 5 products)
- **DB reset**: `npm run db:reset` (wipes and re-seeds)

### Demo accounts (from seed)

- Admin: `admin@douma.com` / `password`
- Comptable: `compta@douma.com` / `password`
- Magasinier: `stock@douma.com` / `password`
- Commercial: `commercial@douma.com` / `password`
- Livreur: `livreur@douma.com` / `password`
- Client: `client@dental.com` / `password`

### Environment setup gotchas

- The `.env` file must have `DATABASE_URL` and `DIRECT_URL` pointing to the PostgreSQL instance (Docker Compose uses `postgresql://douma:password@localhost:5432/douma_dental?schema=public`).
- `JWT_SECRET` must be set in `.env` for authentication to work.
- Docker runs inside a nested container (Firecracker VM). Requires `fuse-overlayfs` storage driver and `iptables-legacy`. Start Docker daemon with `sudo dockerd &>/tmp/dockerd.log &`.
- The `postinstall` script runs `prisma generate` automatically on `npm install`.
- Health check endpoint: `GET /api/health` returns DB connection status and user/order counts.
