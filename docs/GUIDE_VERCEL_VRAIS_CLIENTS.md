# Guide pas à pas : Vercel avec de vrais clients

Ce guide vous accompagne étape par étape pour déployer DOUMA Dental Manager sur Vercel et l’utiliser avec de vrais clients, commerciaux, comptables et livreurs.

---

## Étape 1 : Créer une base PostgreSQL (Neon)

1. Allez sur **https://neon.tech** et créez un compte (gratuit).
2. Créez un nouveau projet (ex. `douma-prod`).
3. Dans **Connection Details**, copiez :
   - **Pooled connection** → pour `DATABASE_URL`
   - **Direct connection** → pour `DIRECT_URL`
4. Format attendu :
   ```
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"
   ```
   (Neon fournit les deux URLs prêtes à l’emploi.)

---

## Étape 2 : Connecter le projet à Vercel

1. Allez sur **https://vercel.com** et connectez-vous (GitHub).
2. Cliquez **Add New** → **Project**.
3. Importez votre dépôt GitHub `douma-dental-manager`.
4. **Framework Preset** : Next.js (détecté automatiquement).
5. Ne déployez pas tout de suite → **Cancel** ou passez à l’étape 3 pour configurer les variables.

---

## Étape 3 : Configurer les variables d’environnement

Dans **Vercel → Votre projet → Settings → Environment Variables**, ajoutez :

| Variable | Valeur | Scope |
|----------|--------|-------|
| `DATABASE_URL` | URL Neon (Pooled) | Production |
| `DIRECT_URL` | URL Neon (Direct) | Production |
| `JWT_SECRET` | Générez avec : `openssl rand -base64 32` | Production |
| `ADMIN_PASSWORD` | Mot de passe fort pour le premier admin | Production |
| `APP_URL` | `https://votre-projet.vercel.app` (ou votre domaine) | Production |

**Optionnel (recommandé pour les clients) :**

| Variable | Valeur | Rôle |
|----------|--------|------|
| `RESEND_API_KEY` | Clé API Resend (https://resend.com) | Envoi des invitations clients par email |
| `RESEND_FROM` | `DOUMA <noreply@votredomaine.com>` | Expéditeur des emails |
| `PDFSHIFT_API_KEY` | Clé API PDFShift (https://pdfshift.io) | Génération PDF factures / bons de livraison |

---

## Étape 4 : Premier déploiement

1. Dans Vercel, cliquez **Deploy** (ou poussez sur `main` si le projet est déjà connecté).
2. Attendez la fin du build (Build Completed).
3. Notez l’URL : `https://votre-projet.vercel.app`.

---

## Étape 5 : Appliquer les migrations et créer l’admin

Depuis votre machine, créez un fichier `.env.production` (à la racine du projet) avec :

```
DATABASE_URL="postgresql://..."   # URL Neon (Pooled)
DIRECT_URL="postgresql://..."     # URL Neon (Direct)
ADMIN_PASSWORD="VotreMotDePasseFort123!"
```

> Ne pas mettre `VERCEL_ENV` dans ce fichier : le seed doit s’exécuter depuis votre machine, pas depuis Vercel.

Puis exécutez :

```bash
# 1. Appliquer les migrations sur la base prod
npx dotenv -e .env.production -- prisma migrate deploy

# 2. Créer l'admin et les comptes de démo (une seule fois)
npx dotenv -e .env.production -- prisma db seed
```

**Compte admin créé :** `admin@douma.com` / mot de passe = valeur de `ADMIN_PASSWORD`.

---

## Étape 6 : Connexion et vérification

1. Allez sur `https://votre-projet.vercel.app`.
2. Cliquez **Connexion**.
3. Connectez-vous avec `admin@douma.com` et le mot de passe défini.
4. Vérifiez que le dashboard admin s’affiche.

---

## Étape 7 : Créer les comptes équipe (Comptable, Commercial, Livreur)

Le seed crée des comptes de démo (`compta@douma.com`, `commercial@douma.com`, `stock@douma.com`). Pour utiliser de **vrais emails** :

1. **Admin** → **Utilisateurs**.
2. **Créer un comptable** : bouton dédié → email réel du comptable, mot de passe.
3. **Créer un commercial** : bouton dédié → email réel du commercial, mot de passe.
4. **Créer un magasinier** : bouton dédié → email réel du magasinier, mot de passe.
5. **Admin** → **Livreurs** → **Créer un livreur** : email réel du livreur, mot de passe.

Chaque personne se connecte avec son email et son mot de passe. Les comptes de démo (`compta@douma.com`, etc.) peuvent être supprimés ou ignorés.

---

## Étape 8 : Ajouter de vrais clients

### Option A : Invitation par email (recommandé)

1. **Admin** → **Clients** → **Inviter un client**.
2. Saisissez l’email réel du client (ex. `jean.dupont@labo-dental.fr`).
3. Renseignez nom, entreprise, segment (LABO, DENTISTE, REVENDEUR).
4. Cliquez **Envoyer l’invitation**.

Si `RESEND_API_KEY` est configuré, le client reçoit un email avec un lien pour définir son mot de passe. Sinon, copiez le lien d’invitation affiché et envoyez-le manuellement au client.

### Option B : Création manuelle

1. **Admin** → **Clients** → **Créer un client**.
2. Renseignez email, nom, entreprise, segment, etc.
3. Le client pourra utiliser **Mot de passe oublié** pour définir son mot de passe.

---

## Étape 9 : Configurer l’entreprise (optionnel)

1. **Admin** → **Paramètres** → **Entreprise**.
2. Saisissez le nom, l’adresse, le logo, les conditions de paiement.
3. Ces informations apparaissent sur les factures et bons de livraison.

---

## Récapitulatif

| Étape | Action |
|-------|--------|
| 1 | Créer une base Neon |
| 2 | Connecter le projet à Vercel |
| 3 | Configurer les variables d’environnement |
| 4 | Déployer |
| 5 | Migrations + seed (admin) |
| 6 | Se connecter en admin |
| 7 | Créer Comptable, Commercial, Magasinier, Livreur |
| 8 | Inviter ou créer les clients |
| 9 | Configurer l’entreprise |

---

## En cas de problème

- **Build échoue** : Vérifiez les variables d’environnement (DATABASE_URL, DIRECT_URL, JWT_SECRET).
- **Erreur 500** : Consultez les logs Vercel (Deployments → clic sur le déploiement → Logs).
- **Emails non envoyés** : Vérifiez `RESEND_API_KEY` et `RESEND_FROM`.
- **PDF ne se génère pas** : Configurez `PDFSHIFT_API_KEY` ou vérifiez les logs.

---

## Nettoyer les données de démo avant les vrais clients

L’interface admin **ne permet pas** de supprimer des commandes. Un client ne peut pas être supprimé s’il a des commandes. Pour retirer les clients et commandes de démo :

1. Exécuter le script de nettoyage **depuis votre machine** avec la base de production :

```bash
# Voir ce qui serait supprimé (sans rien faire)
npx tsx scripts/cleanup-demo-data.ts --dry-run

# Effectuer le nettoyage
npx tsx scripts/cleanup-demo-data.ts
```

Le script charge automatiquement `.env.production` s'il existe (sinon `.env`).

2. Le script supprime les clients `client@dental.com` (Dr. Demo Client) et `clientb@dental.com` (Client B E2E), ainsi que toutes leurs commandes.

3. Ensuite, inviter vos vrais clients via Admin → Clients → Inviter.

Voir aussi : `docs/PROCEDURE_DEPLOIEMENT_VERCEL.md`, `docs/INCIDENT_RUNBOOK.md`.
