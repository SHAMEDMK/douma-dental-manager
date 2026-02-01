const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔧 Correction des assignations de livraison...\n')

  // Get all SHIPPED orders with incorrect assignments
  const shippedOrders = await prisma.order.findMany({
    where: { status: 'SHIPPED' },
    select: {
      id: true,
      orderNumber: true,
      deliveryAgentName: true
    }
  })

  // Get all delivery agents
  const deliveryAgents = await prisma.user.findMany({
    where: { role: 'MAGASINIER' },
    select: {
      id: true,
      email: true,
      name: true
    }
  })

  if (deliveryAgents.length === 0) {
    console.log('❌ Aucun livreur trouvé. Créez d\'abord un compte livreur.')
    return
  }

  console.log(`📦 Commandes à corriger: ${shippedOrders.length}`)
  console.log(`👤 Livreurs disponibles: ${deliveryAgents.length}\n`)

  // If there's only one agent, reassign all orders to them
  if (deliveryAgents.length === 1) {
    const agent = deliveryAgents[0]
    console.log(`✅ Un seul livreur trouvé: ${agent.name} (${agent.email})`)
    console.log(`   Réassignation de toutes les commandes à ce livreur...\n`)

    for (const order of shippedOrders) {
      if (order.deliveryAgentName !== agent.name && order.deliveryAgentName !== agent.email) {
        await prisma.order.update({
          where: { id: order.id },
          data: { deliveryAgentName: agent.name }
        })
        console.log(`   ✓ Commande ${order.orderNumber || order.id.slice(-8)} → ${agent.name}`)
      }
    }
  } else {
    // Multiple agents - ask user to choose or reassign to first one
    console.log('⚠️  Plusieurs livreurs trouvés. Réassignation au premier livreur par défaut.\n')
    const agent = deliveryAgents[0]
    
    for (const order of shippedOrders) {
      if (order.deliveryAgentName !== agent.name && order.deliveryAgentName !== agent.email) {
        await prisma.order.update({
          where: { id: order.id },
          data: { deliveryAgentName: agent.name }
        })
        console.log(`   ✓ Commande ${order.orderNumber || order.id.slice(-8)} → ${agent.name}`)
      }
    }
  }

  console.log('\n✅ Correction terminée!\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
