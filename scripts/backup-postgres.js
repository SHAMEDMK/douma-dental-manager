#!/usr/bin/env node

/**
 * Backup PostgreSQL — DOUMA Dental Manager
 * Génère backup_YYYYMMDD.sql via pg_dump.
 * Optionnel : copie vers BACKUP_REMOTE_DIR (dossier réseau).
 * Appelle la rotation après le backup.
 *
 * Usage: node scripts/backup-postgres.js
 * Env: DATABASE_URL ou DIRECT_URL (PostgreSQL requis)
 *      BACKUP_REMOTE_DIR (optionnel, ex: \\NAS\backups\douma)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const BACKUP_REMOTE_DIR = process.env.BACKUP_REMOTE_DIR?.trim() || ''
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10)

if (!DATABASE_URL || (!DATABASE_URL.includes('postgresql') && !DATABASE_URL.includes('postgres'))) {
  console.error('❌ DATABASE_URL (PostgreSQL) requise. Vérifiez .env')
  process.exit(1)
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
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

const MIN_BACKUP_SIZE_BYTES = 1024 // 1 KB

function backup() {
  const pg = parsePgUrl(DATABASE_URL)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `backup_${dateStr}.sql`
  const filepath = path.join(BACKUP_DIR, filename)

  const pgDumpCmd = [
    'pg_dump',
    `--host=${pg.host}`,
    `--port=${pg.port}`,
    `--username=${pg.user}`,
    `--dbname=${pg.database}`,
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
  ].join(' ')

  const env = { ...process.env, PGPASSWORD: pg.password }

  console.log('📦 Backup PostgreSQL...')
  const cmd = `${pgDumpCmd} > "${filepath}"`

  try {
    execSync(cmd, { env, shell: true })
  } catch (err) {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    throw new Error(`pg_dump a échoué (code ${err.status ?? 'inconnu'}): ${err.message}`)
  }

  const stats = fs.statSync(filepath)
  if (stats.size < MIN_BACKUP_SIZE_BYTES) {
    fs.unlinkSync(filepath)
    throw new Error(`Backup trop petit (${stats.size} octets < 1 KB) — dump probablement incomplet`)
  }

  console.log(`✅ ${filename} (${(stats.size / 1024).toFixed(1)} KB)`)
  return filepath
}

function copyToRemote(localPath) {
  if (!BACKUP_REMOTE_DIR) return

  const filename = path.basename(localPath)
  const remotePath = path.join(BACKUP_REMOTE_DIR, filename)

  try {
    if (!fs.existsSync(BACKUP_REMOTE_DIR)) {
      fs.mkdirSync(BACKUP_REMOTE_DIR, { recursive: true })
    }
    fs.copyFileSync(localPath, remotePath)
    console.log(`📤 Copie distante: ${remotePath}`)
  } catch (err) {
    console.warn(`⚠️ Copie distante échouée:`, err.message)
  }
}

function rotate() {
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
    console.log(`🧹 Rotation: aucun backup > ${RETENTION_DAYS} jours à supprimer`)
    return
  }

  toDelete.forEach((f) => {
    fs.unlinkSync(f.path)
    console.log(`   Supprimé: ${f.name}`)
  })
  console.log(`🧹 Rotation: ${toDelete.length} backup(s) supprimé(s)`)
}

try {
  const filepath = backup()
  copyToRemote(filepath)
  rotate()
  console.log('Backup réussi')
  process.exit(0)
} catch (err) {
  console.error('Backup échoué:', err.message)
  process.exit(1)
}
