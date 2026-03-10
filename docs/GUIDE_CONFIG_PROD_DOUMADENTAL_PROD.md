# Guide pas à pas : configurer tout avec douma-dental-prod

Ce guide vous permet de repartir de zéro et de tout configurer pour utiliser **uniquement** le projet Neon **douma-dental-prod** en production.

---

## Étape 1 — Récupérer les URLs dans Neon

1. Allez sur **https://console.neon.tech**
2. Cliquez sur le projet **douma-dental-prod**
3. Dans le menu de gauche ou en haut, cliquez sur **Connection details** (ou **Connect**)
4. Vous verrez une zone avec les paramètres de connexion

### URL 1 — Pooled (pour `DATABASE_URL`)

- Activez **Connection pooling** (bascule à droite)
- Cliquez sur **Show password** pour afficher le mot de passe
- Cliquez sur **Copy** pour copier l’URL complète
- Le host doit contenir **`-pooler`** (ex. `ep-xxx-pooler.eu-west-2.aws.neon.tech`)
- Collez cette URL dans un bloc-notes

### URL 2 — Direct (pour `DIRECT_URL`)

- Désactivez **Connection pooling**
- Cliquez sur **Copy** pour copier l’URL
- Le host ne doit **pas** contenir `-pooler` (ex. `ep-xxx.eu-west-2.aws.neon.tech`)
- Collez cette URL dans le bloc-notes

⚠️ **Important** : les deux URLs doivent utiliser le **même mot de passe**. Si vous avez copié les deux depuis Neon, c’est normalement le cas.

---

## Étape 2 — Créer ou mettre à jour `.env.production`

1. À la racine du projet (`c:\dev\trae_projects\tactac`), créez ou ouvrez le fichier **`.env.production`**
2. Mettez exactement ce contenu (en remplaçant par vos vraies URLs) :

```
DATABASE_URL="COLLEZ_ICI_L_URL_POOLED_AVEC_POOLER"
DIRECT_URL="COLLEZ_ICI_L_URL_DIRECTE_SANS_POOLER"
ADMIN_PASSWORD="VotreMotDePasseAdmin123!"
```

3. Remplacez :
   - `COLLEZ_ICI_L_URL_POOLED_AVEC_POOLER` par l’URL avec `-pooler` dans le host
   - `COLLEZ_ICI_L_URL_DIRECTE_SANS_POOLER` par l’URL sans `-pooler`
   - `VotreMotDePasseAdmin123!` par un mot de passe fort pour le compte admin (au moins 8 caractères)
4. Sauvegardez le fichier

---

## Étape 3 — Appliquer les migrations sur la base prod

Ouvrez PowerShell dans le dossier du projet et exécutez :

```powershell
npx dotenv-cli -e .env.production -- prisma migrate deploy
```

Vous devez voir quelque chose comme :

```
Applying migration `20260208234147_init`
Applying migration `...`
...
All migrations have been successfully applied.
```

Si une erreur apparaît, vérifiez que les URLs dans `.env.production` sont correctes et que le mot de passe est le même dans les deux.

---

## Étape 4 — Exécuter le seed (créer l’admin et les données de démo)

```powershell
npx dotenv-cli -e .env.production -- prisma db seed
```

Vous devez voir :

```
✓ Created admin user: admin@douma.com
...
Seed terminé — 7 utilisateur(s), 5 produit(s) en base.
```

Si l’admin existe déjà, vous verrez `Seed skipped: admin already exists.` — c’est normal.

---

## Étape 5 — Configurer Vercel

1. Allez sur **https://vercel.com**
2. Ouvrez votre projet **douma-dental-manager**
3. Allez dans **Settings** → **Environment Variables**
4. Pour **Production**, ajoutez ou modifiez :

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | La même URL pooled que dans `.env.production` | Production |
| `DIRECT_URL` | La même URL directe que dans `.env.production` | Production |
| `JWT_SECRET` | Une chaîne aléatoire (ex. `openssl rand -base64 32`) | Production |
| `NODE_ENV` | `production` | Production |

5. **Supprimez** les anciennes variables `DATABASE_URL` et `DIRECT_URL` si elles pointaient vers une autre base
6. Cliquez sur **Save**

---

## Étape 6 — Redéployer sur Vercel

1. Allez dans **Deployments**
2. Cliquez sur les **⋯** (trois points) du dernier déploiement
3. Cliquez sur **Redeploy**
4. Attendez la fin du build

---

## Étape 7 — Tester la connexion

1. Ouvrez **https://douma-dental-manager.vercel.app**
2. Allez sur la page de connexion
3. Connectez-vous avec :
   - **Email** : `admin@douma.com`
   - **Mot de passe** : celui défini dans `ADMIN_PASSWORD` (étape 2)

---

## Récapitulatif

| Action | Base utilisée |
|--------|----------------|
| `DATABASE_URL` / `DIRECT_URL` dans `.env.production` | douma-dental-prod |
| `DATABASE_URL` / `DIRECT_URL` dans Vercel | douma-dental-prod |
| `npx dotenv-cli -e .env.production -- prisma migrate deploy` | douma-dental-prod |
| `npx dotenv-cli -e .env.production -- prisma db seed` | douma-dental-prod |
| `npm run dev` (local) | douma-dental (via `.env`) |

---

## En cas de problème

- **Erreur de connexion** : Vérifiez que les deux URLs ont le même mot de passe et qu’il n’y a pas d’espace ou de caractère en trop
- **StockMovement does not exist** : Les migrations n’ont pas été appliquées sur la bonne base → refaire l’étape 3
- **Erreur serveur temporaire au login** : Vérifiez que `JWT_SECRET` est bien défini sur Vercel
