const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔍 Vérification des assignations de livraison...\n')

  // Get all SHIPPED orders
  const shippedOrders = await prisma.order.findMany({
    where: { status: 'SHIPPED' },
    select: {
      id: true,
      orderNumber: true,
      deliveryAgentName: true,
      shippedAt: true
    }
  })

  console.log(`📦 Commandes expédiées (SHIPPED): ${shippedOrders.length}\n`)

  if (shippedOrders.length > 0) {
    shippedOrders.forEach((order, index) => {
      console.log(`${index + 1}. Commande ${order.orderNumber || order.id.slice(-8)}`)
      console.log(`   - Livreur assigné: ${order.deliveryAgentName || '(non assigné)'}`)
      console.log(`   - Expédiée: ${order.shippedAt ? new Date(order.shippedAt).toLocaleString('fr-FR') : '-'}\n`)
    })
  }

  // Get all delivery agents (MAGASINIER)
  const deliveryAgents = await prisma.user.findMany({
    where: { role: 'MAGASINIER' },
    select: {
      id: true,
      email: true,
      name: true
    }
  })

  console.log(`👤 Livreurs (MAGASINIER): ${deliveryAgents.length}\n`)

  if (deliveryAgents.length > 0) {
    deliveryAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (${agent.email})`)
      
      // Check if any orders are assigned to this agent
      const assignedOrders = shippedOrders.filter(o => 
        o.deliveryAgentName === agent.name || 
        o.deliveryAgentName === agent.email
      )
      
      console.log(`   - Commandes assignées: ${assignedOrders.length}`)
      if (assignedOrders.length > 0) {
        assignedOrders.forEach(order => {
          console.log(`     • ${order.orderNumber || order.id.slice(-8)}`)
        })
      }
      console.log('')
    })
  }

  // Check for mismatches
  console.log('⚠️  Vérification des correspondances:\n')
  shippedOrders.forEach(order => {
    if (order.deliveryAgentName) {
      const matchingAgent = deliveryAgents.find(agent => 
        agent.name === order.deliveryAgentName || 
        agent.email === order.deliveryAgentName
      )
      
      if (!matchingAgent) {
        console.log(`❌ Commande ${order.orderNumber || order.id.slice(-8)}:`)
        console.log(`   - Livreur assigné: "${order.deliveryAgentName}"`)
        console.log(`   - Aucun livreur trouvé avec ce nom/email\n`)
      }
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
