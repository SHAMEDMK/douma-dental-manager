# Opérations — DOUMA Dental Manager

Guide pour les opérations courantes : backups, monitoring, CI.

---

## Checklist rapide (production Vercel + Neon)

| Action | Où | Statut |
|--------|-----|--------|
| Backups Neon activés | Dashboard Neon → Settings → Backups | [ ] |
| Rétention 7–30 jours | Idem | [ ] |
| Backup PostgreSQL configuré | Cron / Task Scheduler | [ ] |
| CI GitHub actif | Repo → Actions, branch protection | [ ] |
| Health check OK | `GET /api/health` | [ ] |

---

## 1. Backups PostgreSQL (production)

### Vue d'ensemble

Le système de backup utilise `pg_dump` pour générer des fichiers SQL (`backup_YYYYMMDD.sql`), avec rotation automatique (suppression des backups > 14 jours).

| Script | Rôle |
|--------|------|
| `scripts/backup-postgres.js` | Backup + rotation |
| `scripts/rotate-backups.js` | Rotation seule (optionnel) |
| `scripts/restore-backup.js` | Restauration |
| `scripts/test-restore-backup.js` | Test de récupérabilité d'un backup |

### Prérequis

- PostgreSQL (`pg_dump` et `psql` dans le PATH)
- Variable `DATABASE_URL` ou `DIRECT_URL` dans `.env`

### Lancer un backup

```bash
# Backup PostgreSQL (génère backup_YYYYMMDD.sql + rotation)
npm run db:backup:postgres
```

Fichier généré : `backups/backup_20260317.sql` (exemple).

### Restaurer un backup

```bash
# Restauration (ATTENTION : écrase les données existantes)
npm run db:restore -- backups/backup_20260317.sql
```

Ou directement :

```bash
node scripts/restore-backup.js backups/backup_20260317.sql
```

### Tester qu'un backup est récupérable

```bash
# Test sur le dernier backup
npm run db:test-restore

# Test sur un fichier spécifique
npm run db:test-restore -- backups/backup_20260317.sql
```

Le script crée une DB temporaire, y restaure le backup, puis la supprime. Aucune erreur = backup valide.

**Note :** Certains hébergeurs cloud peuvent restreindre `CREATE DATABASE`. PostgreSQL 13+ requis pour `DROP DATABASE WITH (FORCE)`.

### Rotation (14 jours par défaut)

La rotation est exécutée automatiquement après chaque backup. Pour lancer la rotation seule :

```bash
npm run db:backup:rotate
```

Variables d'environnement (optionnel) :

| Variable | Défaut | Description |
|----------|--------|-------------|
| `BACKUP_DIR` | `./backups` | Dossier des backups |
| `BACKUP_RETENTION_DAYS` | `14` | Supprimer les backups plus vieux que N jours |
| `BACKUP_REMOTE_DIR` | — | Dossier distant (UNC, ex: `\\NAS\backups\douma`) — copie optionnelle après backup |

### Copie vers stockage distant

Si `BACKUP_REMOTE_DIR` est défini, le backup est copié vers ce dossier après chaque backup réussi. En cas d'échec de copie : warning uniquement (non bloquant).

**Exemples :**
- Chemin UNC : `\\192.168.1.10\backups\douma`
- Lecteur mappé : `Z:\backups\douma`

**Task Scheduler (Windows)** : le compte qui exécute la tâche doit avoir accès au dossier réseau. Préférer un chemin UNC si le lecteur n'est pas mappé pour ce compte.

### Exécution automatique

#### Cron (Linux / Mac)

```bash
crontab -e
```

Ajouter (remplacer `/chemin/vers/projet` par le chemin réel) :

```
# Backup quotidien à 2h du matin
0 2 * * * cd /chemin/vers/projet && npm run db:backup:postgres >> logs/backup.log 2>&1
```

Créer le dossier `logs` si nécessaire : `mkdir -p logs`

#### Task Scheduler (Windows)

1. Ouvrir **Planificateur de tâches** (taskschd.msc)
2. **Créer une tâche** (pas une tâche de base)
3. **Général** : nom « Backup DOUMA PostgreSQL »
4. **Déclencheurs** : Nouveau → Quotidien, 2h00
5. **Actions** : Nouveau → Programme : `node`, Arguments : `scripts/backup-postgres.js`, Démarrer dans : `C:\dev\trae_projects\tactac` (chemin du projet)
6. **Conditions** : décocher « Démarrer uniquement si l’ordinateur est sur secteur » si souhaité
7. **Paramètres** : cocher « Exécuter la tâche dès que possible après une mise en planification manquée »

