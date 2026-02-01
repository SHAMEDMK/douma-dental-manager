# Guide d'Accès au Dossier Backups

Ce guide explique comment accéder au dossier `backups/` sur votre serveur selon différents environnements.

## 📍 Emplacement par Défaut

Par défaut, le dossier `backups/` est créé dans le **répertoire racine de votre application** :

```
votre-projet/
├── backups/          ← Dossier des backups ici
├── app/
├── prisma/
├── scripts/
└── ...
```

### Chemin Complet

- **Windows** : `C:\dev\trae_projects\tactac\backups\`
- **Linux/Mac** : `/chemin/vers/votre/projet/backups/`

---

## 🔧 Configuration Personnalisée

Vous pouvez changer l'emplacement du dossier backups en définissant la variable d'environnement `BACKUP_DIR` dans votre fichier `.env` :

```env
BACKUP_DIR=C:\Backups\Douma
# ou pour Linux/Mac
BACKUP_DIR=/var/backups/douma
```

---

## 💻 Méthode 1 : Accès Local (Développement)

### Windows

1. **Via l'Explorateur de fichiers** :
   - Ouvrez l'Explorateur Windows
   - Naviguez vers : `C:\dev\trae_projects\tactac\backups\`
   - Ou utilisez le raccourci : `Win + R`, tapez `C:\dev\trae_projects\tactac\backups` et appuyez sur Entrée

2. **Via PowerShell** :
   ```powershell
   cd C:\dev\trae_projects\tactac\backups
   dir
   ```

3. **Via CMD** :
   ```cmd
   cd C:\dev\trae_projects\tactac\backups
   dir
   ```

### Linux/Mac

1. **Via le Terminal** :
   ```bash
   cd /chemin/vers/votre/projet/backups
   ls -la
   ```

2. **Via le gestionnaire de fichiers** :
   - Ouvrez votre gestionnaire de fichiers (Nautilus, Finder, etc.)
   - Naviguez vers le dossier du projet
   - Ouvrez le dossier `backups/`

---

## 🌐 Méthode 2 : Accès Serveur Distant (SSH)

### Connexion SSH

```bash
# Connexion au serveur
ssh utilisateur@adresse-serveur

# Exemple
ssh admin@192.168.1.100
# ou
ssh admin@votre-domaine.com
```

### Navigation vers le dossier

```bash
# Trouver le répertoire du projet
cd /var/www/tactac
# ou
cd /home/username/tactac
# ou selon votre configuration

# Accéder au dossier backups
cd backups

# Lister les fichiers
ls -lh

# Voir les détails
ls -lht | head -20  # 20 derniers fichiers
```

### Télécharger un backup depuis le serveur

```bash
# Depuis votre machine locale (Windows PowerShell)
scp utilisateur@serveur:/chemin/vers/projet/backups/nom-du-backup.db C:\Backups\

# Depuis votre machine locale (Linux/Mac)
scp utilisateur@serveur:/chemin/vers/projet/backups/nom-du-backup.db ~/Downloads/
```

---

## 📁 Méthode 3 : Via l'Interface Admin

### Téléchargement Direct

1. Connectez-vous à l'interface admin : `http://localhost:3000/admin/backups`
2. Cliquez sur l'icône **📥 Télécharger** à côté du backup souhaité
3. Le fichier se télécharge dans votre dossier de téléchargements

### Emplacement des téléchargements

- **Windows** : `C:\Users\VotreNom\Downloads\`
- **Linux** : `~/Downloads/` ou `/home/votrenom/Downloads/`
- **Mac** : `~/Downloads/`

---

## 🔍 Méthode 4 : Trouver le Chemin Exact

### Via le Script de Backup

Exécutez le script de backup et regardez la sortie :

```bash
npm run db:backup
```

La sortie affichera :
```
✅ SQLite backup created: manual-2026-01-23-12-30-45-abc123.db
   Size: 1024.50 KB
   Path: C:\dev\trae_projects\tactac\backups\manual-2026-01-23-12-30-45-abc123.db
```

### Via Node.js (Script de Test)

Créez un fichier `test-backup-path.js` :

```javascript
const path = require('path')
require('dotenv').config()

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
console.log('Backup directory:', BACKUP_DIR)
```

Exécutez :
```bash
node test-backup-path.js
```

### Via l'API Admin

Dans la console du navigateur (F12), exécutez :

```javascript
fetch('/api/admin/backup')
  .then(r => r.json())
  .then(data => {
    console.log('Backups:', data.backups)
    console.log('Total:', data.total)
  })
