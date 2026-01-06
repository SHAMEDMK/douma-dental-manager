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
        segment: 'LABO', // Admin doesn't need segment but set default
        creditLimit: 0, // Admin has no credit limit (0 = no credit)
        passwordHash,
      },
    })
    console.log(`✓ Created admin user: ${adminEmail}`)
  } else {
    // Update segment if missing (for existing admin)
    if (!existingAdmin.segment) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { segment: 'LABO' }
      })
      console.log(`✓ Updated admin user segment to LABO: ${adminEmail}`)
    } else {
      console.log(`✓ Admin user already exists: ${adminEmail} (skipped)`)
    }
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
          segment: 'LABO', // Set default segment
          creditLimit: 0, // Non-client users have no credit limit
          passwordHash,
        },
      })
      console.log(`✓ Created user: ${u.email}`)
    } else {
      // Update segment if missing (for existing users)
      if (!existing.segment) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { segment: 'LABO' }
        })
        console.log(`✓ Updated user segment to LABO: ${u.email}`)
      } else {
        console.log(`✓ User already exists: ${u.email} (skipped)`)
      }
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

  // 3. Create Demo Client (if doesn't exist)
  const demoClientEmail = 'client@dental.com'
  const existingClient = await prisma.user.findUnique({
    where: { email: demoClientEmail }
  })
  if (!existingClient) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'password123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)
    await prisma.user.create({
      data: {
        email: demoClientEmail,
        name: 'Dr. Demo Client',
        companyName: 'Cabinet Dentaire Demo',
        role: 'CLIENT',
        segment: 'LABO',
        creditLimit: 5000, // Default credit limit for clients
        passwordHash,
      },
    })
    console.log(`✓ Created demo client: ${demoClientEmail}`)
  } else {
    // Update segment if missing (for existing clients)
    if (!existingClient.segment) {
      await prisma.user.update({
        where: { id: existingClient.id },
        data: { segment: 'LABO' }
      })
      console.log(`✓ Updated existing client segment to LABO: ${demoClientEmail}`)
    }
  }

  // 4. Create Products with segment prices
  const productsData = [
    { 
      name: 'Implant Titane', 
      price: 120.0, 
      priceLabo: 120.0, 
      priceDentiste: 132.0, // +10%
      priceRevendeur: 108.0, // -10%
      stock: 50, 
      minStock: 10, 
      category: 'Implantologie' 
    },
    { 
      name: 'Composite Z350', 
      price: 45.0, 
      priceLabo: 45.0, 
      priceDentiste: 49.5, // +10%
      priceRevendeur: 40.5, // -10%
      stock: 100, 
      minStock: 20, 
      category: 'Restoration' 
    },
    { 
      name: 'Fraise Diamantée', 
      price: 5.5, 
      priceLabo: 5.5, 
      priceDentiste: 6.05, // +10%
      priceRevendeur: 4.95, // -10%
      stock: 500, 
      minStock: 50, 
      category: 'Instruments' 
    },
    { 
      name: 'Gants Latex (Boîte)', 
      price: 8.0, 
      priceLabo: 8.0, 
      priceDentiste: 8.8, // +10%
      priceRevendeur: 7.2, // -10%
      stock: 200, 
      minStock: 30, 
      category: 'Hygiène' 
    },
    { 
      name: 'Anesthésique Local', 
      price: 25.0, 
      priceLabo: 25.0, 
      priceDentiste: 27.5, // +10%
      priceRevendeur: 22.5, // -10%
      stock: 80, 
      minStock: 15, 
      category: 'Chirurgie' 
    },
  ]

  for (const p of productsData) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } })
    let productId: string

    if (!existing) {
      const created = await prisma.product.create({
        data: {
          name: p.name,
          price: p.price, // Legacy field
          priceLabo: p.priceLabo,
          priceDentiste: p.priceDentiste,
          priceRevendeur: p.priceRevendeur,
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
      productId = created.id
      console.log(`Created product: ${p.name}`)
    } else {
      productId = existing.id
      // Update existing products with segment prices if missing
      if (existing.priceLabo === null) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            priceLabo: p.priceLabo,
            priceDentiste: p.priceDentiste,
            priceRevendeur: p.priceRevendeur,
          }
        })
        console.log(`Updated product with segment prices: ${p.name}`)
      }
    }

    // Create ProductPrice entries (idempotent: upsert by productId + segment)
    const segments = [
      { segment: 'LABO', price: p.priceLabo },
      { segment: 'DENTISTE', price: p.priceDentiste },
      { segment: 'REVENDEUR', price: p.priceRevendeur },
    ]

    for (const seg of segments) {
      if (seg.price !== null && seg.price !== undefined) {
        await prisma.productPrice.upsert({
          where: {
            productId_segment: {
              productId: productId,
              segment: seg.segment,
            }
          },
          update: {
            price: seg.price,
          },
          create: {
            productId: productId,
            segment: seg.segment,
            price: seg.price,
          }
        })
      }
    }
    console.log(`✓ Created/updated ProductPrice entries for: ${p.name}`)
  }

  // 5. Create/Update AdminSettings (singleton)
  await prisma.adminSettings.upsert({
    where: { id: 'default' },
    update: {}, // Don't update if exists, keep current values
    create: {
      id: 'default',
      requireApprovalIfAnyNegativeLineMargin: true,
      requireApprovalIfMarginBelowPercent: false,
      marginPercentThreshold: 0,
      requireApprovalIfOrderTotalMarginNegative: false,
      blockWorkflowUntilApproved: true,
      approvalMessage: 'Commande à valider (marge anormale)',
    },
  })
  console.log(`✓ Created/updated AdminSettings (singleton)`)
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