**Important** : le script charge `.env` depuis le dossier du projet. S’assurer que `DATABASE_URL` est définie dans `.env` à la racine du projet.

### Bonnes pratiques

- **Fréquence** : quotidien (ex. 2h du matin)
- **Rétention** : 14 jours minimum, 30 jours recommandé en production
- **Copie hors site** : transférer les backups vers un stockage externe (clé USB, cloud). Voir **docs/BACKUP_TRANSFER.md**
- **Test de restauration** : tester la restauration sur une base de test au moins une fois par trimestre
- **Neon (Vercel)** : Neon fournit des backups intégrés. Les backups locaux sont complémentaires (copie hors Neon).

### Vercel + Neon (production typique)

Sur Vercel, la base est hébergée sur **Neon** :

1. **Backups Neon** : Dashboard Neon → Settings → Backups → rétention 7–30 jours
2. **Restauration Neon** : Neon Dashboard → Restore from backup

Pour des backups additionnels (copie hors Neon) :

- Exécuter `npm run db:backup:postgres` depuis une machine avec accès réseau à Neon (cron sur un serveur, ou manuellement)
- `DATABASE_URL` doit pointer vers la base Neon (URL pooled ou directe)

### Scripts alternatifs (SQLite + PostgreSQL multi-format)

- `npm run db:backup` / `npm run db:backup:manual` : script legacy (SQLite + PostgreSQL custom format, rotation par nombre)

---

## 2. Monitoring

- **Health check** : `GET /api/health` (DB, compteurs)
- **Sentry** : configuré si `SENTRY_DSN` est défini
- **Logs** : Vercel Dashboard → Logs

---

## 3. Vérification CI (GitHub) — Procédure détaillée

### 3.1 Accéder aux paramètres

1. Ouvrir le dépôt : `https://github.com/SHAMEDMK/douma-dental-manager`
2. Cliquer sur **Settings** (onglet en haut)
3. Dans le menu de gauche : **Rules** → **Rulesets** (ou **Branches** selon la version de GitHub)

### 3.2 Vérifier la protection de branche sur `main`

**Chemin :** Settings → Rules → Rulesets (ou Branches → Branch protection rules)

| Règle | À vérifier | Valeur attendue |
|-------|-------------|------------------|
| **Require a pull request before merging** | Activé | Oui |
| **Require approvals** | Si activé | Au moins 1 (ou 0 si vous travaillez seul) |
| **Require status checks to pass** | Activé | Oui |
| **Require branches to be up to date** | Optionnel | Recommandé |
| **Status checks requis** | Liste des checks | `ci` (ou `CI`) |

**Alternative (ancienne interface) :** Settings → Branches → Add rule (ou modifier la règle pour `main`) :
- Branch name pattern : `main`
- ☑ Require a pull request before merging
- ☑ Require status checks to pass before merging → sélectionner **ci**
- ☑ Do not allow bypassing the above settings (pour les admins)

### 3.3 Vérifier que le workflow CI existe

**Chemin :** Onglet **Actions** (en haut du dépôt)

| Étape | Vérification |
|-------|--------------|
| 1 | Cliquer sur **Actions** |
| 2 | Vérifier que le workflow **CI** apparaît dans la liste |
| 3 | Ouvrir une exécution récente (ex. dernier push ou PR) |
| 4 | Vérifier que tous les jobs sont verts : Lint, Build, Migrations, E2E tests |

### 3.4 Ce que fait le workflow CI (`.github/workflows/ci.yml`)

| Étape | Commande | Rôle |
|-------|----------|------|
| Checkout | `actions/checkout` | Récupère le code |
| Node 20 | `setup-node` | Environnement |
| Install | `npm ci` | Dépendances |
| Prisma | `prisma generate` | Client Prisma |
| Lint | `npm run lint` | ESLint |
| Build | `npm run build` | Next.js build |
| Migrations | `prisma migrate deploy` | Schéma DB |
| Playwright | `playwright install chromium` | Navigateur E2E |
| E2E | `npm run test:e2e` | Tests Playwright |

### 3.5 En cas de problème

| Problème | Piste de résolution |
|----------|---------------------|
| Le check `ci` n’apparaît pas dans les règles | Attendre 1–2 min après un push, ou lancer manuellement une action |
| Le workflow échoue | Ouvrir l’onglet Actions → cliquer sur l’exécution en erreur → consulter les logs |
| Merge bloqué malgré CI vert | Vérifier qu’une review est bien approuvée si la règle l’exige |

---

## 4. npm audit

Exécuter régulièrement :

```bash
npm audit
```

Corriger les vulnérabilités critiques et hautes.
