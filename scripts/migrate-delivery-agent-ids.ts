/**
 * Script de migration pour mettre à jour les deliveryAgentId manquants
 * 
 * Ce script trouve toutes les commandes SHIPPED avec deliveryAgentId = null
 * et essaie de les corriger en utilisant deliveryAgentName pour trouver l'utilisateur correspondant.
 * 
 * Usage:
 *   npx tsx scripts/migrate-delivery-agent-ids.ts
 * 
 * Ou avec ts-node:
 *   npx ts-node scripts/migrate-delivery-agent-ids.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateDeliveryAgentIds() {
  console.log('🔍 Recherche des commandes SHIPPED avec deliveryAgentId manquant...\n')

  // Trouver toutes les commandes SHIPPED avec deliveryAgentId = null mais avec deliveryAgentName
  const ordersToFix = await prisma.order.findMany({
    where: {
      status: 'SHIPPED',
      deliveryAgentId: null,
      deliveryAgentName: {
        not: null
      }
    },
    select: {
      id: true,
      orderNumber: true,
      deliveryAgentName: true,
      deliveryAgentId: true
    }
  })

  console.log(`📦 Trouvé ${ordersToFix.length} commande(s) à corriger\n`)

  if (ordersToFix.length === 0) {
    console.log('✅ Aucune commande à corriger. Migration terminée.')
    await prisma.$disconnect()
    return
  }

  let successCount = 0
  let notFoundCount = 0
  let errorCount = 0

  for (const order of ordersToFix) {
    const agentName = order.deliveryAgentName?.trim()
    if (!agentName) {
      console.log(`⚠️  Commande ${order.orderNumber || order.id}: deliveryAgentName est vide, ignorée`)
      notFoundCount++
      continue
    }

    try {
      // Chercher l'utilisateur par nom (exact match et variations de casse)
      // On cherche parmi les utilisateurs avec role MAGASINIER (livreurs)
      // D'abord, essayer de trouver parmi les livreurs (userType='LIVREUR' ou null)
      
      // Essayer plusieurs variations de casse pour le matching
      const nameVariations = [
        agentName,
        agentName.toUpperCase(),
        agentName.toLowerCase(),
        agentName.charAt(0).toUpperCase() + agentName.slice(1).toLowerCase()
      ]
      
      const user = await prisma.user.findFirst({
        where: {
          AND: [
            {
              role: 'MAGASINIER'
            },
            {
              OR: [
                { userType: 'LIVREUR' },
                { userType: null }
              ]
            },
            {
              OR: [
                { name: { in: nameVariations } },
                { email: { in: nameVariations } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          userType: true
        }
      })

      if (!user) {
        // Si pas trouvé, essayer une recherche plus large (sans filtre userType)
        const userFallback = await prisma.user.findFirst({
          where: {
            AND: [
              {
                role: 'MAGASINIER'
              },
              {
                OR: [
                  { name: { in: nameVariations } },
                  { email: { in: nameVariations } }
                ]
              }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            userType: true
          }
        })

        if (userFallback) {
          console.log(`✅ Commande ${order.orderNumber || order.id}: Trouvé "${userFallback.name}" (${userFallback.email}) - ID: ${userFallback.id}`)
          
          await prisma.order.update({
            where: { id: order.id },
            data: { deliveryAgentId: userFallback.id }
          })
          
          successCount++
        } else {
          console.log(`❌ Commande ${order.orderNumber || order.id}: Aucun utilisateur trouvé pour "${agentName}"`)
          notFoundCount++
        }
      } else {
        console.log(`✅ Commande ${order.orderNumber || order.id}: Trouvé "${user.name}" (${user.email}) - ID: ${user.id}`)
        
        await prisma.order.update({
          where: { id: order.id },
          data: { deliveryAgentId: user.id }
        })
        
        successCount++
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour de la commande ${order.orderNumber || order.id}:`, error)
      errorCount++
    }
  }

  console.log('\n📊 Résumé de la migration:')
  console.log(`   ✅ ${successCount} commande(s) corrigée(s)`)
  console.log(`   ⚠️  ${notFoundCount} commande(s) non trouvée(s)`)
  console.log(`   ❌ ${errorCount} erreur(s)`)

  if (notFoundCount > 0) {
    console.log('\n💡 Pour les commandes non trouvées, vérifiez que:')
    console.log('   - Le nom du livreur dans deliveryAgentName correspond exactement au nom ou email dans la table User')
    console.log('   - L\'utilisateur existe avec le rôle MAGASINIER')
    console.log('   - L\'utilisateur a userType=\'LIVREUR\' ou null')
  }

  await prisma.$disconnect()
  console.log('\n✅ Migration terminée.')
}

// Exécuter le script
migrateDeliveryAgentIds()
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
