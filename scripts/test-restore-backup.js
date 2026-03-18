#!/usr/bin/env node

/**
 * Test de restauration — DOUMA Dental Manager
 * Vérifie qu'un backup est restaurable en le restaurant dans une DB temporaire.
 *
 * Usage: node scripts/test-restore-backup.js [fichier.sql]
 *        Si aucun fichier : utilise le dernier backup dans backups/
 *
 * Env: DATABASE_URL ou DIRECT_URL (PostgreSQL requis)
 *
 * Note: Certains hébergeurs cloud peuvent restreindre CREATE DATABASE.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')

const fileArg = process.argv[2]

if (!DATABASE_URL || (!DATABASE_URL.includes('postgresql') && !DATABASE_URL.includes('postgres'))) {
  console.error('❌ DATABASE_URL (PostgreSQL) requise dans .env')
  process.exit(1)
}

function parsePgUrl(url) {
  const u = new URL(url.replace(/^postgresql:/, 'http:').replace(/^postgres:/, 'http:'))
  const dbName = u.pathname.replace(/^\//, '').split('?')[0]
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: u.username || 'postgres',
    password: u.password || '',
    database: dbName || 'postgres',
  }
}

function getBackupFile() {
  if (fileArg) {
    const filepath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg)
    if (!fs.existsSync(filepath)) {
      console.error('❌ Fichier introuvable:', filepath)
      process.exit(1)
    }
    return filepath
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('❌ Dossier backups inexistant. Lancez d\'abord un backup.')
    process.exit(1)
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.sql'))
    .map((f) => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (files.length === 0) {
    console.error('❌ Aucun backup trouvé dans', BACKUP_DIR)
    process.exit(1)
  }

  return files[0].path
}

const pg = parsePgUrl(DATABASE_URL)
const baseDb = 'postgres' // DB système pour CREATE/DROP DATABASE

try {
  const filepath = getBackupFile()
  const filename = path.basename(filepath)
  const tempDb = `douma_backup_test_${Date.now()}`

  console.log('🧪 Test de restauration')
  console.log(`   Fichier: ${filename}`)
  console.log(`   DB temporaire: ${tempDb}`)

  // 1. Créer la DB temporaire
  try {
    execSync(
      `psql --host=${pg.host} --port=${pg.port} --username=${pg.user} --dbname=${baseDb} -c "CREATE DATABASE ${tempDb}"`,
      { env: { ...process.env, PGPASSWORD: pg.password }, stdio: 'pipe', shell: true }
    )
  } catch (err) {
    console.error('❌ Impossible de créer la DB temporaire.')
    console.error('   (Certains hébergeurs cloud restreignent CREATE DATABASE.)')
    process.exit(1)
  }

  // 2. Restaurer le backup
  const absPath = path.resolve(filepath)
  try {
    execSync(
      `psql --host=${pg.host} --port=${pg.port} --username=${pg.user} --dbname=${tempDb} -f "${absPath}"`,
      { env: { ...process.env, PGPASSWORD: pg.password }, stdio: 'pipe', shell: true }
    )
  } catch (err) {
    execSync(
      `psql --host=${pg.host} --port=${pg.port} --username=${pg.user} --dbname=${baseDb} -c "DROP DATABASE IF EXISTS ${tempDb}"`,
      { env: { ...process.env, PGPASSWORD: pg.password }, stdio: 'pipe', shell: true }
    )
    console.error('❌ Restauration échouée:', err.message)
    process.exit(1)
  }

  // 3. Supprimer la DB temporaire (FORCE termine les connexions, PG 13+)
  execSync(
    `psql --host=${pg.host} --port=${pg.port} --username=${pg.user} --dbname=${baseDb} -c "DROP DATABASE IF EXISTS ${tempDb} WITH (FORCE)"`,
    { env: { ...process.env, PGPASSWORD: pg.password }, stdio: 'pipe', shell: true }
  )

  console.log('✅ Backup récupérable')
  process.exit(0)
} catch (err) {
  if (err.status !== undefined && err.status !== 0) {
    console.error('❌ Erreur:', err.message)
    process.exit(1)
  }
  throw err
}
