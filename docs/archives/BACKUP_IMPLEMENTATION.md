# ✅ Implémentation du Backup Automatique - Point 4

## 📋 Résumé

Le système de backup automatique a été mis en place avec succès pour protéger les données de la base de données (SQLite et PostgreSQL).

## 🎯 Ce qui a été fait

### 1. Script de backup ✅

#### `scripts/backup-db.js`
- ✅ Support SQLite : Copie du fichier `.db`
- ✅ Support PostgreSQL : Utilise `pg_dump` avec fallback SQL
- ✅ Génération de noms de fichiers uniques (timestamp + hash)
- ✅ Distinction entre backups manuels et automatiques
- ✅ Nettoyage automatique des anciens backups (limite configurable)
- ✅ Métadonnées sauvegardées dans `backups/metadata.json`
- ✅ Gestion des erreurs robuste

### 2. Scripts npm ✅

#### `package.json`
- ✅ `npm run db:backup` : Backup automatique
- ✅ `npm run db:backup:manual` : Backup manuel

### 3. API route ✅

#### `app/api/admin/backup/route.ts`
- ✅ `GET /api/admin/backup` : Liste tous les backups
- ✅ `POST /api/admin/backup` : Crée un backup manuel
- ✅ `DELETE /api/admin/backup?filename=...` : Supprime un backup
- ✅ Sécurité : Accès réservé aux admins
- ✅ Protection contre directory traversal

### 4. Interface admin ✅

#### `app/admin/backups/page.tsx` + `BackupsClient.tsx`
- ✅ Page `/admin/backups` pour gérer les backups
- ✅ Tableau listant tous les backups avec :
  - Nom du fichier
  - Type (SQLite/PostgreSQL)
  - Date de création
  - Taille
  - Actions (supprimer)
- ✅ Bouton pour créer un backup manuel
- ✅ Cartes de résumé (total, taille totale)
- ✅ Messages de succès/erreur
- ✅ Actualisation manuelle

#### Sidebar admin
- ✅ Lien "Backups" ajouté dans la navigation
- ✅ Icône `HardDrive` pour les backups

## 🔧 Configuration

### Variables d'environnement

Ajouter dans `.env` (optionnel) :
```bash
# Dossier de stockage des backups (défaut: ./backups)
BACKUP_DIR=./backups

# Nombre maximum de backups à conserver (défaut: 30)
MAX_BACKUPS=30
```

### Dossier de backups

Par défaut, les backups sont stockés dans `./backups/` (créé automatiquement).

⚠️ **Important** : Le dossier `backups/` est dans `.gitignore` pour ne pas commiter les backups.

## 🚀 Utilisation

### Backup manuel

#### Via npm
```bash
# Backup automatique (avec préfixe "auto-")
npm run db:backup

# Backup manuel (avec préfixe "manual-")
npm run db:backup:manual
```

#### Via interface admin
1. Se connecter en tant qu'admin
2. Aller dans "Backups" dans la sidebar
3. Cliquer sur "Créer un backup manuel"

#### Via API
```bash
curl -X POST http://localhost:3000/api/admin/backup \
  -H "Cookie: session=..."
```

### Lister les backups

#### Via interface admin
1. Aller dans `/admin/backups`
2. Voir la liste complète des backups

#### Via API
```bash
curl http://localhost:3000/api/admin/backup \
  -H "Cookie: session=..."
```

### Supprimer un backup

#### Via interface admin
1. Aller dans `/admin/backups`
2. Cliquer sur l'icône poubelle à côté du backup à supprimer
3. Confirmer la suppression

#### Via API
```bash
curl -X DELETE "http://localhost:3000/api/admin/backup?filename=backup-name.db" \
  -H "Cookie: session=..."
```

## ⏰ Configuration des backups automatiques

### Linux/macOS (Cron)

#### 1. Créer un script wrapper
```bash
# Créer /path/to/project/scripts/backup-wrapper.sh
#!/bin/bash
cd /path/to/project
npm run db:backup
```

#### 2. Rendre exécutable
```bash
chmod +x scripts/backup-wrapper.sh
```

#### 3. Configurer cron
```bash
# Éditer crontab
crontab -e

# Ajouter une ligne pour backup quotidien à 2h du matin
0 2 * * * /path/to/project/scripts/backup-wrapper.sh >> /path/to/project/logs/backup.log 2>&1

# Ou backup toutes les 6 heures
0 */6 * * * /path/to/project/scripts/backup-wrapper.sh >> /path/to/project/logs/backup.log 2>&1
```

### Windows (Task Scheduler)

#### 1. Ouvrir Task Scheduler
- Win + R → `taskschd.msc`
- Ou : Paramètres → Planificateur de tâches

#### 2. Créer une tâche
- Clic droit → "Créer une tâche"
- Nom : "DOUMA Database Backup"

#### 3. Onglet "Général"
- Exécuter même si l'utilisateur n'est pas connecté
- Exécuter avec les privilèges les plus élevés

#### 4. Onglet "Déclencheurs"
- Nouveau → Choisir fréquence (quotidien, hebdomadaire, etc.)
- Heure : ex. 02:00
- Répéter toutes les : X heures (optionnel)

#### 5. Onglet "Actions"
- Nouvelle action → "Démarrer un programme"
- Programme : `node`
- Arguments : `scripts/backup-db.js`
- Dossier de départ : `C:\path\to\project`

#### 6. Onglet "Conditions"
- Décocher "Ne démarrer la tâche que si l'ordinateur est sur secteur" (optionnel)

