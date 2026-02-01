#!/usr/bin/env node

/**
 * Copy Backups to External Location
 * 
 * This script copies backup files to an external location (USB drive, network share, cloud sync folder, etc.)
 * 
 * Usage:
 *   node scripts/copy-backups.js
 *   node scripts/copy-backups.js --destination /path/to/external/drive
 *   node scripts/copy-backups.js --destination D:\Backups --keep-days 7
 * 
 * Environment Variables:
 *   BACKUP_DIR - Source directory (default: ./backups)
 *   BACKUP_COPY_DESTINATION - Destination directory (can be overridden with --destination)
 *   BACKUP_COPY_KEEP_DAYS - Keep only backups from last N days (default: 30)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

// Parse command line arguments
const args = process.argv.slice(2)
const destinationIndex = args.indexOf('--destination')
const keepDaysIndex = args.indexOf('--keep-days')

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const DESTINATION = destinationIndex !== -1 && args[destinationIndex + 1]
  ? args[destinationIndex + 1]
  : process.env.BACKUP_COPY_DESTINATION
const KEEP_DAYS = keepDaysIndex !== -1 && args[keepDaysIndex + 1]
  ? parseInt(args[keepDaysIndex + 1], 10)
  : parseInt(process.env.BACKUP_COPY_KEEP_DAYS || '30', 10)

if (!DESTINATION) {
  console.error('❌ Erreur: Destination non spécifiée')
  console.error('')
  console.error('Usage:')
  console.error('  node scripts/copy-backups.js --destination /path/to/destination')
  console.error('  node scripts/copy-backups.js --destination D:\\Backups')
  console.error('')
  console.error('Ou définissez BACKUP_COPY_DESTINATION dans .env')
  console.error('')
  process.exit(1)
}

// Check if source directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  console.error(`❌ Erreur: Le dossier source n'existe pas: ${BACKUP_DIR}`)
  process.exit(1)
}

// Create destination directory if it doesn't exist
if (!fs.existsSync(DESTINATION)) {
  console.log(`📁 Création du dossier de destination: ${DESTINATION}`)
  try {
    fs.mkdirSync(DESTINATION, { recursive: true })
  } catch (error) {
    console.error(`❌ Erreur lors de la création du dossier: ${error.message}`)
    process.exit(1)
  }
}

// Check if destination is writable
try {
  const testFile = path.join(DESTINATION, '.write-test')
  fs.writeFileSync(testFile, 'test')
  fs.unlinkSync(testFile)
} catch (error) {
  console.error(`❌ Erreur: Le dossier de destination n'est pas accessible en écriture: ${DESTINATION}`)
  console.error(`   ${error.message}`)
  process.exit(1)
}

console.log('📦 Copie des backups vers un support externe')
console.log(`   Source: ${BACKUP_DIR}`)
console.log(`   Destination: ${DESTINATION}`)
console.log(`   Conservation: ${KEEP_DAYS} jours`)
console.log('')

// Get all backup files (exclude metadata.json)
const backupFiles = fs.readdirSync(BACKUP_DIR)
  .filter(filename => !filename.endsWith('.json'))
  .map(filename => {
    const filePath = path.join(BACKUP_DIR, filename)
    const stats = fs.statSync(filePath)
    return {
      filename,
      sourcePath: filePath,
      size: stats.size,
      createdAt: stats.birthtime,
    }
  })
  .filter(file => {
    // Filter by date if KEEP_DAYS is set
    if (KEEP_DAYS > 0) {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - KEEP_DAYS)
      return file.createdAt >= daysAgo
    }
    return true
  })
  .sort((a, b) => b.createdAt - a.createdAt)

if (backupFiles.length === 0) {
  console.log('⚠️  Aucun backup à copier (soit aucun backup, soit tous sont plus anciens que la limite)')
  process.exit(0)
}

console.log(`📋 ${backupFiles.length} backup(s) à copier\n`)

let copied = 0
let skipped = 0
let errors = 0
let totalSize = 0

backupFiles.forEach((file, index) => {
  const destPath = path.join(DESTINATION, file.filename)
  const exists = fs.existsSync(destPath)
  
  // Check if file already exists and is the same size
  if (exists) {
    try {
      const destStats = fs.statSync(destPath)
      if (destStats.size === file.size) {
        console.log(`⏭️  [${index + 1}/${backupFiles.length}] ${file.filename} (déjà présent, ignoré)`)
        skipped++
        return
      }
    } catch (error) {
      // If we can't read the existing file, we'll overwrite it
    }
  }

  try {
    console.log(`📄 [${index + 1}/${backupFiles.length}] Copie de ${file.filename}...`)
    fs.copyFileSync(file.sourcePath, destPath)
    copied++
    totalSize += file.size
    console.log(`   ✅ Copié (${(file.size / 1024).toFixed(2)} KB)`)
  } catch (error) {
    console.error(`   ❌ Erreur: ${error.message}`)
    errors++
  }
})

console.log('')
console.log('📊 Résumé:')
console.log(`   ✅ Copiés: ${copied}`)
console.log(`   ⏭️  Ignorés (déjà présents): ${skipped}`)
if (errors > 0) {
  console.log(`   ❌ Erreurs: ${errors}`)
}
console.log(`   📦 Taille totale copiée: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)

if (errors > 0) {
  process.exit(1)
}

console.log('')
console.log('✅ Copie terminée avec succès!')
