/**
 * Script pour corriger les utilisateurs MAGASINIER mal classés
 * 
 * Ce script trouve tous les utilisateurs avec role='MAGASINIER' et userType=null
 * et permet de les corriger en masse.
 * 
 * Usage:
 *   npx tsx scripts/fix-misclassified-users.ts [--target=MAGASINIER|LIVREUR]
 * 
 * Par défaut, corrige en 'MAGASINIER' (warehouse)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMisclassifiedUsers() {
  const targetType = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1] as 'MAGASINIER' | 'LIVREUR' | undefined || 'MAGASINIER'

  console.log('🔍 Recherche des utilisateurs MAGASINIER avec userType=null...\n')
  console.log('⚠️  ATTENTION: Ce script corrige TOUS les utilisateurs avec userType=null.')
  console.log('   Si certains utilisateurs sont déjà correctement classés (livreurs avec userType=null),')
  console.log('   utilisez plutôt les boutons de correction dans l\'interface admin (/admin/users).\n')

  // Trouver tous les utilisateurs avec role=MAGASINIER et userType=null
  const misclassifiedUsers = await prisma.user.findMany({
    where: {
      role: 'MAGASINIER',
      userType: null
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      userType: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`📦 Trouvé ${misclassifiedUsers.length} utilisateur(s) à corriger\n`)

  if (misclassifiedUsers.length === 0) {
    console.log('✅ Aucun utilisateur à corriger. Tous les utilisateurs ont un userType défini.')
    await prisma.$disconnect()
    return
  }

  // Afficher la liste des utilisateurs
  console.log('Utilisateurs à corriger :')
  misclassifiedUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.name} (${user.email}) - Créé le ${user.createdAt.toLocaleDateString('fr-FR')}`)
  })

  console.log(`\n🎯 Type cible : ${targetType === 'MAGASINIER' ? 'Magasinier (warehouse)' : 'Livreur (delivery)'}\n`)

  let successCount = 0
  let errorCount = 0

  for (const user of misclassifiedUsers) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { userType: targetType }
      })
      
      console.log(`✅ ${user.name} (${user.email}) → ${targetType}`)
      successCount++
    } catch (error) {
      console.error(`❌ Erreur lors de la correction de ${user.name}:`, error)
      errorCount++
    }
  }

  console.log('\n📊 Résumé de la correction:')
  console.log(`   ✅ ${successCount} utilisateur(s) corrigé(s)`)
  if (errorCount > 0) {
    console.log(`   ❌ ${errorCount} erreur(s)`)
  }

  await prisma.$disconnect()
  console.log('\n✅ Correction terminée.')
}

// Exécuter le script
fixMisclassifiedUsers()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
