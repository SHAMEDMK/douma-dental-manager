# Déploiement sur serveur personnel – DOUMA Dental Manager

Ce guide décrit comment installer et faire tourner l’application sur **votre propre serveur** (machine chez vous, petit serveur, ou VPS personnel) **sans la mettre directement en ligne** sur un hébergeur public.

---

## Choix possibles pour un serveur personnel

- **PC / NAS** à la maison (Windows ou Linux)
- **VPS** que vous louez (VPS perso, pas « cloud public » type SaaS)
- Réseau **local** uniquement (accès depuis votre bureau) ou avec accès **à distance** (VPN, port ouvert, etc.)

L’application fonctionne pareil ; seuls l’URL et la façon de démarrer le serveur changent.

---

## Option A : Garder SQLite (le plus simple)

Sur un serveur personnel, vous pouvez **rester en SQLite** (un seul fichier de base). Pas besoin d’installer PostgreSQL.

### 1. Préparer le projet sur le serveur

```bash
# Copier le projet sur le serveur (git clone, copie de dossier, etc.)
cd /chemin/vers/tactac

# Installer les dépendances
npm ci

# Fichier .env (créer à partir de .env.example)
cp .env.example .env
```

### 2. Configurer le fichier .env

Éditez `.env` avec les valeurs pour **votre serveur** :

```env
# Base de données (SQLite, fichier dans le projet)
DATABASE_URL="file:./dev.db"

# Secret pour les sessions (générez-en un différent de la dev)
JWT_SECRET="votre-secret-genere-32-octets-minimum"

# Environnement
NODE_ENV="production"

# URL à laquelle vous accéderez à l’app (voir ci-dessous)
NEXT_PUBLIC_APP_URL="http://192.168.1.10:3000"
# Ou si vous avez un nom : http://douma.local:3000
# Ou en local uniquement : http://localhost:3000

# Mot de passe admin (pour le seed)
ADMIN_PASSWORD="votre-mot-de-passe-admin"
```

**Générer un JWT_SECRET :**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Base de données et premier lancement

```bash
# Migrations (crée les tables)
npx prisma migrate deploy

# Créer l’admin (une seule fois)
npm run db:seed

# Build
npm run build

# Démarrer
npm start
```

L’app écoute sur le port **3000**. Vous y accédez par :

- **Même machine** : `http://localhost:3000`
- **Réseau local** : `http://IP_DU_SERVEUR:3000` (ex. `http://192.168.1.10:3000`)

---

## Option B : PostgreSQL sur le serveur personnel

Si vous préférez PostgreSQL (même sur votre propre machine) :

1. Installer PostgreSQL sur le serveur.
2. Créer une base (ex. `douma_dental`) et un utilisateur.
3. Dans `prisma/schema.prisma`, mettre `provider = "postgresql"` et dans `.env` :

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/douma_dental?schema=public"
   ```

4. Puis : `npx prisma migrate deploy`, `npm run db:seed`, `npm run build`, `npm start`.

---

## Faire tourner l’app en continu (recommandé)

Sans outil, dès que vous fermez le terminal, l’app s’arrête. Sur un serveur personnel, il est utile de la lancer avec **PM2** (ou un équivalent).

### Installer PM2

```bash
npm install -g pm2
```

### Démarrer l’application avec PM2

```bash
cd /chemin/vers/tactac

# Démarrer
pm2 start npm --name "douma-dental" -- start

# Redémarrer après un crash
pm2 startup
pm2 save
```

Commandes utiles :

- `pm2 status`   → voir si l’app tourne  
- `pm2 logs douma-dental` → voir les logs  
- `pm2 restart douma-dental` → redémarrer après une mise à jour  

---

## Sauvegardes sur serveur personnel

Les backups se font comme en dev, mais il est important de les **copier ailleurs** (clé USB, autre disque, autre machine).

- **Créer un backup** : depuis l’admin (Backups → Créer) ou en ligne de commande :
  ```bash
  node scripts/backup-db.js --manual
  ```
- **Emplacement** : dossier `backups/` à la racine du projet (ou `BACKUP_DIR` dans `.env`).
- **Copie vers un support externe** (à faire régulièrement) :
  ```bash
  node scripts/copy-backups.js --destination /chemin/vers/clé/usb/backups
  ```
- **Restauration** : voir `docs/RESTAURATION_BACKUP.md`.

---

## Sécurité basique (serveur personnel)

- **Réseau local uniquement** : n’ouvrez pas le port 3000 sur Internet ; seuls les postes de votre bureau peuvent accéder à l’app.
- **Accès à distance** : préférez un **VPN** vers votre réseau, puis `http://IP_LOCAL:3000`, plutôt que d’exposer le port 3000 directement sur Internet.
- **Firewall** : sur le serveur, n’autorisez que les ports nécessaires (ex. 3000 pour vous, ou 80 si vous mettez un reverse proxy).
- **Mots de passe** : `ADMIN_PASSWORD` et `JWT_SECRET` forts, et ne pas commiter le fichier `.env`.

---

## URL d’accès (résumé)

| Situation | NEXT_PUBLIC_APP_URL typique |
|-----------|-----------------------------|
| Utilisation uniquement sur le serveur | `http://localhost:3000` |
| Accès depuis d’autres PC du même réseau | `http://192.168.x.x:3000` (IP du serveur) |
| Vous avez un nom local (ex. douma.local) | `http://douma.local:3000` |

Après avoir modifié `NEXT_PUBLIC_APP_URL`, refaire un **build** : `npm run build`, puis redémarrer (`npm start` ou `pm2 restart douma-dental`).

---

## Checklist rapide – serveur personnel

- [ ] Projet copié sur le serveur, `npm ci` exécuté  
- [ ] Fichier `.env` créé et rempli (DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL, ADMIN_PASSWORD)  
- [ ] `npx prisma migrate deploy` puis `npm run db:seed`  
- [ ] `npm run build` puis `npm start` (ou PM2)  
- [ ] Accès testé dans le navigateur (localhost ou IP du serveur)  
- [ ] Paramètres → Informations entreprise renseignés  
- [ ] Backups configurés (dossier + copie vers support externe)

Une fois ces points faits, **l’application est opérationnelle sur votre serveur personnel**. Vous pourrez ensuite, si vous le souhaitez, la déplacer vers un hébergeur public en suivant `PRODUCTION.md` et en changeant l’URL et la base si besoin.
