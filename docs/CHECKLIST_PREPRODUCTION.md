# Checklist pré-production

À cocher avant chaque déploiement en production.

## Sécurité
- [ ] `JWT_SECRET` fort et unique (≥ 32 octets), jamais commité
- [ ] `ADMIN_PASSWORD` défini et fort pour le seed
- [ ] Rate limiting actif sur login, export, PDF
- [ ] Routes API admin/client protégées par un guard d’auth
- [ ] Validation des entrées (Zod) sur les routes sensibles
- [ ] Aucune injection SQL (pas de `queryRawUnsafe` avec entrée utilisateur)

## Base de données
- [ ] PostgreSQL en prod (pas SQLite)
- [ ] Migrations avec `prisma migrate deploy` (pas `db push`)
- [ ] Backup configuré si nécessaire

## Configuration
- [ ] `NEXT_PUBLIC_APP_URL` = URL de production
- [ ] `NODE_ENV=production`
- [ ] Fichiers `.env` non commités

## Build et runtime
- [ ] `npm run build` réussit
- [ ] `/api/health` retourne 200
- [ ] Logs sans données sensibles

## Tests
- [ ] Lint et build passent en CI
- [ ] Tests E2E passent
- [ ] Smoke manuel (login admin, client, commande, facture)

## UX
- [ ] États de chargement sur pages critiques
- [ ] Messages d’erreur clairs
