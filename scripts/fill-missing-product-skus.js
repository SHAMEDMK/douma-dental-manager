#!/usr/bin/env node
/**
 * Attribue un SKU à tous les produits qui n'en ont pas (colonne sku vide ou null).
 * À exécuter sur une base existante où les produits n'ont pas été créés avec un SKU.
 *
 * Usage: node scripts/fill-missing-product-skus.js
 *   ou:  npm run db:fill-skus
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const sansSku = await prisma.product.findMany({
    where: {
      OR: [
        { sku: null },
        { sku: '' },
      ],
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  if (sansSku.length === 0) {
    console.log('Aucun produit sans SKU. Rien à faire.');
    return;
  }

  console.log(`${sansSku.length} produit(s) sans SKU trouvé(s). Attribution en cours...\n`);

  for (let i = 0; i < sansSku.length; i++) {
    const sku = `Prod-${String(1000 + i).padStart(3, '0')}`;
    try {
      await prisma.product.update({
        where: { id: sansSku[i].id },
        data: { sku },
      });
      console.log(`  ✓ ${sansSku[i].name} → ${sku}`);
    } catch (err) {
      console.error(`  ✗ ${sansSku[i].name}: ${err?.message || err}`);
    }
  }

  console.log(`\nTerminé. ${sansSku.length} produit(s) mis à jour.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
