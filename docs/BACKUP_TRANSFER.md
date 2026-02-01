# Guide de Transfert des Backups

Ce guide explique comment transférer vos backups vers d'autres supports pour une protection maximale de vos données.

## 🎯 Pourquoi transférer les backups ?

Les backups stockés uniquement sur le serveur principal ne sont pas suffisants. En cas de :
- **Panne du serveur** : Vous perdez les backups avec les données
- **Incendie/Inondation** : Tous les fichiers peuvent être détruits
- **Vol/Piratage** : Les backups peuvent être compromis

**Solution :** Gardez toujours au moins une copie des backups **hors du serveur principal**.

---

## 📥 Méthode 1 : Téléchargement via l'Interface Admin

### Étapes :

1. Connectez-vous à l'interface admin : `/admin/backups`
2. Cliquez sur l'icône **📥 Télécharger** à côté du backup souhaité
3. Le fichier se télécharge dans votre dossier de téléchargements
4. Copiez le fichier sur :
   - **Disque externe** ou **clé USB**
   - **Service cloud** (Dropbox, Google Drive, OneDrive)
   - **NAS** (Network Attached Storage)
   - **Autre serveur** via FTP/SFTP

### Avantages :
- ✅ Simple et rapide
- ✅ Pas besoin d'accès au serveur
- ✅ Sélection manuelle des backups importants

### Inconvénients :
- ❌ Processus manuel
- ❌ Nécessite de se souvenir de le faire régulièrement

---

## 📋 Méthode 2 : Copie Manuelle depuis le Serveur

### Étapes :

1. **Accédez au dossier des backups** sur le serveur :
   ```bash
   cd /chemin/vers/votre/app/backups
   # ou
   cd C:\dev\trae_projects\tactac\backups
   ```

2. **Copiez les fichiers** vers votre support externe :
   ```bash
   # Linux/Mac
   cp *.db /media/usb/backups/
   cp *.sql /media/usb/backups/
   
   # Windows
   copy *.db D:\Backups\
   copy *.sql D:\Backups\
   ```

### Avantages :
- ✅ Contrôle total
- ✅ Peut copier plusieurs fichiers en une fois

### Inconvénients :
- ❌ Nécessite un accès au serveur
- ❌ Processus manuel

---

## 🤖 Méthode 3 : Script Automatique

### Configuration :

1. **Définissez la destination** dans `.env` :
   ```env
   BACKUP_COPY_DESTINATION=/media/usb/backups
   # ou pour Windows
   BACKUP_COPY_DESTINATION=D:\Backups
   ```

2. **Exécutez le script** :
   ```bash
   npm run backup:copy
   # ou
   node scripts/copy-backups.js --destination /chemin/vers/destination
   ```

3. **Automatisez avec un cron job** (Linux/Mac) :
   ```bash
   # Copie tous les jours à 2h du matin
   0 2 * * * cd /chemin/vers/app && npm run backup:copy
   ```

   Ou **Task Scheduler** (Windows) :
   - Créez une tâche planifiée
   - Action : `node scripts/copy-backups.js --destination D:\Backups`

### Options du script :

```bash
# Spécifier la destination
node scripts/copy-backups.js --destination /path/to/destination

# Garder seulement les backups des 7 derniers jours
node scripts/copy-backups.js --destination /path/to/destination --keep-days 7

# Copier tous les backups (pas de limite de jours)
node scripts/copy-backups.js --destination /path/to/destination --keep-days 0
```

### Avantages :
- ✅ Automatique
- ✅ Peut être planifié
- ✅ Évite les doublons (ignore les fichiers déjà copiés)

### Inconvénients :
- ❌ Nécessite une configuration initiale
- ❌ Le support externe doit être monté/accessible

---

## ☁️ Méthode 4 : Synchronisation Cloud

### Option A : Dropbox / Google Drive / OneDrive

1. **Installez le client cloud** sur le serveur
2. **Créez un dossier** dans votre cloud (ex: `Backups-Douma`)
3. **Configurez la synchronisation** du dossier `backups/` vers le dossier cloud
4. Les backups seront automatiquement synchronisés

