/**
 * Script de vérification des prix des produits
 * 
 * Usage: node scripts/check-product-prices.js [productName]
 * 
 * Si productName est fourni, affiche les détails pour ce produit uniquement.
 * Sinon, liste tous les produits avec leurs prix par segment.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProductPrices(productName = null) {
  try {
    const where = productName 
      ? { name: { contains: productName } }
      : {}

    const products = await prisma.product.findMany({
      where,
      include: {
        segmentPrices: true
      },
      orderBy: { name: 'asc' }
    })

    if (products.length === 0) {
      console.log(`❌ Aucun produit trouvé${productName ? ` avec le nom "${productName}"` : ''}`)
      return
    }

    console.log(`\n📦 ${products.length} produit(s) trouvé(s)\n`)
    console.log('='.repeat(100))

    for (const product of products) {
      console.log(`\n🔍 Produit: ${product.name} (ID: ${product.id})`)
      console.log('-'.repeat(100))
      
      // Prix de base (legacy)
      console.log(`\n💰 Prix de base (legacy):`)
      console.log(`   - product.price: ${product.price?.toFixed(2) || 'N/A'} Dh`)
      console.log(`   - priceLabo: ${product.priceLabo?.toFixed(2) || 'N/A'} Dh`)
      console.log(`   - priceDentiste: ${product.priceDentiste?.toFixed(2) || 'N/A'} Dh`)
      console.log(`   - priceRevendeur: ${product.priceRevendeur?.toFixed(2) || 'N/A'} Dh`)

      // Prix par segment (nouveau système)
      if (product.segmentPrices && product.segmentPrices.length > 0) {
        console.log(`\n📊 Prix par segment (ProductPrice):`)
        for (const sp of product.segmentPrices) {
          console.log(`   - ${sp.segment}: ${sp.price.toFixed(2)} Dh`)
        }
      } else {
        console.log(`\n📊 Prix par segment (ProductPrice): Aucun`)
      }

      // Simulation du calcul pour chaque segment
      console.log(`\n🧮 Simulation du calcul pour chaque segment (sans remise):`)
      const segments = ['LABO', 'DENTISTE', 'REVENDEUR']
      
      for (const segment of segments) {
        // Logique identique à getPriceForSegment
        let price = null
        
        // 1. Vérifier ProductPrice
        if (product.segmentPrices && product.segmentPrices.length > 0) {
          const segmentPrice = product.segmentPrices.find(sp => sp.segment === segment)
          if (segmentPrice) {
            price = segmentPrice.price
            console.log(`   ${segment}: ${price.toFixed(2)} Dh (depuis ProductPrice)`)
            continue
          }
        }
        
        // 2. Fallback vers champs legacy
        switch (segment) {
          case 'LABO':
            price = product.priceLabo ?? product.price
            break
          case 'DENTISTE':
            price = product.priceDentiste ?? product.price
            break
          case 'REVENDEUR':
            price = product.priceRevendeur ?? product.price
            break
        }
        
        const source = segment === 'LABO' 
          ? (product.priceLabo !== null ? 'priceLabo' : 'product.price')
          : (segment === 'DENTISTE' 
            ? (product.priceDentiste !== null ? 'priceDentiste' : 'product.price')
            : (product.priceRevendeur !== null ? 'priceRevendeur' : 'product.price'))
        
        console.log(`   ${segment}: ${price?.toFixed(2) || 'N/A'} Dh (depuis ${source})`)
      }

      // Vérifier les incohérences
      console.log(`\n⚠️  Vérifications:`)
      const prices = [
        product.price,
        product.priceLabo,
        product.priceDentiste,
        product.priceRevendeur,
        ...(product.segmentPrices?.map(sp => sp.price) || [])
      ].filter(p => p !== null && p !== undefined)

      if (prices.length > 0) {
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const uniquePrices = [...new Set(prices.map(p => p.toFixed(2)))]

        if (uniquePrices.length > 1) {
          console.log(`   ⚠️  Plusieurs prix différents trouvés: ${uniquePrices.join(', ')} Dh`)
          console.log(`   📉 Prix minimum: ${minPrice.toFixed(2)} Dh`)
          console.log(`   📈 Prix maximum: ${maxPrice.toFixed(2)} Dh`)
        } else {
          console.log(`   ✅ Tous les prix sont identiques: ${uniquePrices[0]} Dh`)
        }
      }
    }

    console.log(`\n${'='.repeat(100)}\n`)

    // Afficher les clients avec leurs segments et remises
    if (productName) {
      console.log(`\n👥 Clients et leurs configurations:`)
      console.log('-'.repeat(100))
      
      const users = await prisma.user.findMany({
        where: { role: 'CLIENT' },
        select: {
          id: true,
          name: true,
          email: true,
          segment: true,
          discountRate: true
        },
        orderBy: { name: 'asc' }
      })

      for (const user of users) {
        console.log(`\n   ${user.name} (${user.email})`)
        console.log(`   - Segment: ${user.segment || 'N/A'}`)
        console.log(`   - Remise: ${user.discountRate ? `${user.discountRate}%` : 'Aucune'}`)
        
        // Calculer le prix pour ce client
        const product = products[0] // On prend le premier produit trouvé
        if (product) {
          let priceHT = null
          
          // Logique identique à getPriceForSegment
          if (product.segmentPrices && product.segmentPrices.length > 0) {
            const segmentPrice = product.segmentPrices.find(sp => sp.segment === user.segment)
            if (segmentPrice) {
              priceHT = segmentPrice.price
            }
          }
          
          if (priceHT === null) {
            switch (user.segment) {
              case 'LABO':
                priceHT = product.priceLabo ?? product.price
                break
              case 'DENTISTE':
                priceHT = product.priceDentiste ?? product.price
                break
              case 'REVENDEUR':
                priceHT = product.priceRevendeur ?? product.price
                break
              default:
                priceHT = product.price
            }
          }
          
          // Appliquer la remise
          let finalPriceHT = priceHT
          if (user.discountRate && user.discountRate > 0) {
            finalPriceHT = priceHT * (1 - user.discountRate / 100)
          }
          
          // Calculer TTC (supposons 20% de TVA)
          const vatRate = 0.2
          const priceTTC = Math.round((finalPriceHT * (1 + vatRate)) * 100) / 100
          
          console.log(`   - Prix HT de base: ${priceHT?.toFixed(2) || 'N/A'} Dh`)
          if (user.discountRate && user.discountRate > 0) {
            console.log(`   - Prix HT après remise ${user.discountRate}%: ${finalPriceHT.toFixed(2)} Dh`)
          }
          console.log(`   - Prix TTC affiché: ${priceTTC.toFixed(2)} Dh`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Récupérer le nom du produit depuis les arguments
const productName = process.argv[2] || null

if (productName) {
  console.log(`\n🔍 Recherche du produit: "${productName}"\n`)
} else {
  console.log(`\n📋 Liste de tous les produits\n`)
}

checkProductPrices(productName)
  .then(() => {
    console.log('\n✅ Vérification terminée\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error)
    process.exit(1)
  })
