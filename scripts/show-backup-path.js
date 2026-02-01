#!/usr/bin/env node

/**
 * Show Backup Directory Path
 * 
 * This script displays the exact path where backups are stored
 * 
 * Usage:
 *   node scripts/show-backup-path.js
 */

const path = require('path')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')

console.log('📁 Emplacement du dossier backups:')
console.log('')
console.log(`   ${BACKUP_DIR}`)
console.log('')

// Check if directory exists
if (fs.existsSync(BACKUP_DIR)) {
  console.log('✅ Le dossier existe')
  
  // Count backup files
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(filename => !filename.endsWith('.json'))
    
    console.log(`📦 Nombre de backups: ${files.length}`)
    
    if (files.length > 0) {
      // Get total size
      let totalSize = 0
      files.forEach(filename => {
        const filePath = path.join(BACKUP_DIR, filename)
        try {
          const stats = fs.statSync(filePath)
          totalSize += stats.size
        } catch (err) {
          // Ignore errors
        }
      })
      
      console.log(`💾 Taille totale: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
      
      // Show latest backup
      const filesWithStats = files.map(filename => {
        const filePath = path.join(BACKUP_DIR, filename)
        try {
          const stats = fs.statSync(filePath)
          return {
            filename,
            createdAt: stats.birthtime,
            size: stats.size
          }
        } catch (err) {
          return null
        }
      }).filter(f => f !== null)
        .sort((a, b) => b.createdAt - a.createdAt)
      
      if (filesWithStats.length > 0) {
        const latest = filesWithStats[0]
        console.log(`🕐 Dernier backup: ${latest.filename}`)
        console.log(`   Date: ${latest.createdAt.toLocaleString('fr-FR')}`)
        console.log(`   Taille: ${(latest.size / 1024).toFixed(2)} KB`)
      }
    }
  } catch (err) {
    console.log('⚠️  Erreur lors de la lecture du dossier:', err.message)
  }
} else {
  console.log('⚠️  Le dossier n\'existe pas encore')
  console.log('   Il sera créé automatiquement lors du premier backup')
}

console.log('')
console.log('💡 Pour ouvrir ce dossier:')
if (process.platform === 'win32') {
  console.log(`   explorer "${BACKUP_DIR}"`)
} else if (process.platform === 'darwin') {
  console.log(`   open "${BACKUP_DIR}"`)
} else {
  console.log(`   xdg-open "${BACKUP_DIR}"`)
}
