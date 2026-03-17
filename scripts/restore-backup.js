#!/usr/bin/env node

/**
 * Restauration PostgreSQL — DOUMA Dental Manager
 * Restaure un backup .sql via psql.
 *
 * Usage: node scripts/restore-backup.js <fichier.sql>
 * Exemple: node scripts/restore-backup.js backups/backup_20260317.sql
 *
 * ATTENTION: Écrase les données existantes. À utiliser avec précaution.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL

const fileArg = process.argv[2]
if (!fileArg) {
  console.error('Usage: node scripts/restore-backup.js <fichier.sql>')
  console.error('Exemple: node scripts/restore-backup.js backups/backup_20260317.sql')
  process.exit(1)
}

const filepath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg)
if (!fs.existsSync(filepath)) {
  console.error('❌ Fichier introuvable:', filepath)
  process.exit(1)
}

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

const pg = parsePgUrl(DATABASE_URL)
const env = { ...process.env, PGPASSWORD: pg.password }

console.log('⚠️  Restauration en cours — les données existantes seront remplacées.')
console.log(`   Fichier: ${filepath}`)
console.log(`   Base: ${pg.database}@${pg.host}`)

const absPath = path.resolve(filepath)
try {
  execSync(`psql --host=${pg.host} --port=${pg.port} --username=${pg.user} --dbname=${pg.database} -f "${absPath}"`, {
    env,
    stdio: 'inherit',
    shell: true,
  })
  console.log('✅ Restauration terminée.')
} catch (err) {
  console.error('❌ Erreur:', err.message)
  process.exit(1)
}
