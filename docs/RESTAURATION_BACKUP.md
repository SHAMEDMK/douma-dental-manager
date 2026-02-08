# Restauration d’un backup – Doum Dental

Ce guide explique comment **restaurer** la base de données à partir d’un fichier de backup.

---

## ⚠️ Avant de restaurer

1. **Arrêtez l’application** (serveur Next.js, PM2, etc.) pour éviter que la base soit utilisée pendant la restauration.
2. **Sauvegardez la base actuelle** si vous voulez pouvoir revenir en arrière :
   ```bash
   cp prisma/dev.db prisma/dev.db.before-restore
   ```
3. Vérifiez que le fichier de backup existe (dans `backups/` ou là où vous l’avez téléchargé).

---

## Méthode 1 : Script de restauration (SQLite)

Un script permet de restaurer un backup SQLite en une commande.

```bash
# Restaurer le backup nommé manual-2026-02-01-12-00-00-abc123.db
node scripts/restore-backup.js manual-2026-02-01-12-00-00-abc123.db

# Avec confirmation automatique (scripts, CI)
node scripts/restore-backup.js manual-2026-02-01-12-00-00-abc123.db --yes
```

Le script :
- lit `DATABASE_URL` dans `.env` / `.env.local` ;
- copie le fichier depuis `backups/` (ou le chemin fourni) vers le fichier de base actuel ;
- **remplace** la base en cours : tout ce qui a été fait après le backup est perdu.

Après la restauration : **redémarrez l’application**.

---

## Méthode 2 : Restauration manuelle (SQLite)

1. **Arrêtez l’application.**

2. Repérez le chemin de la base dans `.env` :
   ```env
   DATABASE_URL="file:./dev.db"
   ```
   Le fichier est donc `prisma/dev.db` (ou à la racine si `./dev.db`).

3. **Remplacez** le fichier de base par le backup :
   ```bash
   # Depuis la racine du projet
   cp backups/manual-2026-02-01-12-00-00-abc123.db prisma/dev.db
   ```
   Si votre backup est ailleurs :
   ```bash
   cp /chemin/vers/votre/backup.db prisma/dev.db
   ```

4. **Redémarrez l’application.**

---

## Méthode 3 : PostgreSQL

Si vous utilisez PostgreSQL (`DATABASE_URL` en `postgresql://...`) :

### Dump au format SQL (fichier .sql)

```bash
# Remplacez user, database_name et le nom du fichier backup
psql -U user -d database_name < backups/manual-2026-02-01-xxx.sql
```

### Dump au format custom (fichier .custom)

```bash
pg_restore -U user -d database_name backups/manual-2026-02-01-xxx.custom
```

En cas d’erreurs de contraintes (tables déjà existantes), vous pouvez utiliser `--clean` (attention : supprime les objets existants) :

```bash
pg_restore -U user -d database_name --clean backups/manual-2026-02-01-xxx.custom
```

Pensez à **arrêter l’app** avant et à la **redémarrer** après.

---

## Où trouver les backups ?

| Source | Emplacement |
|--------|-------------|
| **Dossier du projet** | `backups/` à la racine (ou chemin défini par `BACKUP_DIR` dans `.env`) |
| **Interface admin** | Admin → Backups → Télécharger (📥) le fichier .db souhaité |
| **Support externe** | Copiez le fichier depuis la clé USB / autre serveur vers `backups/` ou le chemin utilisé par le script |

Pour afficher le chemin du dossier backups :

```bash
node scripts/show-backup-path.js
```

---

## Après la restauration

1. Redémarrer l’application (Next.js, PM2, etc.).
2. Tester la connexion : ouvrir l’admin, vérifier commandes / factures / produits.
3. Si vous aviez fait une sauvegarde de la base avant restauration (`dev.db.before-restore`), vous pouvez revenir en arrière en refaisant une copie :
   ```bash
   cp prisma/dev.db.before-restore prisma/dev.db
   ```

---

## Résumé rapide (SQLite, projet local)

```bash
# 1. Arrêter l'app (Ctrl+C ou pm2 stop ...)

# 2. (Optionnel) Sauvegarder la base actuelle
cp prisma/dev.db prisma/dev.db.before-restore

# 3. Restaurer
node scripts/restore-backup.js backups/manual-YYYY-MM-DD-HH-MM-SS-xxxxx.db --yes

# ou à la main :
cp backups/manual-YYYY-MM-DD-HH-MM-SS-xxxxx.db prisma/dev.db

# 4. Redémarrer l'app
npm run dev
```
