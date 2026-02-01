const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('\n🧪 Test des Logs d\'Audit\n')
  
  // Test 1: Vérifier les logs récents
  console.log('=== Test 1: Logs récents (50 derniers) ===')
  const recentLogs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      action: true,
      entityType: true,
      userEmail: true,
      userRole: true,
      createdAt: true,
      details: true
    }
  })
  
  console.log(`✅ ${recentLogs.length} logs trouvés\n`)
  
  // Test 2: Vérifier les actions critiques
  console.log('=== Test 2: Vérification des actions critiques ===')
  const criticalActions = [
    'ORDER_CREATED',
    'ORDER_UPDATED',
    'ORDER_ITEM_ADDED',
    'ORDER_STATUS_CHANGED',
    'ORDER_CANCELLED',
    'ORDER_DELIVERED',
    'PAYMENT_RECORDED',
    'SETTINGS_UPDATED',
    'LOGIN'
  ]
  
  const actionCounts = {}
  recentLogs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
  })
  
  criticalActions.forEach(action => {
    const count = actionCounts[action] || 0
    const status = count > 0 ? '✅' : '❌'
    console.log(`  ${status} ${action}: ${count} occurrence(s)`)
  })
  
  // Test 3: Vérifier les détails des logs
  console.log('\n=== Test 3: Exemples de logs avec détails ===')
  const sampleLogs = recentLogs.slice(0, 5)
  sampleLogs.forEach((log, index) => {
    console.log(`\n${index + 1}. ${log.action} (${log.entityType})`)
    console.log(`   Utilisateur: ${log.userEmail} (${log.userRole})`)
    console.log(`   Date: ${new Date(log.createdAt).toLocaleString('fr-FR')}`)
    if (log.details) {
      try {
        const details = JSON.parse(log.details)
        console.log(`   Détails: ${JSON.stringify(details, null, 2).substring(0, 200)}...`)
      } catch (e) {
        console.log(`   Détails: ${log.details.substring(0, 100)}...`)
      }
    }
  })
  
  // Test 4: Vérifier les logs de sécurité
  console.log('\n=== Test 4: Logs de sécurité ===')
  const securityLogs = recentLogs.filter(log => 
    log.action === 'LOGIN' || 
    log.action === 'LOGIN_FAILED' ||
    log.action === 'SETTINGS_UPDATED'
  )
  console.log(`✅ ${securityLogs.length} logs de sécurité trouvés`)
  
  if (securityLogs.length > 0) {
    console.log('\nExemples:')
    securityLogs.slice(0, 3).forEach(log => {
      console.log(`  - ${log.action} par ${log.userEmail} (${log.userRole})`)
    })
  }
  
  console.log('\n✅ Tests terminés\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
