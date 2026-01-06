'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPriceForSegment } from '../lib/pricing'

export async function createProductAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const priceLaboStr = formData.get('priceLabo') as string
  const priceDentisteStr = formData.get('priceDentiste') as string
  const priceRevendeurStr = formData.get('priceRevendeur') as string
  const stock = formData.get('stock') as string
  const minStock = formData.get('minStock') as string
  const category = formData.get('category') as string
  const imageUrl = formData.get('imageUrl') as string

  // Validation
  if (!name || name.trim() === '') {
    return { error: 'Le nom du produit est requis' }
  }

  const priceLabo = parseFloat(priceLaboStr || '0')
  if (isNaN(priceLabo) || priceLabo < 0) {
    return { error: 'Le prix LABO doit être un nombre positif' }
  }

  const priceDentiste = priceDentisteStr ? parseFloat(priceDentisteStr) : null
  if (priceDentiste !== null && (isNaN(priceDentiste) || priceDentiste < 0)) {
    return { error: 'Le prix DENTISTE doit être un nombre positif' }
  }

  const priceRevendeur = priceRevendeurStr ? parseFloat(priceRevendeurStr) : null
  if (priceRevendeur !== null && (isNaN(priceRevendeur) || priceRevendeur < 0)) {
    return { error: 'Le prix REVENDEUR doit être un nombre positif' }
  }

  const costStr = formData.get('cost') as string | null
  // If cost field is empty or null, keep existing cost (don't update it)
  // Only parse and update if a value is provided
  let finalCost: number | undefined = undefined
  if (costStr !== null && costStr.trim() !== '') {
    const cost = parseFloat(costStr)
    if (isNaN(cost) || cost < 0) {
      return { error: 'Le coût doit être un nombre positif' }
    }
    finalCost = cost
  }

  // Legacy price field: use priceLabo as default
  const price = priceLabo

  const stockNum = parseInt(stock || '0', 10)
  if (isNaN(stockNum) || stockNum < 0) {
    return { error: 'Le stock doit être un nombre entier positif' }
  }

  const minStockNum = parseInt(minStock || '5', 10)
  if (isNaN(minStockNum) || minStockNum < 0) {
    return { error: 'Le stock minimum doit être un nombre entier positif' }
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price,
        cost: finalCost,
        stock: stockNum,
        minStock: minStockNum,
        category: category || null,
        imageUrl: imageUrl || null,
        segmentPrices: {
          create: [
            { segment: 'LABO', price: priceLabo },
            ...(priceDentiste !== null ? [{ segment: 'DENTISTE', price: priceDentiste }] : []),
            ...(priceRevendeur !== null ? [{ segment: 'REVENDEUR', price: priceRevendeur }] : [])
          ]
        }
      }
    })

    revalidatePath('/admin/products')
    redirect('/admin/products')
  } catch (error: any) {
    // Re-throw NEXT_REDIRECT to allow Next.js to handle it
    if (error.message && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { error: error.message || 'Erreur lors de la création du produit' }
  }
}

export async function updateProductAction(productId: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const priceLaboStr = formData.get('priceLabo') as string
  const priceDentisteStr = formData.get('priceDentiste') as string
  const priceRevendeurStr = formData.get('priceRevendeur') as string
  const stock = formData.get('stock') as string
  const minStock = formData.get('minStock') as string
  const category = formData.get('category') as string
  const imageUrl = formData.get('imageUrl') as string

  // Validation
  if (!name || name.trim() === '') {
    return { error: 'Le nom du produit est requis' }
  }

  const priceLabo = parseFloat(priceLaboStr || '0')
  if (isNaN(priceLabo) || priceLabo < 0) {
    return { error: 'Le prix LABO doit être un nombre positif' }
  }

  const priceDentiste = priceDentisteStr ? parseFloat(priceDentisteStr) : null
  if (priceDentiste !== null && (isNaN(priceDentiste) || priceDentiste < 0)) {
    return { error: 'Le prix DENTISTE doit être un nombre positif' }
  }

  const priceRevendeur = priceRevendeurStr ? parseFloat(priceRevendeurStr) : null
  if (priceRevendeur !== null && (isNaN(priceRevendeur) || priceRevendeur < 0)) {
    return { error: 'Le prix REVENDEUR doit être un nombre positif' }
  }

  // Get cost value from form - field is always present in form
  const costStr = formData.get('cost') as string | null
  let finalCost = 0
  
  if (costStr !== null && costStr.trim() !== '') {
    // Non-empty value provided - parse it
    const cost = parseFloat(costStr)
    if (isNaN(cost)) {
      return { error: 'Le coût doit être un nombre valide' }
    }
    if (cost < 0) {
      return { error: 'Le coût doit être un nombre positif ou zéro' }
    }
    finalCost = cost
  }
  // If costStr is null or empty string, finalCost remains 0
  // This means: empty field = set to 0 (which is a valid value)

  // Legacy price field: use priceLabo as default
  const price = priceLabo

  const stockNum = parseInt(stock || '0', 10)
  if (isNaN(stockNum) || stockNum < 0) {
    return { error: 'Le stock doit être un nombre entier positif' }
  }

  const minStockNum = parseInt(minStock || '5', 10)
  if (isNaN(minStockNum) || minStockNum < 0) {
    return { error: 'Le stock minimum doit être un nombre entier positif' }
  }

  try {
    // Delete existing segment prices
    await prisma.productPrice.deleteMany({
      where: { productId }
    })

    // Update product and create new segment prices
    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description: description || null,
        price,
        cost: finalCost,
        stock: stockNum,
        minStock: minStockNum,
        category: category || null,
        imageUrl: imageUrl || null,
        segmentPrices: {
          create: [
            { segment: 'LABO', price: priceLabo },
            ...(priceDentiste !== null ? [{ segment: 'DENTISTE', price: priceDentiste }] : []),
            ...(priceRevendeur !== null ? [{ segment: 'REVENDEUR', price: priceRevendeur }] : [])
          ]
        }
      }
    })

    revalidatePath('/admin/products')
    redirect('/admin/products?updated=1')
  } catch (error: any) {
    // Re-throw NEXT_REDIRECT to allow Next.js to handle it
    if (error.message && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { error: error.message || 'Erreur lors de la mise à jour du produit' }
  }
}

/**
 * Get available products for order editing
 * Returns products with stock > 0, with prices calculated for user's segment
 */
export async function getAvailableProducts() {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  try {
    // Get user segment
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { segment: true, discountRate: true }
    })

    const segment = user?.segment || 'LABO'
    const discountRate = user?.discountRate ?? null

    // Get products with stock > 0
    const products = await prisma.product.findMany({
      where: {
        stock: { gt: 0 }
      },
      include: {
        segmentPrices: true
      },
      orderBy: { name: 'asc' }
    })

    // Calculate prices for each product
    const productsWithPrices = products.map(product => {
      let price = getPriceForSegment(product, segment as any)
      if (discountRate && discountRate > 0) {
        price = price * (1 - discountRate / 100)
      }
      return {
        id: product.id,
        name: product.name,
        stock: product.stock,
        price: price
      }
    })

    return { products: productsWithPrices }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la récupération des produits' }
  }
}
