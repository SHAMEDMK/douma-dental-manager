/**
 * Supprime une facture (par numéro de séquence ou numéro complet).
 * Supprime d'abord les paiements liés, puis la facture. La commande reste sans facture.
 *
 * Usage: node scripts/delete-invoice.js 9
 *    ou: node scripts/delete-invoice.js FAC-20260205-0009
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node scripts/delete-invoice.js <numéro>')
    console.error('  Ex: node scripts/delete-invoice.js 9')
    console.error('  Ex: node scripts/delete-invoice.js FAC-20260205-0009')
    process.exit(1)
  }

  let invoice
  if (/^\d+$/.test(arg)) {
    const seq = arg.padStart(4, '0')
    invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { endsWith: seq } },
      include: { payments: true, order: { select: { orderNumber: true } } },
    })
  } else {
    invoice = await prisma.invoice.findFirst({
      where: {
        OR: [{ invoiceNumber: arg }, { id: arg }],
      },
      include: { payments: true, order: { select: { orderNumber: true } } },
    })
  }

  if (!invoice) {
    console.error('Facture non trouvée pour:', arg)
    process.exit(1)
  }

  console.log('Facture trouvée:', invoice.invoiceNumber || invoice.id)
  console.log('  Commande:', invoice.order?.orderNumber)
  console.log('  Montant:', invoice.amount, 'Dh | Statut:', invoice.status)
  console.log('  Paiements:', invoice.payments?.length ?? 0)
  console.log('Suppression des paiements puis de la facture...')

  await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } })
  await prisma.invoice.delete({ where: { id: invoice.id } })

  console.log('Facture supprimée.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