#### 7. Onglet "Paramètres"
- "Si la tâche est déjà en cours d'exécution" : Ne pas démarrer une nouvelle instance

### Docker (via cron dans conteneur)

Si vous utilisez Docker, vous pouvez ajouter cron dans votre conteneur :

```dockerfile
# Dans Dockerfile
RUN apt-get update && apt-get install -y cron

# Copier script cron
COPY scripts/crontab /etc/cron.d/backup-cron
RUN chmod 0644 /etc/cron.d/backup-cron
RUN crontab /etc/cron.d/backup-cron

# Créer script d'entrée
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
```

```bash
# scripts/crontab
0 2 * * * root cd /app && npm run db:backup >> /var/log/backup.log 2>&1
```

```bash
#!/bin/bash
# scripts/docker-entrypoint.sh
service cron start
exec "$@"
```

## 📁 Structure des fichiers

```
tactac/
├── scripts/
│   └── backup-db.js          # Script principal de backup
├── backups/                   # Dossier de stockage (créé automatiquement)
│   ├── auto-2026-01-14-10-30-00-abc123.db
│   ├── manual-2026-01-14-11-00-00-def456.db
│   └── metadata.json          # Métadonnées des backups
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── backup/
│   │           └── route.ts   # API route pour backups
│   └── admin/
│       └── backups/
│           ├── page.tsx       # Page admin
│           └── BackupsClient.tsx  # Composant client
└── .gitignore                 # Contient backups/
```

## 📊 Format des noms de fichiers

### Backup automatique
```
auto-YYYY-MM-DD-HH-MM-SS-xxxxx.{db|sql|custom}
```

### Backup manuel
```
manual-YYYY-MM-DD-HH-MM-SS-xxxxx.{db|sql|custom}
```

Exemples :
- `auto-2026-01-14-10-30-00-a1b2c3.db` (SQLite automatique)
- `manual-2026-01-14-15-45-00-d4e5f6.sql` (PostgreSQL manuel)

## 🔒 Sécurité

### Protection des données
- ✅ Backups stockés localement (ou dans un dossier sécurisé)
- ✅ Pas de sauvegarde des mots de passe dans les backups PostgreSQL (utilise PGPASSWORD env var)
- ✅ Accès API réservé aux admins uniquement

### Protection contre les attaques
- ✅ Protection directory traversal dans l'API DELETE
- ✅ Validation des noms de fichiers
- ✅ Backups non commités dans git (`.gitignore`)

## ⚠️ Recommandations

### Backup externe
Les backups locaux sont une première protection, mais il est recommandé de :
1. **Copier les backups vers un serveur distant** (S3, FTP, etc.)
2. **Stocker les backups hors-site** (cloud, serveur distant)
3. **Tester les restaurations régulièrement**

### Rotation des backups
Le script nettoie automatiquement les anciens backups (limite: 30 par défaut). Pour une meilleure stratégie :
- **Quotidiens** : Conserver 7-30 jours
- **Hebdomadaires** : Conserver 4-12 semaines
- **Mensuels** : Conserver 6-12 mois

### Monitoring
- Surveiller la taille du dossier `backups/`
- Vérifier que les backups se créent correctement
- Alerter en cas d'échec de backup

## 📝 Restauration

### SQLite
```bash
# Copier le backup vers le fichier principal
cp backups/auto-2026-01-14-10-30-00-abc123.db dev.db

# Ou utiliser Prisma pour restaurer
# (nécessite de modifier DATABASE_URL temporairement)
```

### PostgreSQL
```bash
# Avec format custom
pg_restore --host=localhost --port=5432 --username=user --dbname=database \
  backups/auto-2026-01-14-10-30-00-abc123.custom

# Avec format SQL
psql --host=localhost --port=5432 --username=user --dbname=database \
  < backups/auto-2026-01-14-10-30-00-abc123.sql
```

## 🐛 Dépannage

### Erreur : Script non trouvé
```bash
# Vérifier que le script existe
ls -la scripts/backup-db.js

# Vérifier les permissions
chmod +x scripts/backup-db.js
```

### Erreur : pg_dump non trouvé (PostgreSQL)
```bash
# Installer PostgreSQL client tools
# Ubuntu/Debian:
sudo apt-get install postgresql-client

# macOS:
brew install postgresql

# Windows:
# Télécharger depuis https://www.postgresql.org/download/windows/
```

### Erreur : Permission refusée
```bash
# Vérifier les permissions du dossier backups
mkdir -p backups
chmod 755 backups
```

### Erreur : Espace disque insuffisant
```bash
# Vérifier l'espace disponible
df -h

# Nettoyer les anciens backups manuellement
rm backups/old-backup-*.db
```

## 📈 Statistiques

### Exemple de métadonnées
```json
{
  "filename": "auto-2026-01-14-10-30-00-abc123.db",
  "path": "/path/to/backups/auto-2026-01-14-10-30-00-abc123.db",
  "size": 1048576,
  "type": "SQLite",
  "createdAt": "2026-01-14T10:30:00.000Z"
}
```

## 🔄 Prochaines améliorations possibles

- [ ] Compression des backups (gzip)
- [ ] Upload automatique vers cloud (S3, Google Cloud, etc.)
- [ ] Notifications en cas d'échec
- [ ] Interface de restauration depuis l'admin
- [ ] Chiffrement des backups sensibles
- [ ] Backup incrémental
- [ ] Intégration avec des services de backup externes

---

**Date de création** : Janvier 2025  
**Statut** : ✅ Point 4 complété - Backup automatique implémenté
