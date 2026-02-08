// Capture E2E_SEED avant dotenv (sinon .env peut l'écraser) — utilisé par npm run test:e2e
const e2eSeedFromParent = process.env.E2E_SEED
require('dotenv').config()
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** true quand le seed est lancé pour les tests E2E (E2E_SEED=1), pour forcer les mots de passe connus. */
const forceE2EPasswords = process.env.E2E_SEED === '1' || e2eSeedFromParent === '1'
/** En dev, on remet toujours les mots de passe à password123 pour tous les comptes de démo. */
const isDev = process.env.NODE_ENV !== 'production'
const syncPasswordsToDemo = forceE2EPasswords || !process.env.ADMIN_PASSWORD || isDev

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '(non défini)'
  const dbPath = dbUrl.startsWith('file:') ? dbUrl.replace(/^file:/, '') : '(non fichier)'
  console.log('Seed démarré — base:', dbPath)

  // 1. Create Admin User (only if doesn't exist, using env password)
  const adminEmail = 'admin@douma.com'
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    // Use ADMIN_PASSWORD in production; default 'password' for E2E / local dev. E2E_SEED force 'password'.
    const adminPassword = forceE2EPasswords ? 'password' : (process.env.ADMIN_PASSWORD || 'password')
    if (adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters long')
    }
    if (!process.env.ADMIN_PASSWORD && !forceE2EPasswords) {
      console.warn('ADMIN_PASSWORD not set: admin user will use default password "password" (suitable for E2E/local only)')
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
    // When E2E_SEED or ADMIN_PASSWORD not set, ensure admin password is 'password' for E2E/local
    const updates: { segment?: string; passwordHash?: string } = {}
    if (!existingAdmin.segment) updates.segment = 'LABO'
    if (forceE2EPasswords || !process.env.ADMIN_PASSWORD) {
      updates.passwordHash = await bcrypt.hash('password', 10)
    }
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: updates
      })
      if (updates.passwordHash) console.log(`✓ Updated admin password for E2E: ${adminEmail}`)
      if (updates.segment) console.log(`✓ Updated admin user segment to LABO: ${adminEmail}`)
    } else {
      console.log(`✓ Admin user already exists: ${adminEmail} (skipped)`)
    }
  }

  // 2. Create other users (Compta, Magasinier, Livreur, Commercial) - only if they don't exist
  const otherUsers = [
    { email: 'compta@douma.com', name: 'Comptable Douma', role: 'COMPTABLE', userType: null as string | null },
    { email: 'stock@douma.com', name: 'Magasinier Douma', role: 'MAGASINIER', userType: 'MAGASINIER' as string | null },
    { email: 'commercial@douma.com', name: 'Commercial Douma', role: 'COMMERCIAL', userType: null as string | null },
  ]

  for (const u of otherUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email }
    })
    if (!existing) {
      const defaultPassword = forceE2EPasswords ? 'password123' : (process.env.ADMIN_PASSWORD || 'password123')
      const passwordHash = await bcrypt.hash(defaultPassword, 10)
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          userType: u.userType,
          segment: 'LABO', // Set default segment
          creditLimit: 0, // Non-client users have no credit limit
          passwordHash,
        },
      })
      console.log(`✓ Created user: ${u.email}`)
    } else {
      const updates: { segment?: string; passwordHash?: string; userType?: string | null } = {}
      if (!existing.segment) updates.segment = 'LABO'
      if (syncPasswordsToDemo) updates.passwordHash = await bcrypt.hash('password123', 10)
      if (u.userType !== undefined && existing.userType !== u.userType) updates.userType = u.userType
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: existing.id },
          data: updates
        })
        if (updates.segment) console.log(`✓ Updated user segment to LABO: ${u.email}`)
        if (updates.passwordHash) console.log(`✓ Updated password: ${u.email} → password123`)
        if (updates.userType !== undefined) console.log(`✓ Updated userType to ${u.userType}: ${u.email}`)
      } else {
        console.log(`✓ User already exists: ${u.email} (skipped)`)
      }
    }
  }

  // 2b. Create Livreur user (MAGASINIER with userType LIVREUR → accès /delivery, pas /magasinier)
  const livreurEmail = 'livreur@douma.com'
  const existingLivreur = await prisma.user.findUnique({
    where: { email: livreurEmail }
  })
  if (!existingLivreur) {
    const livreurPassword = forceE2EPasswords ? 'password123' : (process.env.ADMIN_PASSWORD || 'password123')
    const passwordHash = await bcrypt.hash(livreurPassword, 10)
    await prisma.user.create({
      data: {
        email: livreurEmail,
        name: 'Livreur Douma',
        role: 'MAGASINIER',
        userType: 'LIVREUR',
        segment: 'LABO',
        creditLimit: 0,
        passwordHash,
      },
    })
    console.log(`✓ Created livreur user: ${livreurEmail}`)
  } else {
    const updates: { segment?: string; passwordHash?: string; userType?: string } = {}
    if (!existingLivreur.segment) updates.segment = 'LABO'
    if (syncPasswordsToDemo) updates.passwordHash = await bcrypt.hash('password123', 10)
    if (existingLivreur.userType !== 'LIVREUR') updates.userType = 'LIVREUR'
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: existingLivreur.id },
        data: updates
      })
      if (updates.segment) console.log(`✓ Updated livreur segment to LABO: ${livreurEmail}`)
      if (updates.passwordHash) console.log(`✓ Updated password: ${livreurEmail} → password123`)
      if (updates.userType) console.log(`✓ Updated userType to LIVREUR: ${livreurEmail}`)
    }
  }

  // 2c. Create Invited Client
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
    const defaultPassword = forceE2EPasswords ? 'password123' : (process.env.ADMIN_PASSWORD || 'password123')
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
    const clientUpdates: { segment?: string; passwordHash?: string } = {}
    if (!existingClient.segment) clientUpdates.segment = 'LABO'
    // En dev / E2E : toujours remettre le mot de passe client à password123 pour connexion facile
    if (syncPasswordsToDemo) {
      clientUpdates.passwordHash = await bcrypt.hash('password123', 10)
    }
    if (Object.keys(clientUpdates).length > 0) {
      await prisma.user.update({
        where: { id: existingClient.id },
        data: clientUpdates
      })
      if (clientUpdates.passwordHash) console.log(`✓ Updated client password: ${demoClientEmail} → password123`)
      if (clientUpdates.segment) console.log(`✓ Updated existing client segment to LABO: ${demoClientEmail}`)
    }
  }

  // 4. Create Products with segment prices (SKU définit l'unicité du produit)
  const productsData = [
    { sku: 'Prod-001', name: 'Implant Titane', price: 120.0, priceLabo: 120.0, priceDentiste: 132.0, priceRevendeur: 108.0, stock: 50, minStock: 10, category: 'Implantologie' },
    { sku: 'Prod-002', name: 'Composite Z350', price: 45.0, priceLabo: 45.0, priceDentiste: 49.5, priceRevendeur: 40.5, stock: 100, minStock: 20, category: 'Restoration' },
    { sku: 'Prod-003', name: 'Fraise Diamantée', price: 5.5, priceLabo: 5.5, priceDentiste: 6.05, priceRevendeur: 4.95, stock: 500, minStock: 50, category: 'Instruments' },
    { sku: 'Prod-004', name: 'Gants Latex (Boîte)', price: 8.0, priceLabo: 8.0, priceDentiste: 8.8, priceRevendeur: 7.2, stock: 200, minStock: 30, category: 'Hygiène' },
    { sku: 'Prod-005', name: 'Anesthésique Local', price: 25.0, priceLabo: 25.0, priceDentiste: 27.5, priceRevendeur: 22.5, stock: 80, minStock: 15, category: 'Chirurgie' },
  ]

  for (const p of productsData) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name },
      select: { id: true, sku: true, priceLabo: true },
    })
    let productId: string

    if (!existing) {
      const created = await prisma.product.create({
        data: {
          sku: p.sku,
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
      console.log(`Created product: ${p.name} (SKU: ${p.sku})`)
    } else {
      productId = existing.id
      const updateData: { sku: string; priceLabo?: number; priceDentiste?: number | null; priceRevendeur?: number | null } = { sku: p.sku }
      if (existing.priceLabo == null) {
        updateData.priceLabo = p.priceLabo
        updateData.priceDentiste = p.priceDentiste
        updateData.priceRevendeur = p.priceRevendeur
      }
      try {
        await prisma.product.update({
          where: { id: existing.id },
          data: updateData,
        })
        console.log(`✓ Produit seed mis à jour: ${p.name} (SKU: ${p.sku})`)
      } catch (err: any) {
        console.error(`Erreur mise à jour SKU pour "${p.name}":`, err?.message || err)
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

  // 4b. Forcer le SKU sur les produits seed (par nom) — seconde passe pour s'assurer que la colonne est remplie
  for (const p of productsData) {
    try {
      const r = await prisma.product.updateMany({
        where: { name: p.name },
        data: { sku: p.sku },
      })
      if (r.count > 0) {
        console.log(`✓ SKU appliqué: ${p.name} → ${p.sku} (${r.count} ligne(s))`)
      }
    } catch (err: any) {
      console.error(`Erreur SKU pour "${p.name}" (${p.sku}):`, err?.message || err)
    }
  }

  // 4c. Attribuer un SKU à tout produit qui n'en a pas (colonne vide ou null)
  const sansSku = await prisma.product.findMany({
    where: { OR: [{ sku: null }, { sku: '' }] },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  for (let i = 0; i < sansSku.length; i++) {
    const sku = `Prod-${String(1000 + i).padStart(3, '0')}`
    try {
      await prisma.product.update({
        where: { id: sansSku[i].id },
        data: { sku },
      })
      console.log(`✓ SKU attribué: ${sansSku[i].name} → ${sku}`)
    } catch (err: any) {
      console.error(`Erreur SKU pour "${sansSku[i].name}":`, err?.message || err)
    }
  }

  // 5. Create/Update AdminSettings (singleton)
  // En E2E : autoriser le workflow (pas de blocage Préparer/Expédier) pour que les tests passent
  const adminSettingsCreate = {
    id: 'default',
    requireApprovalIfAnyNegativeLineMargin: forceE2EPasswords ? false : true,
    requireApprovalIfMarginBelowPercent: false,
    marginPercentThreshold: 0,
    requireApprovalIfOrderTotalMarginNegative: false,
    blockWorkflowUntilApproved: forceE2EPasswords ? false : true,
    approvalMessage: 'Commande à valider (marge anormale)',
  }
  const adminSettingsUpdate = forceE2EPasswords
    ? {
        requireApprovalIfAnyNegativeLineMargin: false,
        blockWorkflowUntilApproved: false,
      }
    : {}
  await prisma.adminSettings.upsert({
    where: { id: 'default' },
    update: adminSettingsUpdate,
    create: adminSettingsCreate,
  })
  console.log(`✓ Created/updated AdminSettings (singleton)`)

  // 6. En E2E : une commande déjà en PREPARED avec BL pour le test workflow.order-to-prepared
  //    + une facture avec solde pour le test payment-workflow (bouton "Encaisser" visible)
  if (forceE2EPasswords) {
    const client = await prisma.user.findUnique({ where: { email: demoClientEmail } })
    const firstProduct = await prisma.product.findFirst()
    if (client && firstProduct) {
      const orderNumberE2e = 'CMD-E2E-PREPARED'
      const blNumberE2e = 'BL-E2E-0001'
      const preparedOrder = await prisma.order.upsert({
        where: { orderNumber: orderNumberE2e },
        update: { status: 'PREPARED', deliveryNoteNumber: blNumberE2e },
        create: {
          userId: client.id,
          orderNumber: orderNumberE2e,
          deliveryNoteNumber: blNumberE2e,
          status: 'PREPARED',
          total: 50,
          items: {
            create: [
              { productId: firstProduct.id, quantity: 1, priceAtTime: 50, costAtTime: 0 },
            ],
          },
        },
      })
      console.log(`✓ Commande E2E PREPARED créée: ${orderNumberE2e} (BL: ${blNumberE2e})`)

      // Facture E2E avec solde restant pour payment-workflow.spec.ts (bouton "Encaisser" sur la liste)
      // amount HT = total commande (50) pour cohérence avec la ligne : 1×50 = 50 HT → TTC 60, paiement 50 → 10 Dh restants
      const invoiceNumberE2e = 'INV-E2E-0001'
      const invoiceE2e = await prisma.invoice.upsert({
        where: { orderId: preparedOrder.id },
        update: { amount: 50, balance: 0, status: 'PARTIAL', invoiceNumber: invoiceNumberE2e },
        create: {
          orderId: preparedOrder.id,
          invoiceNumber: invoiceNumberE2e,
          amount: 50,
          balance: 0,
          status: 'PARTIAL',
        },
      })
      // Un paiement partiel (50 Dh) pour que la facture soit PARTIAL : TTC 60 - 50 = 10 Dh restants
      const existingPayment = await prisma.payment.findFirst({
        where: { invoiceId: invoiceE2e.id },
      })
      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            invoiceId: invoiceE2e.id,
            amount: 50,
            method: 'CASH',
            reference: 'E2E seed partiel',
          },
        })
      }
      console.log(`✓ Facture E2E avec solde créée: ${invoiceNumberE2e} (10 Dh restants)`)
    }
  }

  // Corriger la facture E2E si elle existe (montant HT = 50, cohérent avec la ligne 1×50)
  const e2eInvoice = await prisma.invoice.findFirst({ where: { invoiceNumber: 'INV-E2E-0001' } })
  if (e2eInvoice && (e2eInvoice.amount !== 50 || e2eInvoice.balance !== 0)) {
    await prisma.invoice.update({
      where: { id: e2eInvoice.id },
      data: { amount: 50, balance: 0 },
    })
    console.log(`✓ Facture E2E INV-E2E-0001 corrigée (amount: 50, balance: 0)`)
  }

  const [userCount, productCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
  ])
  console.log(`\nSeed terminé — ${userCount} utilisateur(s), ${productCount} produit(s) en base.`)
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
