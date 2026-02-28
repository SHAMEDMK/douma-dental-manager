# Monitoring minimal (observabilité prod)

Logs structurés, request ID pour la corrélation, healthcheck et variables optionnelles.

## 1. Request ID (corrélation des logs)

- Les requêtes vers les **pages** (non-/api) reçoivent un request ID dans le **proxy** : soit fourni par le client via le header `x-request-id`, soit généré (UUID). Le proxy renvoie ce même ID dans la réponse via le header **`x-request-id`**.
- Pour les **routes API** : le proxy ne s’exécute pas (matcher exclut `/api`). Chaque route qui a besoin d’un request ID utilise `getRequestId(request)` (dans `lib/request-id.ts`) : réutilise le header `x-request-id` s’il est envoyé par le client/proxy, sinon génère un UUID. La route peut renvoyer l’ID dans la réponse (ex. `GET /api/health` le fait).
- À utiliser dans les logs d’erreur serveur (route, status, requestId) pour tracer une requête de bout en bout.

**Dans Vercel Logs :** filtrer ou rechercher par `requestId` (ou `x-request-id` dans les headers de réponse) pour suivre une requête précise.

## 2. Logging d’erreurs

- **Helper centralisé** : `logServerError({ route, method, status, requestId, error })` (dans `lib/logger.ts`).
- Ce qui est loggé :
  - Message court (route, method, status, requestId, error.name + error.message).
  - Pas de stack complète par défaut.
  - Erreurs Prisma : code (ex. `P2002`) + message court.
- **Stack trace** : définir **`DEBUG_STACK=1`** (env) pour que la stack soit incluse dans les logs. À utiliser uniquement en debug ou sur un court créneau en prod.

Ne jamais logger de secrets ni de tokens (session, invitation, etc.) dans ce helper.

## 3. Healthcheck

- **Endpoint** : `GET /api/health`
- **Réponse** : `{ ok: true, ts, env }` (et champ optionnel `db: 'ok'` si le check DB a réussi).
- **Check DB** : exécution d’un `SELECT 1` avec timeout court (3 s). En cas d’échec : `{ ok: false, ts, env, db: 'error' }` avec status 503.
- **Protection** :
  - Si **`HEALTHCHECK_TOKEN`** est défini en env : la requête doit contenir `Authorization: Bearer <HEALTHCHECK_TOKEN>` pour être acceptée (sinon 401 ou accès refusé selon implémentation). Avec token valide, pas de rate limit strict.
  - Si `HEALTHCHECK_TOKEN` n’est pas défini : l’endpoint reste accessible mais est soumis à un **rate limit** strict (ex. 30 req/min).

**Exemple d’appel (avec token configuré) :**
```bash
curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" https://votre-app.vercel.app/api/health
```

## 4. Variables d’environnement optionnelles

| Variable | Rôle |
|----------|------|
| `DEBUG_STACK` | `1` pour inclure la stack dans les logs d’erreur (`logServerError`). À n’activer qu’en debug ou temporairement en prod. |
| `HEALTHCHECK_TOKEN` | Secret optionnel pour protéger `GET /api/health`. Si défini, exiger `Authorization: Bearer <token>`. |

## 5. Vercel Logs – quoi regarder

- **Erreurs serveur** : rechercher les logs contenant `Server error`, `requestId`, et éventuellement `prismaCode` pour les erreurs Prisma.
- **Corrélation** : utiliser `x-request-id` (ou le champ `requestId` dans le log) pour grouper tous les logs d’une même requête.
- **Health** : surveiller les réponses 503 de `/api/health` et les logs associés (timeout DB, erreur Prisma, etc.).

## 6. Tests à relancer après changement

- Smoke + security headers :  
  `npx playwright test tests/e2e/smoke.spec.ts tests/e2e/api-admin-security.spec.ts`
- Pour couvrir aussi auth et PDF :  
  `npx playwright test tests/e2e/auth.spec.ts tests/e2e/pdf-generation.spec.ts tests/e2e/smoke.spec.ts`
