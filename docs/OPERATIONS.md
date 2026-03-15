# Opérations — DOUMA Dental Manager

Guide pour les opérations courantes : backups, monitoring, CI.

---

## Checklist rapide (production Vercel + Neon)

| Action | Où | Statut |
|--------|-----|--------|
| Backups Neon activés | Dashboard Neon → Settings → Backups | [ ] |
| Rétention 7–30 jours | Idem | [ ] |
| CI GitHub actif | Repo → Actions, branch protection | [ ] |
| Health check OK | `GET /api/health` | [ ] |

---

## 1. Backups automatiques en production

### Prérequis

- Base PostgreSQL (Neon, Supabase ou self-hosted)
- Variable `DATABASE_URL` configurée dans l'environnement

### Script de backup

```bash
# Backup manuel
npm run db:backup:manual

# Backup automatique (à appeler via cron/Task Scheduler)
npm run db:backup
```

### Configuration cron (Linux/Mac)

```bash
# Éditer crontab
crontab -e

# Backup quotidien à 2h du matin
0 2 * * * cd /chemin/vers/projet && npm run db:backup >> logs/backup.log 2>&1
```

### Configuration Task Scheduler (Windows)

1. Ouvrir **Planificateur de tâches**
2. Créer une tâche → Déclencheur : quotidien à 2h
3. Action : `node scripts/backup-db.js`
4. Démarrer dans : `C:\chemin\vers\projet`
5. Variables d'environnement : charger `.env` ou définir `DATABASE_URL`

### Vercel + Neon (production typique)

Sur Vercel, la base est hébergée sur **Neon**. Neon fournit des backups automatiques :

1. **Vérifier** : Dashboard Neon → Settings → Backups → rétention 7–30 jours
2. **Savoir restaurer** : Neon Dashboard → Restore from backup

Pour des backups additionnels (copie hors Neon) :

- Exporter manuellement via `pg_dump` depuis une machine avec accès à la DB
- Ou configurer un cron sur un serveur qui exécute `npm run db:backup` avec `DATABASE_URL` pointant vers Neon

### Copie des backups hors site

Voir **docs/BACKUP_TRANSFER.md** pour transférer les backups vers clé USB, cloud, etc.

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