```

---

## 🖥️ Méthode 5 : Serveur de Production (VPS/Dedicated)

### Accès via SSH

```bash
# Connexion
ssh root@votre-serveur.com

# Trouver le projet (généralement dans /var/www ou /home)
find / -name "backups" -type d 2>/dev/null | grep tactac

# Ou si vous connaissez le chemin
cd /var/www/tactac/backups
ls -lh
```

### Accès via FTP/SFTP

1. **Utilisez un client FTP** (FileZilla, WinSCP, Cyberduck) :
   - **Hôte** : adresse de votre serveur
   - **Port** : 21 (FTP) ou 22 (SFTP)
   - **Utilisateur/Mot de passe** : identifiants du serveur

2. **Naviguez vers** :
   ```
   /var/www/tactac/backups/
   # ou
   /home/username/tactac/backups/
   ```

### Accès via cPanel/Plesk

1. Connectez-vous à votre panneau de contrôle
2. Ouvrez le **Gestionnaire de fichiers**
3. Naviguez vers : `public_html/tactac/backups/` (ou selon votre configuration)

---

## 📋 Vérification Rapide

### Vérifier si le dossier existe

**Windows (PowerShell)** :
```powershell
Test-Path "C:\dev\trae_projects\tactac\backups"
```

**Linux/Mac** :
```bash
test -d "/chemin/vers/projet/backups" && echo "Existe" || echo "N'existe pas"
```

### Lister les backups

**Windows** :
```powershell
Get-ChildItem "C:\dev\trae_projects\tactac\backups" | Sort-Object LastWriteTime -Descending
```

**Linux/Mac** :
```bash
ls -lht /chemin/vers/projet/backups | head -10
```

---

## 🔐 Permissions (Linux/Mac)

Si vous avez des problèmes d'accès, vérifiez les permissions :

```bash
# Voir les permissions
ls -ld backups/

# Donner les permissions d'écriture
chmod 755 backups/

# Ou si vous êtes propriétaire
chmod 700 backups/
```

---

## 📝 Exemples de Chemins Courants

| Environnement | Chemin Typique |
|--------------|----------------|
| **Windows Local** | `C:\dev\trae_projects\tactac\backups\` |
| **Linux Local** | `~/projets/tactac/backups/` |
| **Mac Local** | `~/Documents/tactac/backups/` |
| **VPS Linux** | `/var/www/tactac/backups/` |
| **VPS avec Docker** | `/var/lib/docker/volumes/tactac_backups/_data/` |
| **cPanel** | `/home/username/public_html/tactac/backups/` |

---

## 🆘 Dépannage

### Le dossier n'existe pas

Le dossier est créé automatiquement lors du premier backup. Si nécessaire, créez-le manuellement :

**Windows** :
```powershell
New-Item -ItemType Directory -Path "C:\dev\trae_projects\tactac\backups"
```

**Linux/Mac** :
```bash
mkdir -p /chemin/vers/projet/backups
```

### Erreur de permissions

**Linux/Mac** :
```bash
sudo chown -R $USER:$USER backups/
chmod -R 755 backups/
```

### Trouver le répertoire de travail actuel

**Windows (PowerShell)** :
```powershell
Get-Location
# ou
pwd
```

**Linux/Mac** :
```bash
pwd
```

---

## 💡 Astuce

Pour ouvrir rapidement le dossier backups dans l'explorateur :

**Windows** :
```powershell
explorer "C:\dev\trae_projects\tactac\backups"
```

**Linux** :
```bash
nautilus /chemin/vers/projet/backups
# ou
xdg-open /chemin/vers/projet/backups
```

**Mac** :
```bash
open /chemin/vers/projet/backups
```

---

## 📞 Besoin d'Aide ?

Si vous ne trouvez pas le dossier backups :

1. Vérifiez la variable `BACKUP_DIR` dans votre `.env`
2. Exécutez un backup manuel et regardez le chemin affiché
3. Cherchez le dossier avec : `find / -name "backups" -type d 2>/dev/null` (Linux/Mac)
