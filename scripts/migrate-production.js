#!/usr/bin/env node
/**
 * Applique les migrations Prisma sur la base Vercel Production.
 * Prérequis : fichier .env.production avec DATABASE_URL et DIRECT_URL (copiés depuis Vercel).
 *
 * Usage : npm run db:migrate:deploy:production
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, '..', '.env.production')
if (!fs.existsSync(envPath)) {
  console.error(
    'Fichier .env.production introuvable.\n' +
      'Créez-le avec DATABASE_URL et DIRECT_URL copiés depuis Vercel → Settings → Environment Variables → Production.'
  )
  process.exit(1)
}

require('dotenv').config({ path: envPath })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant dans .env.production')
  process.exit(1)
}

const host = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
console.log('Migration deploy →', host)

execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
