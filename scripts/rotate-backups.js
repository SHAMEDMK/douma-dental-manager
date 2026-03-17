#!/usr/bin/env node

/**
 * Rotation des backups PostgreSQL
 * Supprime les backups plus vieux que BACKUP_RETENTION_DAYS (défaut: 14).
 *
 * Usage: node scripts/rotate-backups.js
 * Peut être appelé indépendamment ou automatiquement par backup-postgres.js
 */

const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10)

if (!fs.existsSync(BACKUP_DIR)) {
  console.log(`Dossier ${BACKUP_DIR} inexistant. Rien à faire.`)
  process.exit(0)
}

const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
const files = fs.readdirSync(BACKUP_DIR)
  .filter((f) => f.startsWith('backup_') && f.endsWith('.sql'))
  .map((f) => ({
    name: f,
    path: path.join(BACKUP_DIR, f),
    mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
  }))

const toDelete = files.filter((f) => f.mtime < cutoff)
if (toDelete.length === 0) {
  console.log(`Aucun backup > ${RETENTION_DAYS} jours.`)
  process.exit(0)
}

toDelete.forEach((f) => {
  fs.unlinkSync(f.path)
  console.log(`Supprimé: ${f.name}`)
})
console.log(`Rotation: ${toDelete.length} fichier(s) supprimé(s)`)
