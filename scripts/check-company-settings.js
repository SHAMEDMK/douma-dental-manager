const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })

  console.log('\n📊 CompanySettings Status:\n')
  
  if (!companySettings) {
    console.log('❌ CompanySettings not found in database')
    console.log('   You need to create CompanySettings via: /admin/settings/company')
    console.log('   The "name" field should be set to "SHAMED SARL" or your company name')
  } else {
    console.log('✅ CompanySettings exists')
    console.log(`   ID: ${companySettings.id}`)
    console.log(`   Name: ${companySettings.name || '(empty)'}`)
    console.log(`   Address: ${companySettings.address || '(empty)'}`)
    console.log(`   City: ${companySettings.city || '(empty)'}`)
    console.log(`   Country: ${companySettings.country || '(empty)'}`)
    console.log(`   ICE: ${companySettings.ice || '(empty)'}`)
    console.log(`   Logo URL: ${companySettings.logoUrl || '(none)'}`)
    
    if (!companySettings.name || companySettings.name.trim() === '') {
      console.log('\n⚠️  WARNING: The "name" field is empty!')
      console.log('   This is why "DOUMA Dental Manager" is displayed on delivery notes.')
      console.log('   Please update it via: /admin/settings/company')
    } else if (companySettings.name.toLowerCase().includes('douma')) {
      console.log('\n⚠️  WARNING: The "name" field contains "DOUMA"!')
      console.log('   Current value:', companySettings.name)
      console.log('   Please update it to "SHAMED SARL" via: /admin/settings/company')
    }
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
