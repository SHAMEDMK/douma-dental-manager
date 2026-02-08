#!/usr/bin/env node

/**
 * Restaure la base de données à partir d'un fichier de backup (SQLite).
 *
 * Usage:
 *   node scripts/restore-backup.js <fichier-backup>
 *   node scripts/restore-backup.js manual-2026-02-01-12-00-00-abc123.db
 *   node scripts/restore-backup.js backups/manual-2026-02-01-12-00-00-abc123.db
 *   node scripts/restore-backup.js manual-2026-02-01-12-00-00-abc123.db --yes
 *
 * Prérequis : arrêter l'application avant de lancer le script.
 */

const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db'

function main() {
  const args = process.argv.slice(2)
  const backupArg = args.find((a) => !a.startsWith('--'))
  const forceYes = args.includes('--yes')

  if (!backupArg) {
    console.error('Usage: node scripts/restore-backup.js <fichier-backup> [--yes]')
    console.error('  Ex: node scripts/restore-backup.js manual-2026-02-01-12-00-00-abc123.db')
    console.error('  Ex: node scripts/restore-backup.js backups/manual-2026-02-01-12-00-00-abc123.db --yes')
    process.exit(1)
  }

  // Résoudre le chemin du backup (dossier backups/ ou chemin absolu/relatif)
  let backupPath = path.isAbsolute(backupArg)
    ? backupArg
    : path.join(process.cwd(), backupArg)

  if (!path.extname(backupPath) && !fs.existsSync(backupPath)) {
    const inBackupDir = path.join(BACKUP_DIR, backupArg)
    if (fs.existsSync(inBackupDir)) {
      backupPath = inBackupDir
    }
  }

  if (!fs.existsSync(backupPath)) {
    console.error('Fichier de backup introuvable:', backupPath)
    process.exit(1)
  }

  // Résoudre le chemin de la base actuelle (SQLite uniquement)
  if (!DATABASE_URL.startsWith('file:') && !DATABASE_URL.includes('sqlite')) {
    console.error('Ce script ne gère que SQLite. Pour PostgreSQL, utilisez psql ou pg_restore.')
    process.exit(1)
  }

  const dbRelative = DATABASE_URL.replace(/^file:/, '').trim()
  const dbPath = path.isAbsolute(dbRelative)
    ? dbRelative
    : path.join(process.cwd(), dbRelative.replace(/^\.\//, ''))

  if (!forceYes) {
    console.log('Restauration d\'un backup')
    console.log('  Backup :', backupPath)
    console.log('  Cible  :', dbPath)
    console.log('')
    console.log('La base actuelle sera remplacée. Assurez-vous d\'avoir arrêté l\'application.')
    console.log('Relancez avec --yes pour confirmer.')
    process.exit(0)
  }

  try {
    if (fs.existsSync(dbPath)) {
      const backupCurrent = `${dbPath}.before-restore-${Date.now()}`
      fs.copyFileSync(dbPath, backupCurrent)
      console.log('Sauvegarde de la base actuelle :', backupCurrent)
    }

    fs.copyFileSync(backupPath, dbPath)
    console.log('Restauration terminée.')
    console.log('Redémarrez l\'application.')
  } catch (err) {
    console.error('Erreur lors de la restauration:', err.message)
    process.exit(1)
  }
}

main()
