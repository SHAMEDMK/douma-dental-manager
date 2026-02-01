const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const companyName = process.argv[2] || 'SHAMED SARL'
  
  console.log(`\n📝 Updating CompanySettings name to: "${companyName}"\n`)
  
  try {
    // Check if CompanySettings exists
    const existing = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    })
    
    if (!existing) {
      // Create CompanySettings with minimal required fields
      await prisma.companySettings.create({
        data: {
          id: 'default',
          name: companyName,
          address: 'Adresse à compléter',
          city: 'Ville à compléter',
          country: 'Maroc',
          ice: 'ICE à compléter',
          vatRate: 0.2,
          paymentTerms: 'Paiement à réception'
        }
      })
      console.log(`✅ Created CompanySettings with name: "${companyName}"`)
    } else {
      // Update existing CompanySettings
      await prisma.companySettings.update({
        where: { id: 'default' },
        data: { name: companyName }
      })
      console.log(`✅ Updated CompanySettings name to: "${companyName}"`)
    }
    
    console.log('\n📌 Next steps:')
    console.log('   1. Go to /admin/settings/company')
    console.log('   2. Fill in all the required company information')
    console.log('   3. The delivery notes will now display "SHAMED SARL" instead of "DOUMA Dental Manager"\n')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
