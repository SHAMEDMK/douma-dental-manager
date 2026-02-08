/**
 * Met à jour CompanySettings : supprime la valeur par défaut "Paiement à réception"
 * pour que "Conditions de paiement" ne s'affiche plus (champ facultatif).
 *
 * À lancer si la migration a déjà été appliquée avant l’ajout du UPDATE.
 * Usage: node scripts/clear-default-payment-terms.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const updated = await prisma.companySettings.updateMany({
    where: { paymentTerms: 'Paiement à réception' },
    data: { paymentTerms: null },
  })
  if (updated.count > 0) {
    console.log('Valeur par défaut "Paiement à réception" supprimée pour', updated.count, 'paramètre(s).')
  } else {
    console.log('Aucun paramètre à mettre à jour (déjà vide ou différent).')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
