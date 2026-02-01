/**
 * Script pour identifier et nettoyer les doublons d'emails (différence de casse)
 * 
 * Usage:
 *   npx tsx scripts/cleanup-duplicate-emails.ts          # Mode aperçu (ne supprime rien)
 *   npx tsx scripts/cleanup-duplicate-emails.ts --fix    # Mode correction (supprime les doublons)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const fixMode = process.argv.includes('--fix')
  
  console.log('='.repeat(60))
  console.log(fixMode ? '🔧 MODE CORRECTION (--fix)' : '👀 MODE APERÇU (ajouter --fix pour corriger)')
  console.log('='.repeat(60))
  console.log()

  // 1. Trouver tous les emails en double (insensible à la casse)
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Grouper par email en minuscules
  const emailGroups = new Map<string, typeof allUsers>()
  
  for (const user of allUsers) {
    const lowerEmail = user.email.toLowerCase()
    if (!emailGroups.has(lowerEmail)) {
      emailGroups.set(lowerEmail, [])
    }
    emailGroups.get(lowerEmail)!.push(user)
  }

  // Filtrer les groupes avec plus d'un utilisateur (doublons)
  const duplicates = Array.from(emailGroups.entries())
    .filter(([_, users]) => users.length > 1)

  if (duplicates.length === 0) {
    console.log('✅ Aucun doublon trouvé !')
    return
  }

  console.log(`⚠️  ${duplicates.length} groupe(s) de doublons trouvé(s):\n`)

  for (const [email, users] of duplicates) {
    console.log(`📧 Email: ${email}`)
    console.log('-'.repeat(40))
    
    // Trier: garder celui avec le plus de commandes, sinon le plus ancien
    const sorted = [...users].sort((a, b) => {
      // Priorité 1: nombre de commandes
      if (b._count.orders !== a._count.orders) {
        return b._count.orders - a._count.orders
      }
      // Priorité 2: date de création (plus ancien = garder)
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const toKeep = sorted[0]
    const toDelete = sorted.slice(1)

    console.log(`  ✅ GARDER: ${toKeep.name} (${toKeep.email})`)
    console.log(`     ID: ${toKeep.id}`)
    console.log(`     Rôle: ${toKeep.role}`)
    console.log(`     Commandes: ${toKeep._count.orders}`)
    console.log(`     Créé le: ${toKeep.createdAt.toLocaleDateString('fr-FR')}`)
    console.log()

    for (const user of toDelete) {
      console.log(`  ❌ SUPPRIMER: ${user.name} (${user.email})`)
      console.log(`     ID: ${user.id}`)
      console.log(`     Rôle: ${user.role}`)
      console.log(`     Commandes: ${user._count.orders}`)
      console.log(`     Créé le: ${user.createdAt.toLocaleDateString('fr-FR')}`)

      if (fixMode) {
        if (user._count.orders > 0) {
          console.log(`     ⚠️  ATTENTION: Cet utilisateur a des commandes !`)
          console.log(`     🔄 Transfert des commandes vers ${toKeep.email}...`)
          
          // Transférer les commandes
          await prisma.order.updateMany({
            where: { userId: user.id },
            data: { userId: toKeep.id }
          })
          console.log(`     ✅ Commandes transférées`)
        }

        // Supprimer l'utilisateur
        try {
          await prisma.user.delete({
            where: { id: user.id }
          })
          console.log(`     ✅ Utilisateur supprimé`)
        } catch (error: any) {
          console.log(`     ❌ Erreur: ${error.message}`)
        }
      }
      console.log()
    }

    // Si mode fix, normaliser l'email du compte gardé en minuscules
    if (fixMode && toKeep.email !== toKeep.email.toLowerCase()) {
      console.log(`  🔄 Normalisation de l'email en minuscules...`)
      await prisma.user.update({
        where: { id: toKeep.id },
        data: { email: toKeep.email.toLowerCase() }
      })
      console.log(`  ✅ Email normalisé: ${toKeep.email.toLowerCase()}`)
    }

    console.log()
  }

  // 2. Normaliser tous les emails en minuscules
  if (fixMode) {
    console.log('='.repeat(60))
    console.log('🔄 Normalisation de TOUS les emails en minuscules...')
    console.log('='.repeat(60))
    
    const usersWithUppercase = await prisma.user.findMany({
      where: {
        email: {
          not: {
            equals: prisma.user.fields.email,
          }
        }
      },
      select: { id: true, email: true }
    })

    // Utiliser une requête brute pour trouver les emails avec majuscules
    const allUsersForNorm = await prisma.user.findMany({
      select: { id: true, email: true }
    })

    let normalized = 0
    for (const user of allUsersForNorm) {
      const lower = user.email.toLowerCase()
      if (user.email !== lower) {
        // Vérifier qu'il n'y a pas déjà un utilisateur avec cet email en minuscules
        const existing = await prisma.user.findUnique({
          where: { email: lower }
        })
        
        if (!existing) {
          await prisma.user.update({
            where: { id: user.id },
            data: { email: lower }
          })
          console.log(`  ✅ ${user.email} → ${lower}`)
          normalized++
        } else {
          console.log(`  ⚠️  ${user.email} - doublon existe déjà en minuscules, ignoré`)
        }
      }
    }

    if (normalized === 0) {
      console.log('  Tous les emails sont déjà en minuscules.')
    } else {
      console.log(`\n✅ ${normalized} email(s) normalisé(s)`)
    }
  }

  console.log()
  console.log('='.repeat(60))
  if (!fixMode) {
    console.log('💡 Pour appliquer les corrections, exécutez:')
    console.log('   npx tsx scripts/cleanup-duplicate-emails.ts --fix')
  } else {
    console.log('✅ Nettoyage terminé !')
  }
  console.log('='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
