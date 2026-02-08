# Parcours : Local prod-like → Staging → Production

Ne pas passer directement « dev local » → « prod ». Faire au moins un test prod-like (local build+start ou staging Vercel avec DB staging).

**Chaîne recommandée :** Local (prod-like) → Staging (internet, non public) → Production.

---

## Conseil important

- **Minimum** : test local en mode production (`npm run build` puis `npm run start`) avec une DB staging ou prod-like.
- **Idéal** : staging Vercel (Preview Deployment) avec une vraie DB staging → teste proxy, serverless, env vars Vercel, réseau réel.

---

## Étape 0 — Préparer un staging propre (recommandé)

### 0.1 Base PostgreSQL STAGING

- Créer une DB PostgreSQL **staging** (Neon / Supabase / autre), séparée de prod.
- Récupérer : `DATABASE_URL`, `DIRECT_URL` si besoin (pooling / migrations).
- **✅ Check :** connexion OK depuis Prisma ou un client DB.

### 0.2 Projet Vercel

- Importer le repo (GitHub) sur Vercel.
- Vérifier que Vercel crée des Preview Deployments automatiquement.
- **✅ Check :** après un push, un déploiement “Preview” apparaît.

---

## Étape 1 — Test “production-like” en LOCAL

**Objectif :** Vérifier que build prod + runtime prod fonctionnent.

1. **Env vars de staging en local**  
   Fichier `.env.local` (jamais commité) avec :
   - `DATABASE_URL` (staging), `DIRECT_URL` (si besoin)
   - `JWT_SECRET`, `ADMIN_PASSWORD`
   - `APP_URL` ou `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - Si NextAuth : `NEXTAUTH_URL=http://localhost:3000`, `NEXTAUTH_SECRET`

2. **Build & start**
   ```bash
   npm install
   npm run build
   npm run start
   ```

3. **Smoke local (5 min)**  
   - Login admin  
   - Créer une commande  
   - Changer un statut  
   - Générer un PDF  
   - Vérifier un audit log  

**✅ Check :** tout OK → runtime prod sain.

---

## Étape 2 — Staging sur Vercel (Preview) avant la prod

**Objectif :** Tester dans l’environnement Vercel sans toucher à la prod.

1. **Branche “release” (ou staging)**  
   ```bash
   git checkout -b release
   git push origin release
   ```  
   Vercel donne une URL Preview.

2. **Env vars “Preview” dans Vercel**  
   Settings → Environment Variables, scope **Preview** : DB staging, secrets staging.  
   ⚠️ Si NextAuth : `NEXTAUTH_URL` = URL de la preview.

3. **Migrations sur staging (une seule fois, pas dans le build)**  
   Depuis ta machine (Prisma pointé vers DB staging) :
   ```bash
   npx prisma migrate deploy
   ```  
   **✅ Check :** schéma DB staging à jour.

4. **Seed admin staging** (si premier staging)  
   Exécuter le seed avec env staging, vérifier connexion admin.

5. **Smoke staging (5 points)**  
   - [ ] Login admin  
   - [ ] Backoffice + pagination  
   - [ ] Workflow + audit log  
   - [ ] PDF + print  
   - [ ] 401 / 403 + rate limit  

**✅ Check :** staging OK → prêt pour prod.

---

## Étape 3 — Préparer la PROD (Vercel Production)

**Objectif :** Configurer prod (secrets, DB, backups) avant d’envoyer du trafic.

### 3.1 DB PostgreSQL PROD (séparée)

- Provider managé (Neon / Supabase / autre).
- SSL si requis, backups automatiques (daily), rétention 7–30 jours.

### 3.2 Env vars Vercel “Production”

Vercel → Settings → Environment Variables (**Production**) : DB prod, secrets prod (ne pas réutiliser staging).

- `DATABASE_URL` (prod), `DIRECT_URL` (prod si besoin)
- `JWT_SECRET` (nouveau, fort), `ADMIN_PASSWORD` (fort)
- `VERCEL_ENV` (auto), `NEXT_PUBLIC_APP_URL` / `APP_URL` (domaine final)
- NextAuth : `NEXTAUTH_URL` (domaine final) + `NEXTAUTH_SECRET` (prod)
- Variables rate limit

**✅ Check :** prod ≠ staging (surtout URLs DB).

### 3.3 Migrations PROD (avant promote)

- `prisma migrate deploy` sur la DB prod.
- Une seule fois, jamais en parallèle.

### 3.4 Admin initial PROD

- Exécuter seed / script admin (une fois).
- Login admin puis **changer le mot de passe** (bonne pratique).

---

## Étape 4 — Déployer en Production

1. **Déploiement** : merge `release` → `main` (ou push `main`). Vercel déploie en Production.
2. **Smoke post-deploy** (immédiat, 5 min) : refaire les 5 points sur l’URL prod.
3. **Rollback si souci** : Vercel → Deployments → “Promote to Production” sur le déploiement précédent. Les migrations déjà appliquées restent ; le code doit rester compatible avec le schéma actuel (ou prévoir un plan DB si changement destructif).

**✅ Check :** smoke OK → lancement terminé.

---

## Étape 5 — Après mise en ligne (J+1 / J+7)

- **J+1** : exécuter `docs/CHECKLIST_POST_GO_LIVE.md` (section J+1).
- **J+7** : J+7 + test restore obligatoire.

---

## Récap

| Étape | Où | Action |
|-------|-----|--------|
| 1 | Local | build + start avec env staging → smoke 5 min |
| 2 | Vercel Preview | env staging, migrate deploy, seed, smoke 5 points |
| 3 | — | DB prod, env prod, migrate deploy prod, seed admin prod |
| 4 | Vercel Production | push → deploy → smoke post-deploy |
| 5 | — | J+1 puis J+7 (checklist post-go-live) |

---

## Les 3 décisions qui changent les détails

Pour adapter la procédure au plus près :

| Décision | Ce que ça change |
|----------|-------------------|
| **Vercel** | Oui → tout le parcours s’applique tel quel. |
| **DB = Neon** | Souvent `DATABASE_URL` (pooling) + `DIRECT_URL` (non pooling) indispensables. |
| **DB = Supabase** | SSL souvent requis (`?sslmode=require`), attention au pooling selon config. |
| **Auth = NextAuth** | `NEXTAUTH_URL` et `NEXTAUTH_SECRET` indispensables ; URL selon env (local / preview / prod). |
| **Auth = custom JWT** | `JWT_SECRET` + config cookies/session à vérifier. |

Pour obtenir une version 100 % adaptée (env exactes, migrations, IP/rate-limit Vercel), il suffit de répondre par une ligne du type :  
*« Je suis sur Vercel, DB = Neon, auth = NextAuth »* (ou ce qui correspond).

---

**Références :** `docs/CHECKLIST_PRODUCTION_VERCEL.md`, `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md`, `docs/CHECKLIST_POST_GO_LIVE.md`.
