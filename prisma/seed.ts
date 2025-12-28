import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Create Admin User (only if doesn't exist, using env password)
  const adminEmail = 'admin@douma.com'
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD environment variable is required for seeding admin user')
    }
    if (adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters long')
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10)
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin Douma',
        role: 'ADMIN',
        passwordHash,
      },
    })
    console.log(`✓ Created admin user: ${adminEmail}`)
  } else {
    console.log(`✓ Admin user already exists: ${adminEmail} (skipped)`)
  }

  // 2. Create other users (Compta, Magasinier) - only if they don't exist
  const otherUsers = [
    { email: 'compta@douma.com', name: 'Comptable Douma', role: 'COMPTABLE' },
    { email: 'stock@douma.com', name: 'Magasinier Douma', role: 'MAGASINIER' },
  ]

  for (const u of otherUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email }
    })
    if (!existing) {
      // Use a default password for non-admin users (can be changed later)
      const defaultPassword = process.env.ADMIN_PASSWORD || 'password123'
      const passwordHash = await bcrypt.hash(defaultPassword, 10)
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
        },
      })
      console.log(`✓ Created user: ${u.email}`)
    } else {
      console.log(`✓ User already exists: ${u.email} (skipped)`)
    }
  }

  // 2. Create Invited Client
  const token = 'invitation-token-123'
  await prisma.invitation.upsert({
    where: { token },
    update: {},
    create: {
      email: 'client@dental.com',
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
  console.log(`Invitation token created/ensured: ${token}`)

  // 3. Create Products
  const productsData = [
    { name: 'Implant Titane', price: 120.0, stock: 50, minStock: 10, category: 'Implantologie' },
    { name: 'Composite Z350', price: 45.0, stock: 100, minStock: 20, category: 'Restoration' },
    { name: 'Fraise Diamantée', price: 5.5, stock: 500, minStock: 50, category: 'Instruments' },
    { name: 'Gants Latex (Boîte)', price: 8.0, stock: 200, minStock: 30, category: 'Hygiène' },
    { name: 'Anesthésique Local', price: 25.0, stock: 80, minStock: 15, category: 'Chirurgie' },
  ]

  for (const p of productsData) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } })
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock,
          category: p.category,
          stockMovements: {
            create: {
              type: 'IN',
              quantity: p.stock,
              reference: 'Initial Seed',
              createdBy: 'SYSTEM'
            }
          }
        },
      })
      console.log(`Created product: ${p.name}`)
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
