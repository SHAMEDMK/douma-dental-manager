# Smoke prod — Jour J (go-live)

Checklist exécutable le **jour du go-live** en production (Vercel + PostgreSQL). Déterministe, sécurisée, documentée. Aucun secret dans ce document ; tout est configurable via variables d’environnement Vercel.

**Référence :** `docs/GO_LIVE_PLAN_MAR_2026.md` · **Avant J :** `docs/SMOKE_STAGING_BEFORE_GO.md`

---

## Variables prod confirmées (sans valeurs)

Avant de lancer les opérations, vérifier en **Vercel → Project → Settings → Environment Variables** que les variables **Production** suivantes sont définies (ne pas noter les valeurs ici) :

- [ ] `NODE_ENV` = production
- [ ] `DATABASE_URL` (PostgreSQL, pooled)
- [ ] `DIRECT_URL` (sans pooling, migrations)
- [ ] `JWT_SECRET`
- [ ] `ADMIN_PASSWORD` (fort, unique)
- [ ] `NEXT_PUBLIC_APP_URL` ou `APP_URL` = URL prod
- [ ] Variables rate limit, Resend (si utilisés), etc.
- [ ] `EXPORT_MAX_ROWS` (optionnel ; ex. 20000 pour limiter les exports)

Aucune variable de staging ne doit être utilisée en Production.

---

## Ordre exact des opérations (Jour J)

| # | Action | Durée | Vérification |
|---|--------|-------|--------------|
| 1 | **Migrate deploy** : `npx prisma migrate deploy` (machine de confiance, env prod) | 1–3 min | Exit 0, pas d’erreur Prisma |
| 2 | **Deploy Vercel** : push branche connectée ou Redeploy depuis le dashboard | 3–8 min | Build Completed, Ready |
| 3 | **Smoke 5 min** : santé, login admin, RBAC, une commande, un PDF (voir ci‑dessous) | 5 min | Tous les points cochés |
| 4 | **Vérifications 15 min** : suivre `docs/VERIFICATIONS_IMMEDIATES_POST_GO.md` | 15 min | Auth, rôles, rate limit, flux, PDF |

**Règle :** une seule exécution de `migrate deploy` par déploiement. Ne pas déployer Vercel avant que la migration ait réussi.

---

## Smoke 5 min (détail)

- [ ] **Santé** : `GET /api/health` → **200** (ou 503 si DB indisponible ; si endpoint protégé par token, ne pas utiliser de secret ici — vérification manuelle ou script sans token).
- [ ] **Login** : connexion admin (compte prod) → redirection dashboard ou page d’accueil admin.
- [ ] **RBAC** : en tant que client, accès à une URL admin → **403** ou redirection.
- [ ] **Une commande** : ouvrir une commande existante (ou en créer une), affichage et statut cohérents.
- [ ] **Un PDF** : générer une facture PDF (admin) → téléchargement et ouverture OK, montants cohérents.

---

## Rollback (actions immédiates)

- [ ] **Vercel** : Dashboard → Deployments → sélectionner le **déploiement précédent** (avant le go-live) → **Promote to Production**. Vérifier que l’URL prod pointe sur l’ancienne version ; refaire un smoke rapide.
- [ ] **DB** : ne pas annuler de migration en prod sans procédure validée. En cas de migration cassante déjà appliquée, voir section 3.2 de `docs/GO_LIVE_PLAN_MAR_2026.md` (migration forward corrective).
- [ ] **Communication** : informer l’équipe et les utilisateurs si rollback effectué ; documenter la cause et le correctif.

---

## Observabilité (où regarder)

- **Logs Vercel** : Project → Logs, filtrer **Production**. Vérifier erreurs 5xx, timeouts, messages Prisma (connexion, pool).
- **5xx / timeouts** : identifier la route et l’heure ; corréler avec déploiement ou pic de charge.
- **Exports** : surveiller les requêtes vers `/api/admin/export/*` (durée, 200 vs 500/timeout). En cas de timeouts répétés, rappeler la limite `EXPORT_MAX_ROWS` et `docs/PERF_AUDIT.md`.

---

## Automation optionnelle (Jour J)

- **Script non-UI :** `BASE_URL=<url-prod> npx tsx scripts/smoke-runner.ts` (sans credentials ; checks santé + 401 export + fixtures 404). Les checks nécessitant une session restent manuels ou E2E.
- **E2E go/no-go :** en prod, les E2E avec login seed ne s’appliquent généralement pas (pas de comptes E2E). Utiliser le smoke manuel ci‑dessus + script `smoke-runner.ts` pour les parties non authentifiées.
