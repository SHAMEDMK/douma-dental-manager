#!/usr/bin/env node

/**
 * Database Backup Script
 * Supports SQLite and PostgreSQL
 * 
 * Usage:
 *   node scripts/backup-db.js
 *   node scripts/backup-db.js --manual
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db'
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30', 10) // Keep last 30 backups
const isManual = process.argv.includes('--manual')

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

function generateBackupFilename(dbType, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const randomSuffix = crypto.randomBytes(4).toString('hex')
  const prefix = isManual ? 'manual' : 'auto'
  return `${prefix}-${timestamp}-${randomSuffix}.${extension}`
}

function backupSQLite() {
  console.log('📦 Starting SQLite backup...')
  
  // Extract database path from DATABASE_URL (format: "file:./dev.db" or "file:./path/to/db")
  const dbPath = DATABASE_URL.replace(/^file:/, '').replace(/^\./, process.cwd())
  
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`)
  }

  const backupFilename = generateBackupFilename('sqlite', 'db')
  const backupPath = path.join(BACKUP_DIR, backupFilename)

  // Copy database file
  fs.copyFileSync(dbPath, backupPath)

  const stats = fs.statSync(backupPath)
  console.log(`✅ SQLite backup created: ${backupFilename}`)
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`)
  console.log(`   Path: ${backupPath}`)

  return {
    filename: backupFilename,
    path: backupPath,
    size: stats.size,
    type: 'SQLite',
    createdAt: new Date().toISOString(),
  }
}

function backupPostgreSQL() {
  console.log('📦 Starting PostgreSQL backup...')

  // Parse DATABASE_URL (format: "postgresql://user:password@host:port/database?schema=public")
  const url = new URL(DATABASE_URL.replace(/^postgresql:/, 'http:') || 'http://localhost/db')
  const dbName = url.pathname.replace(/^\//, '').split('?')[0]
  const host = url.hostname
  const port = url.port || '5432'
  const user = url.username || 'postgres'
  const password = url.password || ''

  const backupFilename = generateBackupFilename('postgres', 'sql')
  const backupPath = path.join(BACKUP_DIR, backupFilename)

  // Use pg_dump to create backup
  // Note: pg_dump must be installed and in PATH
  const pgDumpCmd = [
    'pg_dump',
    `--host=${host}`,
    `--port=${port}`,
    `--username=${user}`,
    `--dbname=${dbName}`,
    '--format=custom',
    '--file', backupPath,
    '--no-password', // Use PGPASSWORD env var instead
  ].join(' ')

  try {
    // Set password as environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: password }
    execSync(pgDumpCmd, { env, stdio: 'pipe' })

    const stats = fs.statSync(backupPath)
    console.log(`✅ PostgreSQL backup created: ${backupFilename}`)
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`)
    console.log(`   Path: ${backupPath}`)

    return {
      filename: backupFilename,
      path: backupPath,
      size: stats.size,
      type: 'PostgreSQL',
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    // Fallback to plain SQL dump if custom format fails
    console.warn('⚠️  Custom format backup failed, trying plain SQL...')
    const sqlBackupPath = backupPath.replace('.custom', '.sql')
    const sqlCmd = pgDumpCmd.replace('--format=custom', '').replace(backupPath, sqlBackupPath)
    
    execSync(sqlCmd, { env, stdio: 'pipe' })
    
    const stats = fs.statSync(sqlBackupPath)
    console.log(`✅ PostgreSQL backup created (SQL format): ${backupFilename.replace('.custom', '.sql')}`)
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`)
    
    return {
      filename: backupFilename.replace('.custom', '.sql'),
      path: sqlBackupPath,
      size: stats.size,
      type: 'PostgreSQL',
      createdAt: new Date().toISOString(),
    }
  }
}

function cleanupOldBackups() {
  console.log(`🧹 Cleaning up old backups (keeping last ${MAX_BACKUPS})...`)

  const files = fs.readdirSync(BACKUP_DIR)
    .map(filename => {
      const filePath = path.join(BACKUP_DIR, filename)
      const stats = fs.statSync(filePath)
      return {
        filename,
        path: filePath,
        createdAt: stats.birthtime,
        size: stats.size,
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt) // Sort by date, newest first

  if (files.length <= MAX_BACKUPS) {
    console.log(`   No cleanup needed (${files.length} backups, limit: ${MAX_BACKUPS})`)
    return
  }

  const filesToDelete = files.slice(MAX_BACKUPS)
  let totalFreed = 0

  filesToDelete.forEach(file => {
    fs.unlinkSync(file.path)
    totalFreed += file.size
    console.log(`   Deleted: ${file.filename}`)
  })

  console.log(`✅ Cleanup complete: removed ${filesToDelete.length} backups`)
  console.log(`   Freed: ${(totalFreed / 1024).toFixed(2)} KB`)
}

function getBackupInfo() {
  const files = fs.readdirSync(BACKUP_DIR)
    .map(filename => {
      const filePath = path.join(BACKUP_DIR, filename)
      const stats = fs.statSync(filePath)
      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        type: filename.includes('postgres') ? 'PostgreSQL' : 'SQLite',
      }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return {
    total: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    backups: files,
  }
}

// Main execution
try {
  let backupResult

  if (DATABASE_URL.startsWith('file:') || DATABASE_URL.includes('sqlite')) {
    backupResult = backupSQLite()
  } else if (DATABASE_URL.includes('postgresql') || DATABASE_URL.includes('postgres')) {
    backupResult = backupPostgreSQL()
  } else {
    throw new Error(`Unsupported database URL format: ${DATABASE_URL}`)
  }

  // Cleanup old backups
  cleanupOldBackups()

  // Save backup metadata
  const metadataPath = path.join(BACKUP_DIR, 'metadata.json')
  let metadata = []
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
  }
  metadata.unshift(backupResult)
  // Keep only last 100 metadata entries
  metadata = metadata.slice(0, 100)
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

  const info = getBackupInfo()
  console.log('\n📊 Backup Summary:')
  console.log(`   Total backups: ${info.total}`)
  console.log(`   Total size: ${(info.totalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`   Latest: ${backupResult.filename}`)

  process.exit(0)
} catch (error) {
  console.error('❌ Backup failed:', error.message)
  console.error(error.stack)
  process.exit(1)
}
