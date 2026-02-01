const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('\n📋 Vérification des logs d\'audit\n')
  
  // Get recent audit logs
  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      userEmail: true,
      userRole: true,
      createdAt: true,
      details: true
    }
  })

  console.log(`Total de logs trouvés: ${logs.length}\n`)

  // Find specific examples
  const orderCreated = logs.find(log => log.action === 'ORDER_CREATED')
  const orderDelivered = logs.find(log => log.action === 'ORDER_DELIVERED' || (log.action === 'ORDER_STATUS_CHANGED' && log.details && JSON.parse(log.details).to === 'DELIVERED'))
  const paymentRecorded = logs.find(log => log.action === 'PAYMENT_RECORDED')

  console.log('=== EXEMPLE 1: Création de commande ===')
  if (orderCreated) {
    const details = orderCreated.details ? JSON.parse(orderCreated.details) : {}
    console.log(`Action: ${orderCreated.action}`)
    console.log(`Type: ${orderCreated.entityType}`)
    console.log(`Date: ${new Date(orderCreated.createdAt).toLocaleString('fr-FR')}`)
    console.log(`Utilisateur: ${orderCreated.userEmail} (${orderCreated.userRole})`)
    console.log(`ID Commande: ${orderCreated.entityId?.slice(-8)}`)
    console.log(`Détails:`, JSON.stringify(details, null, 2))
  } else {
    console.log('❌ Aucun log de création de commande trouvé')
  }

  console.log('\n=== EXEMPLE 2: Livraison (DELIVERED) ===')
  if (orderDelivered) {
    const details = orderDelivered.details ? JSON.parse(orderDelivered.details) : {}
    console.log(`Action: ${orderDelivered.action}`)
    console.log(`Type: ${orderDelivered.entityType}`)
    console.log(`Date: ${new Date(orderDelivered.createdAt).toLocaleString('fr-FR')}`)
    console.log(`Utilisateur: ${orderDelivered.userEmail} (${orderDelivered.userRole})`)
    console.log(`ID Commande: ${orderDelivered.entityId?.slice(-8)}`)
    console.log(`Détails:`, JSON.stringify(details, null, 2))
  } else {
    console.log('❌ Aucun log de livraison trouvé')
  }

  console.log('\n=== EXEMPLE 3: Paiement enregistré ===')
  if (paymentRecorded) {
    const details = paymentRecorded.details ? JSON.parse(paymentRecorded.details) : {}
    console.log(`Action: ${paymentRecorded.action}`)
    console.log(`Type: ${paymentRecorded.entityType}`)
    console.log(`Date: ${new Date(paymentRecorded.createdAt).toLocaleString('fr-FR')}`)
    console.log(`Utilisateur: ${paymentRecorded.userEmail} (${paymentRecorded.userRole})`)
    console.log(`ID Paiement: ${paymentRecorded.entityId?.slice(-8)}`)
    console.log(`Détails:`, JSON.stringify(details, null, 2))
  } else {
    console.log('❌ Aucun log de paiement trouvé')
  }

  console.log('\n=== RÉSUMÉ DES ACTIONS LOGGÉES ===')
  const actionCounts = {}
  logs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
  })
  
  Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([action, count]) => {
      console.log(`  ${action}: ${count}`)
    })

  console.log('\n=== ACTIONS CRITIQUES À VÉRIFIER ===')
  const criticalActions = {
    'LOGIN': 'Connexion',
    'ORDER_CREATED': 'Création commande',
    'ORDER_UPDATED': 'Modification commande',
    'ORDER_ITEM_ADDED': 'Ajout produit à commande',
    'ORDER_STATUS_CHANGED': 'Changement statut commande',
    'ORDER_DELIVERED': 'Livraison',
    'PAYMENT_RECORDED': 'Paiement enregistré',
    'ORDER_CANCELLED': 'Annulation commande',
    'SETTINGS_UPDATED': 'Modification paramètres'
  }

  Object.entries(criticalActions).forEach(([action, label]) => {
    const found = logs.some(log => log.action === action)
    console.log(`  ${found ? '✅' : '❌'} ${label} (${action})`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
