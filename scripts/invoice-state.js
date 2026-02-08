/**
 * Affiche l'état d'une facture (par numéro de séquence ou numéro complet).
 * Usage: node scripts/invoice-state.js 9
 *    ou: node scripts/invoice-state.js FAC-20260204-0009
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node scripts/invoice-state.js <numéro>')
    console.error('  Ex: node scripts/invoice-state.js 9')
    console.error('  Ex: node scripts/invoice-state.js FAC-20260204-0009')
    process.exit(1)
  }

  let invoice
  if (/^\d+$/.test(arg)) {
    const seq = arg.padStart(4, '0')
    invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { endsWith: seq } },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, name: true, clientCode: true } },
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
                productVariant: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
        payments: true,
      },
    })
  } else {
    invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { invoiceNumber: arg },
          { id: arg },
        ],
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, name: true, clientCode: true } },
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
                productVariant: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
        payments: true,
      },
    })
  }

  if (!invoice) {
    console.error('Facture non trouvée pour:', arg)
    process.exit(1)
  }

  const o = invoice.order
  console.log('=== Facture', invoice.invoiceNumber || invoice.id, '===\n')
  console.log('ID:           ', invoice.id)
  console.log('Numéro:       ', invoice.invoiceNumber ?? '(vide)')
  console.log('Statut:       ', invoice.status)
  console.log('Montant:      ', invoice.amount.toFixed(2), 'Dh')
  console.log('Reste dû:     ', invoice.balance.toFixed(2), 'Dh')
  console.log('Créée le:     ', invoice.createdAt.toISOString())
  console.log('Payée le:     ', invoice.paidAt ? invoice.paidAt.toISOString() : '—')
  console.log('Payée par:    ', invoice.paidBy ?? '—')

  console.log('\n--- Commande associée ---')
  console.log('Order ID:     ', o.id)
  console.log('Numéro:       ', o.orderNumber ?? '—')
  console.log('Statut:       ', o.status)
  console.log('Client:       ', o.user?.name ?? o.user?.email ?? '—')
  console.log('Code client:  ', o.user?.clientCode ?? '—')

  console.log('\n--- Lignes de commande ---')
  if (!o.items || o.items.length === 0) {
    console.log('  (aucune)')
  } else {
    o.items.forEach((item, i) => {
      const name = item.productVariant
        ? `${item.product?.name} – ${item.productVariant.name || item.productVariant.sku}`
        : item.product?.name
      console.log(`  ${i + 1}. ${name} | Qté: ${item.quantity} | Prix unit.: ${item.priceAtTime.toFixed(2)} Dh | Total: ${(item.quantity * item.priceAtTime).toFixed(2)} Dh`)
    })
  }

  console.log('\n--- Paiements ---')
  if (!invoice.payments || invoice.payments.length === 0) {
    console.log('  (aucun)')
  } else {
    invoice.payments.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.amount.toFixed(2)} Dh | ${p.method} | ${p.reference || '—'} | ${p.createdAt.toISOString().slice(0, 10)}`)
    })
  }

  console.log('\n=== Fin ===')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
