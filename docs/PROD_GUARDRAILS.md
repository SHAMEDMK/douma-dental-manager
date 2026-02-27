# Guardrails sécurité production

Détection centralisée de la prod (`VERCEL_ENV === 'production'`) et protections pour éviter les actions destructrices par erreur.

## Fichiers concernés

| Fichier | Rôle |
|--------|------|
| `lib/env.ts` | Helper `isProd()` + `logProdBlocked()` + `requireProdFlagOrThrow()` |
| `prisma/seed.ts` | Refus du seed en prod sauf si `ALLOW_PROD_SEED=true` |
| `scripts/guard-prod.js` | Blocage de `db:reset` et `db:push` en prod |
| `package.json` | Scripts `db:reset` et `db:push` passent par le guard |

## Comportement

- **Seed** : En prod (`VERCEL_ENV=production`), le seed lance une erreur et un log explicite sauf si `ALLOW_PROD_SEED=true`.
- **db:reset / db:push** : En prod, les scripts npm appellent d’abord `guard-prod.js` qui sort en erreur avec un message clair ; la commande Prisma n’est pas exécutée.
- **Logs** : Chaque blocage logue : action bloquée, environnement, variable manquante ou consigne (« À la place »).

## Tester localement

### Seed bloqué en prod (sans flag)

```powershell
$env:VERCEL_ENV='production'; npx tsx prisma/seed.ts
# Attendu: erreur "[PROD] seed refusé" + log [PROD GUARD]
```

### Seed autorisé en prod (avec flag)

```powershell
$env:VERCEL_ENV='production'; $env:ALLOW_PROD_SEED='true'; npx tsx prisma/seed.ts
# Attendu: seed s'exécute
```

### Seed en staging / E2E (sans VERCEL_ENV=production)

```powershell
# Sans VERCEL_ENV ou VERCEL_ENV=preview
npx tsx prisma/seed.ts
# ou
$env:E2E_SEED='1'; npx tsx prisma/seed.ts
# Attendu: seed s'exécute
```

### db:reset bloqué en prod

```powershell
$env:VERCEL_ENV='production'; npm run db:reset
# Attendu: message [PROD GUARD], exit 1, prisma migrate reset non exécuté
```

### db:reset autorisé en dev

```powershell
# Sans VERCEL_ENV (ou VERCEL_ENV=development)
npm run db:reset
# Attendu: prisma migrate reset s'exécute (si base locale)
```
