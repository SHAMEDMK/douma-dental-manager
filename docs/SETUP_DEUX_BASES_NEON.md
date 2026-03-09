# Configuration : deux bases Neon (dev local + prod Vercel)

Ce guide vous permet de séparer les données de développement (local) et de production (Vercel).

---

## Vue d'ensemble

| Environnement | Base Neon | Où configurer |
|---------------|-----------|---------------|
| **Dev local** | Projet actuel (douma-dental) | `.env` à la racine |
| **Production Vercel** | Nouveau projet à créer | Vercel → Environment Variables |

---

## Étape 1 : Créer un nouveau projet Neon pour la production

1. Allez sur **https://console.neon.tech**
2. Cliquez sur **New project**
3. Remplissez :
   - **Name** : `douma-dental-prod` (ou un nom clair)
   - **Region** : même que le dev (ex. Europe West 2)
4. Cliquez sur **Create project**
5. Une fois créé, notez les **Connection details** (vous en aurez besoin à l'étape 3)

---

## Étape 2 : Garder la base actuelle pour le dev local

Votre fichier `.env` actuel pointe déjà vers votre base de dev. **Ne modifiez rien** dans `.env`.

- La base actuelle (douma-dental) reste pour le développement local
- Vous continuez à utiliser `npm run dev`, `db:push`, `db:seed` en local comme avant

---

## Étape 3 : Récupérer les URLs de la base production

1. Dans Neon, ouvrez le projet **douma-dental-prod** (créé à l'étape 1)
2. Allez dans **Connection details** (ou **Connect**)
3. Vous avez besoin de **deux URLs** :

   **URL 1 — Pooled (pour DATABASE_URL) :**
   - Activez **Connection pooling** (bascule à droite)
   - Cliquez sur **Show password** puis **Copy**
   - Format : `postgresql://neondb_owner:xxx@ep-XXXXX-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require`

   **URL 2 — Direct (pour DIRECT_URL) :**
   - Désactivez **Connection pooling**
   - Copiez l'URL
   - Format : `postgresql://neondb_owner:xxx@ep-XXXXX.eu-west-2.aws.neon.tech/neondb?sslmode=require`

4. Gardez ces deux URLs sous la main (bloc-notes ou fichier temporaire)

---

## Étape 4 : Configurer Vercel avec la base production

1. Allez sur **https://vercel.com**
2. Ouvrez votre projet **douma-dental-manager** (ou le nom de votre projet)
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez ou modifiez les variables suivantes pour **Production** :

   | Name | Value | Environment |
   |------|-------|--------------|
   | `DATABASE_URL` | URL pooled de l'étape 3 | Production |
   | `DIRECT_URL` | URL directe de l'étape 3 | Production |

5. Si `JWT_SECRET`, `ADMIN_PASSWORD`, `APP_URL` ne sont pas encore définis, ajoutez-les aussi (voir `docs/GUIDE_VERCEL_VRAIS_CLIENTS.md`)

6. Cliquez sur **Save**

---

## Étape 5 : Appliquer le schéma et le seed sur la base production

⚠️ **Important** : vous allez exécuter des commandes qui ciblent la base **production**. Ne pas confondre avec `.env` qui pointe vers le dev.

1. Créez un fichier `.env.production` à la racine du projet (s'il n'existe pas déjà).

2. Dans `.env.production`, mettez **uniquement** les variables de la base prod :
   ```
   DATABASE_URL="postgresql://neondb_owner:VOTRE_MOT_DE_PASSE@ep-XXXXX-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://neondb_owner:VOTRE_MOT_DE_PASSE@ep-XXXXX.eu-west-2.aws.neon.tech/neondb?sslmode=require"
   ADMIN_PASSWORD="VotreMotDePasseAdminFort123!"
   ```

3. Remplacez les URLs par celles de **douma-dental-prod** (étape 3).

4. Exécutez les commandes suivantes (elles chargent `.env.production`) :

   ```powershell
   npx dotenv-cli -e .env.production -- prisma migrate deploy
   npx dotenv-cli -e .env.production -- prisma db seed
   ```

   Si `dotenv-cli` n'est pas installé : `npm install -D dotenv-cli`

5. **Vérifiez** que vous utilisez bien les URLs du projet **douma-dental-prod** (pas douma-dental).

---

## Étape 6 : Vérifier .gitignore

Assurez-vous que `.env.production` n'est **pas** commité :

```powershell
# Vérifier que .env.production est ignoré
git check-ignore .env.production
```

Si la commande ne retourne rien, ajoutez `.env.production` dans `.gitignore`.

---

## Étape 7 : Redéployer sur Vercel

1. Sur Vercel, allez dans **Deployments**
2. Cliquez sur **Redeploy** sur le dernier déploiement
3. Ou poussez un commit sur `main` pour déclencher un déploiement automatique

4. Une fois le déploiement terminé, testez **https://votre-projet.vercel.app**
5. Connectez-vous avec `admin@douma.com` et le mot de passe défini dans `ADMIN_PASSWORD` (étape 5)

---

## Récapitulatif

| Action | Base ciblée |
|--------|-------------|
| `npm run dev` | Dev (`.env`) |
| `npm run db:push` | Dev (`.env`) |
| `npm run db:seed` | Dev (`.env`) |
| `npx dotenv-cli -e .env.production -- prisma migrate deploy` | Prod |
| `npx dotenv-cli -e .env.production -- prisma db seed` | Prod |
| Vercel (déploiement) | Prod (variables d'environnement Vercel) |

---

## En cas de problème

- **Build Vercel échoue** : Vérifiez les variables `DATABASE_URL` et `DIRECT_URL` dans Vercel.
- **Erreur de connexion** : Vérifiez que les URLs sont correctes et que le mot de passe n'a pas d'espaces ou de caractères spéciaux.
- **Confusion dev/prod** : Toujours vérifier quelle base est utilisée avant `db:push` ou `db:seed`.
