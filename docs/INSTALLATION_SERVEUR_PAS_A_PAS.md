# Installation pas à pas sur votre serveur – DOUMA Dental Manager

Suivez les étapes dans l’ordre. À la fin, l’application tournera sur votre serveur et vous pourrez y accéder depuis un navigateur.

---

## Étape 0 : Ce dont vous avez besoin

- Un **serveur** (PC, NAS ou VPS) avec **Windows** ou **Linux**.
- Un accès à ce serveur (bureau à distance, SSH, ou session locale).
- **Node.js 20** ou plus (on vérifie à l’étape 1).
- Le **code du projet** (dossier tactac) présent sur le serveur (copie, clé USB, ou Git).

---

## Étape 1 : Vérifier Node.js

Ouvrez un terminal sur le serveur (PowerShell sous Windows, terminal sous Linux).

**Commande :**
```bash
node -v
```

- Si vous voyez **v20.x.x** ou **v22.x.x** (ou supérieur) → passez à l’étape 2.
- Si la commande n’existe pas ou la version est &lt; 20 :
  - **Windows** : installez depuis [nodejs.org](https://nodejs.org/) (version LTS).
  - **Linux** : par exemple  
    `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`  
    puis  
    `sudo apt install -y nodejs`

Vérifiez aussi npm :
```bash
npm -v
```
(une version s’affiche, par ex. 10.x ou 11.x)

---

## Étape 2 : Placer le projet sur le serveur

Choisissez **une** des méthodes suivantes.

### Option A : Vous avez déjà le dossier du projet (copie, clé USB, etc.)

1. Copiez tout le dossier **tactac** (avec `app`, `prisma`, `package.json`, etc.) sur le serveur.
2. Ouvrez un terminal et allez dans ce dossier, par exemple :
   - **Windows** : `cd C:\Users\VotreNom\tactac`
   - **Linux** : `cd /home/votreuser/tactac`

### Option B : Vous utilisez Git

Si le projet est sur Git (GitHub, GitLab, etc.) :

```bash
# Exemple (remplacez par l’URL de votre dépôt)
git clone https://github.com/votre-compte/tactac.git
cd tactac
```

À la fin de l’étape 2, vous devez être **dans le dossier du projet** (là où se trouve `package.json`).

**Vérification :**
```bash
dir package.json
```
(Windows) ou
```bash
ls package.json
```
(Linux)  
→ Le fichier doit être listé.

---

## Étape 3 : Installer les dépendances

Toujours dans le dossier du projet :

```bash
npm ci
```

Attendez la fin sans erreur. Cela peut prendre 1 à 2 minutes.

- Si une erreur apparaît (réseau, permissions), corrigez-la (connexion Internet, droits en écriture dans le dossier) puis relancez `npm ci`.

---

## Étape 4 : Créer le fichier .env

Le fichier `.env` contient la configuration (base de données, mot de passe admin, etc.).

**4.1 Copier le modèle**
```bash
# Windows (PowerShell)
copy .env.example .env

# Linux / Mac
cp .env.example .env
```

**4.2 Générer un secret pour les sessions**

Dans le terminal :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copiez le résultat (une longue chaîne de caractères).

**4.3 Éditer le fichier .env**

Ouvrez le fichier `.env` avec un éditeur (Notepad, Notepad++, nano, vim, etc.).

Remplacez ou complétez les lignes suivantes :

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=COLLEZ_ICI_LE_RESULTAT_DE_LA_COMMANDE_CI_DESSUS
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_PASSWORD=VotreMotDePasseAdmin123
```

- **JWT_SECRET** : collez exactement la chaîne générée à l’étape 4.2 (sans guillemets si vous n’en mettez pas).
- **ADMIN_PASSWORD** : choisissez un mot de passe d’au moins 8 caractères pour vous connecter en admin (email : `admin@douma.com`).
- **NEXT_PUBLIC_APP_URL** :
  - Si vous ouvrez l’app **uniquement sur le serveur** : laissez `http://localhost:3000`.
  - Si vous voulez y accéder **depuis un autre PC du réseau** : mettez l’IP du serveur, par ex. `http://192.168.1.10:3000` (remplacez par la vraie IP de votre serveur).

Enregistrez et fermez le fichier.

---

## Étape 5 : Créer la base de données et l’utilisateur admin

Exécutez ces commandes **une par une**, dans le dossier du projet.

**5.1 Appliquer les migrations (création des tables)**
```bash
npx prisma migrate deploy
```
Vous devez voir des lignes du type « applied migration … ». Pas d’erreur rouge.

**5.2 Créer le compte administrateur**
```bash
npm run db:seed
```
Vous devez voir au moins : `✓ Created admin user: admin@douma.com` (ou un message indiquant que l’admin existe déjà).

En cas d’erreur « ADMIN_PASSWORD must be at least 8 characters », revenez au fichier `.env` et mettez un mot de passe d’au moins 8 caractères pour `ADMIN_PASSWORD`, puis relancez `npm run db:seed`.

---

## Étape 6 : Compiler l’application (build)

```bash
npm run build
```

Attendez la fin (1 à 3 minutes selon la machine). À la fin vous devez voir « Compiled successfully » ou équivalent, sans erreur.

- En cas d’erreur, lisez le message (souvent un fichier ou une variable manquante) et corrigez avant de relancer `npm run build`.

---

## Étape 7 : Démarrer l’application

**7.1 Premier démarrage (test)**

```bash
npm start
```

Vous devez voir un message indiquant que le serveur écoute sur le port 3000 (par ex. « Local: http://localhost:3000 »).

**7.2 Tester dans le navigateur**

- **Sur le serveur** : ouvrez un navigateur et allez sur :  
  **http://localhost:3000**
- **Depuis un autre PC du même réseau** : si vous avez mis `NEXT_PUBLIC_APP_URL=http://192.168.1.10:3000`, ouvrez :  
  **http://192.168.1.10:3000** (en remplaçant par l’IP de votre serveur).

Vous devez voir la page d’accueil ou la page de connexion.

**7.3 Se connecter en admin**

- Allez sur **Connexion** (ou **/login**).
- Email : **admin@douma.com**
- Mot de passe : celui que vous avez mis dans `ADMIN_PASSWORD` dans le `.env`.

Si la connexion fonctionne, vous êtes dans l’espace admin. L’installation de base est terminée.

Pour arrêter l’application : dans le terminal où elle tourne, faites **Ctrl+C**.

---

## Étape 8 (recommandé) : Faire tourner l’app en continu avec PM2

Sans PM2, dès que vous fermez le terminal, l’application s’arrête. PM2 la relance au démarrage du serveur et en cas de crash.

**8.1 Installer PM2**
```bash
npm install -g pm2
```
(Sous Linux, il peut falloir `sudo npm install -g pm2`.)

**8.2 Démarrer l’app avec PM2**

Arrêtez l’app si elle tourne encore (Ctrl+C), puis dans le dossier du projet :

```bash
pm2 start npm --name "douma-dental" -- start
```

**8.3 Vérifier**
```bash
pm2 status
```
Vous devez voir « douma-dental » avec le statut « online ».

**8.4 (Optionnel) Redémarrer l’app au démarrage du serveur**
```bash
pm2 startup
```
Exécutez la commande que PM2 affiche (elle contient souvent `sudo` sous Linux). Puis :
```bash
pm2 save
```

Désormais, après un redémarrage du serveur, l’application redémarrera automatiquement.

**Commandes utiles :**
- `pm2 logs douma-dental` : voir les logs
- `pm2 restart douma-dental` : redémarrer après une modification
- `pm2 stop douma-dental` : arrêter

---

## Étape 9 : Configuration minimale dans l’application

Une fois connecté en admin :

1. Allez dans **Paramètres** → **Informations entreprise**.
2. Renseignez au moins : **Raison sociale**, **Adresse**, **Ville**, **Pays**, **ICE**.
3. Enregistrez.

Ces informations apparaîtront sur les factures et bons de livraison.

Vous pouvez ensuite ajouter des **produits** et **inviter des clients** (voir le guide admin).

---

## Récapitulatif des commandes (copier-coller)

Dans l’ordre, dans le dossier du projet :

```bash
npm ci
copy .env.example .env
```
(Ensuite éditez `.env` avec JWT_SECRET, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL.)

```bash
npx prisma migrate deploy
npm run db:seed
npm run build
npm start
```

Pour utiliser PM2 après le premier test :

```bash
pm2 start npm --name "douma-dental" -- start
pm2 save
```

---

## Dépannage rapide

| Problème | À faire |
|----------|--------|
| `node: command not found` | Installer Node.js 20+ (étape 1). |
| `EADDRINUSE: port 3000` | Le port 3000 est déjà utilisé. Arrêtez l’autre programme ou changez le port : `set PORT=3001` (Windows) ou `export PORT=3001` (Linux) puis `npm start`. |
| Impossible de se connecter depuis un autre PC | Vérifier le pare-feu du serveur (autoriser le port 3000), et que `NEXT_PUBLIC_APP_URL` contient l’IP du serveur. Refaire `npm run build` après avoir modifié `NEXT_PUBLIC_APP_URL`. |
| « ADMIN_PASSWORD must be at least 8 characters » | Dans `.env`, mettre `ADMIN_PASSWORD=UnMotDePasseDe8Caracteres` puis relancer `npm run db:seed`. |
| Page blanche ou erreur 404 | Vérifier que vous avez bien fait `npm run build` puis `npm start` (ou PM2). |

Si vous suivez ces étapes dans l’ordre, l’application DOUMA Dental Manager sera opérationnelle sur votre serveur. Pour la sauvegarde et la restauration, voir `docs/RESTAURATION_BACKUP.md` et `docs/DEPLOIEMENT_SERVEUR_PERSONNEL.md`.
