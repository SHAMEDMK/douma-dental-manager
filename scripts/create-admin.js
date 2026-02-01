const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@douma.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  
  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (existingAdmin) {
    console.log(`✓ Admin user already exists: ${adminEmail}`)
    console.log(`  Email: ${adminEmail}`)
    console.log(`  Name: ${existingAdmin.name}`)
    console.log(`  Role: ${existingAdmin.role}`)
    return
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10)
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin Douma',
      role: 'ADMIN',
      segment: 'LABO',
      creditLimit: 0,
      passwordHash,
    },
  })

  console.log(`✓ Created admin user: ${adminEmail}`)
  console.log(`  Email: ${adminEmail}`)
  console.log(`  Password: ${adminPassword}`)
  console.log(`  Name: ${admin.name}`)
  console.log(`  Role: ${admin.role}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