### Option B : rclone (Recommandé pour serveurs)

1. **Installez rclone** :
   ```bash
   # Linux
   curl https://rclone.org/install.sh | sudo bash
   
   # Windows
   # Téléchargez depuis https://rclone.org/downloads/
   ```

2. **Configurez rclone** :
   ```bash
   rclone config
   # Suivez les instructions pour configurer votre service cloud
   ```

3. **Synchronisez les backups** :
   ```bash
   # Synchronisation bidirectionnelle
   rclone sync ./backups remote:backups
   
   # Copie unidirectionnelle (backups vers cloud uniquement)
   rclone copy ./backups remote:backups
   ```

4. **Automatisez** avec un cron job :
   ```bash
   # Tous les jours à 3h du matin
   0 3 * * * rclone sync /chemin/vers/app/backups remote:backups
   ```

### Avantages :
- ✅ Automatique
- ✅ Accès depuis n'importe où
- ✅ Protection contre les catastrophes locales

### Inconvénients :
- ❌ Nécessite une connexion internet
- ❌ Peut avoir des coûts (selon le service)

---

## 🔐 Méthode 5 : FTP/SFTP vers Serveur Distant

### Configuration :

1. **Utilisez un client FTP** (FileZilla, WinSCP, etc.)

2. **Connectez-vous** à votre serveur de backup :
   - **Hôte** : adresse du serveur
   - **Port** : 21 (FTP) ou 22 (SFTP)
   - **Utilisateur/Mot de passe** : identifiants du serveur

3. **Téléversez les fichiers** depuis `backups/` vers le serveur distant

### Automatisation avec rsync (Linux/Mac) :

```bash
# Synchronisation via SSH
rsync -avz --delete ./backups/ user@remote-server:/backups/douma/

# Automatiser avec cron
0 4 * * * rsync -avz --delete /chemin/vers/app/backups/ user@remote-server:/backups/douma/
```

### Avantages :
- ✅ Contrôle total
- ✅ Serveur dédié aux backups
- ✅ Sécurisé (SFTP)

### Inconvénients :
- ❌ Nécessite un serveur distant
- ❌ Configuration plus complexe

---

## 📅 Recommandations de Fréquence

| Type de Backup | Fréquence | Support Recommandé |
|---------------|-----------|-------------------|
| **Quotidien** | Tous les jours | Disque externe / Cloud |
| **Hebdomadaire** | Une fois par semaine | Cloud / Serveur distant |
| **Mensuel** | Une fois par mois | Disque externe (hors site) |

---

## ✅ Checklist de Sécurité

- [ ] Au moins **2 copies** des backups (3-2-1 rule : 3 copies, 2 supports différents, 1 hors site)
- [ ] **Test de restauration** effectué au moins une fois par mois
- [ ] **Chiffrement** des backups sensibles (optionnel mais recommandé)
- [ ] **Rotation** : garder des backups anciens (hebdomadaires/mensuels)
- [ ] **Documentation** : notez où sont stockés les backups et comment les restaurer

---

## 🔄 Restauration depuis un Backup Externe

### SQLite :
```bash
# Copiez le fichier .db vers le serveur
cp /media/usb/backup-manual-2026-01-23-abc123.db ./dev.db

# Ou remplacez le fichier de base de données
cp backup-manual-2026-01-23-abc123.db dev.db
```

### PostgreSQL :
```bash
# Restaurez depuis un dump SQL
psql -U user -d database_name < backup-manual-2026-01-23-abc123.sql

# Ou depuis un dump custom
pg_restore -U user -d database_name backup-manual-2026-01-23-abc123.custom
```

---

## 🆘 En Cas de Problème

Si vous avez des difficultés :

1. **Vérifiez les permissions** : le script/utilisateur a-t-il les droits d'écriture ?
2. **Vérifiez l'espace disque** : y a-t-il assez d'espace sur le support de destination ?
3. **Vérifiez la connectivité** : le support externe/serveur est-il accessible ?
4. **Consultez les logs** : le script affiche des messages d'erreur détaillés

---

## 📞 Support

Pour toute question ou problème, consultez la documentation ou contactez l'administrateur système.
