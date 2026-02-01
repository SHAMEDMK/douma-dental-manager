const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      segment: true,
      passwordHash: true,
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`\n📊 Total users: ${users.length}\n`)
  
  if (users.length === 0) {
    console.log('❌ No users found in database')
  } else {
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Segment: ${user.segment || 'N/A'}`)
      console.log(`   Has Password: ${user.passwordHash ? '✅ Yes' : '❌ No'}`)
      console.log('')
    })
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
