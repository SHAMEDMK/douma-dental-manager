# Checklist production exacte — Cible Vercel (Next.js + Prisma + PostgreSQL)

« Adapter la checklist à la cible » = mêmes exigences (secrets, DB, migrations, backups, sécurité), mais la **manière de les configurer** change selon où tu déploies.

- **Vercel** : serverless, env vars dans le dashboard, pas de cron “simple”, attention aux IP/proxy et au stockage fichiers.
- **VPS + Docker** : tu contrôles tout (reverse proxy, volumes, cron, backups) → plus de boulot, plus flexible.
- **Railway / Render / Fly** : entre les deux (DB, env, logs, cron selon leur modèle).

Cette checklist est la version **exacte pour Vercel**. Pour VPS Docker ou Railway/Render/Fly, voir une checklist dédiée.

**Procédure pas à pas (ordre des actions, rollback) :** `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md`  
**Parcours avant prod (local → staging → prod) :** `docs/PARCOURS_STAGING_PUIS_PROD.md`  
**Post-go-live (J+1 / J+7, incidents) :** `docs/CHECKLIST_POST_GO_LIVE.md`

---

## A) Variables d’environnement (obligatoires)

À mettre dans **Vercel → Project → Settings → Environment Variables (Production)** :

| Groupe | Variable | Exemple / note |
|--------|----------|----------------|
| **Base** | `NODE_ENV` | `production` |
| | `DATABASE_URL` | `postgresql://...` (pooling recommandé) |
| | `DIRECT_URL` | `postgresql://...` sans pooling, pour migrations (Neon/Supabase/PGBouncer) |
| | `JWT_SECRET` | Long, aléatoire, 32+ caractères |
| | `ADMIN_PASSWORD` | Fort, unique (seed / premier admin) |
| **App** | `NEXT_PUBLIC_APP_URL` ou `APP_URL` | `https://ton-domaine.tld` |
| | `RATE_LIMIT_WINDOW_SECONDS` | Selon ton app |
| | `RATE_LIMIT_MAX` | Selon ton app |
| **Auth** (si NextAuth) | `NEXTAUTH_URL` | `https://ton-domaine.tld` |
| | `NEXTAUTH_SECRET` | Si requis |
| **PDF** (si service externe) | Clés du provider | ex. `PDF_API_KEY` |
| **Infra** | `VERCEL_ENV` | `production` (lecture seule Vercel, utile pour guardrails) |
| **Build** | `PRISMA_GENERATE_SKIP_POSTINSTALL` | `false` (ou documenter ton choix si tu skippes) |

**Règle :** Aucun secret en dur dans le repo. Zéro.

---

## B) Base de données PostgreSQL (prod)

- DB managée recommandée : **Neon / Supabase / RDS / Railway**, etc.
- Vérifier :
  - SSL activé si requis (`?sslmode=require`)
  - Connexions : en serverless, **pooling** souvent nécessaire. ⚠️ Vérifier que le nombre de connexions max côté DB est compatible avec le serverless (Prisma + Vercel).
- Avant go-live :
  - [ ] Création de l’admin initial (seed ou script)
  - [ ] Index sur tables “chaudes” : `orders`, `invoices`, `audit_logs`, `stock_moves`

---

## C) Prisma migrate deploy (bonne pratique Vercel)

Sur Vercel, le build ne doit pas “deviner” les migrations. Étape contrôlée obligatoire.

⚠️ Les migrations doivent être exécutées **une seule fois par déploiement** (jamais en parallèle).

**Option recommandée : migration en pipeline (Deploy Hook / CI)**  
À chaque déploiement prod :
1. Exécuter `prisma migrate deploy`
2. Puis déployer l’app

**Option simple (acceptable au début)**  
- Dans le build : `prisma generate`
- Migrations via un script séparé **avant** de basculer le trafic (idéalement)

**À éviter :** `prisma db push` en prod (risque de dérive, pas d’historique).

---

## D) Backups (prod)

Avec Vercel, les backups sont surtout **côté DB** :

- [ ] Backups automatiques activés (daily minimum)
- [ ] Rétention 7–30 jours
- [ ] Test de restore au moins une fois (staging)

**Option bonus :** export d’un dump chiffré vers S3/Backblaze si le provider le permet.

---

## E) Headers de sécurité (Next.js)

Dans `next.config.js` (ou middleware), activer au minimum :

- `Strict-Transport-Security` (si HTTPS)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy` (basique)
- `Content-Security-Policy` (version minimaliste au début)
- `frame-ancestors 'none'` ou `X-Frame-Options: DENY`

CSP est le plus délicat : commencer simple (pas trop bloquant), puis durcir.

⚠️ Tester la CSP sur : **login**, **génération PDF**, **page print** avant durcissement.

---

## F) Rate limiting derrière proxy (Vercel)

En serverless, l’**IP réelle** doit venir des headers (proxy).

- Utiliser la meilleure source dispo : `x-forwarded-for` → prendre la **première** IP
- Fallback sur `userId` si authentifié
- Clé = (route + ip ou userId) + fenêtre de temps

Les tests E2E rate-limit existants doivent être confirmés en prod.

---

## Smoke post-deploy (5 minutes)

| # | Action | Critère de succès |
|---|--------|-------------------|
| 1 | **Home / login** | Ouvrir le domaine prod → login admin OK |
| 2 | **DB + backoffice** | Dashboard admin (stats) → liste commandes + liste factures (pagination) |
| 3 | **Workflow** | Créer une commande ou utiliser seed prod-safe → passer un statut (ex. CONFIRMED → PREPARING) → audit log enregistré |
| 4 | **PDF** | Générer PDF facture → téléchargement / affichage OK |
| 5 | **Sécurité** | Route admin sans auth → 401 ; un client ne peut pas accéder à une route admin (403) ; login 11 fois → rate limit déclenché |

Si ces 5 points passent → déploiement considéré **OK**.

---

## Autres cibles

- **VPS Docker** : checklist dédiée (reverse proxy, volumes, cron backups, migrations au démarrage).
- **Railway / Render / Fly** : checklist adaptée à leur gestion DB, env, logs, cron.
