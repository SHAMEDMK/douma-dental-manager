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
  const skuRaw = formData.get('sku') as string
  const sku = skuRaw?.trim() || null
  const description = formData.get('description') as string
  const priceLaboStr = formData.get('priceLabo') as string
  const priceDentisteStr = formData.get('priceDentiste') as string
  const priceRevendeurStr = formData.get('priceRevendeur') as string
  const stock = formData.get('stock') as string
  const minStock = formData.get('minStock') as string
  const category = formData.get('category') as string
  const imageUrlRaw = formData.get('imageUrl') as string
  
  // Validate imageUrl: reject Windows file paths, only allow URLs or /uploads/ paths
  let imageUrl: string | null = null
  if (imageUrlRaw && imageUrlRaw.trim()) {
    const trimmed = imageUrlRaw.trim()
    // Reject Windows file paths (C:\... or paths with backslashes)
    if (trimmed.includes('\\') || trimmed.match(/^[A-Z]:\\/)) {
      return { error: 'Les chemins de fichiers locaux ne sont pas autorisés. Utilisez l\'upload de fichier ou une URL web.' }
    }
    // Only accept URLs starting with http://, https://, or /uploads/
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/')) {
      imageUrl = trimmed
    } else {
      return { error: 'URL d\'image invalide. Utilisez une URL web (http://, https://) ou un chemin uploadé (/uploads/...)' }
    }
  }

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

  // Si un SKU est renseigné, vérifier qu'il n'est pas déjà utilisé
  if (sku !== null && sku !== '') {
    const existing = await prisma.product.findFirst({
      where: { sku },
      select: { id: true },
    })
    if (existing) {
      return { error: 'Ce SKU est déjà utilisé par un autre produit.' }
    }
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        sku,
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

    // Log audit: Product created
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      await logEntityCreation(
        'PRODUCT_CREATED',
        'PRODUCT',
        product.id,
        session as any,
        {
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category,
        }
      )
    } catch (auditError) {
      console.error('Failed to log product creation:', auditError)
    }

    revalidatePath('/admin/products')
    revalidatePath('/portal')
    redirect('/admin/products')
  } catch (error: any) {
    // Re-throw NEXT_REDIRECT to allow Next.js to handle it
    if (error.message && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    // Contrainte d'unicité SKU (au cas où la vérification aurait été contournée)
    if (error?.code === 'P2002' && error?.meta?.target?.includes?.('sku')) {
      return { error: 'Ce SKU est déjà utilisé par un autre produit.' }
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
  const skuRaw = formData.get('sku') as string
  const sku = skuRaw?.trim() || null
  const description = formData.get('description') as string
  const priceLaboStr = formData.get('priceLabo') as string
  const priceDentisteStr = formData.get('priceDentiste') as string
  const priceRevendeurStr = formData.get('priceRevendeur') as string
  const stock = formData.get('stock') as string
  const minStock = formData.get('minStock') as string
  const category = formData.get('category') as string
  const imageUrlRaw = formData.get('imageUrl') as string
  
  // Validate imageUrl: reject Windows file paths, only allow URLs or /uploads/ paths
  let imageUrl: string | null = null
  if (imageUrlRaw && imageUrlRaw.trim()) {
    const trimmed = imageUrlRaw.trim()
    // Reject Windows file paths (C:\... or paths with backslashes)
    if (trimmed.includes('\\') || trimmed.match(/^[A-Z]:\\/)) {
      return { error: 'Les chemins de fichiers locaux ne sont pas autorisés. Utilisez l\'upload de fichier ou une URL web.' }
    }
    // Only accept URLs starting with http://, https://, or /uploads/
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/')) {
      imageUrl = trimmed
    } else {
      return { error: 'URL d\'image invalide. Utilisez une URL web (http://, https://) ou un chemin uploadé (/uploads/...)' }
    }
  }

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

  // Si un SKU est renseigné, vérifier qu'il n'est pas déjà utilisé par un autre produit
  if (sku !== null && sku !== '') {
    const existing = await prisma.product.findFirst({
      where: {
        sku,
        id: { not: productId },
      },
      select: { id: true },
    })
    if (existing) {
      return { error: 'Ce SKU est déjà utilisé par un autre produit.' }
    }
  }

  try {
    // Get old product data for audit log
    const oldProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, price: true, stock: true, cost: true, category: true }
    })

    // Delete existing segment prices
    await prisma.productPrice.deleteMany({
      where: { productId }
    })

    // Update product and create new segment prices
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        sku,
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
      },
      select: { name: true, price: true, stock: true, cost: true, category: true }
    })

    // Log audit: Product updated
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate(
        'PRODUCT_UPDATED',
        'PRODUCT',
        productId,
        session as any,
        oldProduct || {},
        {
          name: updatedProduct.name,
          price: updatedProduct.price,
          stock: updatedProduct.stock,
          cost: updatedProduct.cost,
          category: updatedProduct.category,
        }
      )
    } catch (auditError) {
      console.error('Failed to log product update:', auditError)
    }

    revalidatePath('/admin/products')
    revalidatePath('/portal')
    redirect('/admin/products?updated=1')
  } catch (error: any) {
    // Re-throw NEXT_REDIRECT to allow Next.js to handle it
    if (error.message && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    // Contrainte d'unicité SKU
    if (error?.code === 'P2002') {
      const target = error?.meta?.target
      const isSku = Array.isArray(target) ? target.includes('sku') : target === 'sku'
      if (isSku) {
        return { error: 'Ce SKU est déjà utilisé par un autre produit.' }
      }
    }
    return { error: error.message || 'Erreur lors de la mise à jour du produit' }
  }
}

/**
 * Delete a product
 * Prevents deletion if product is referenced in any orders
 */
export async function deleteProductAction(productId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  try {
    // Check if product exists and get its details for audit log
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        category: true,
        orderItems: {
          select: { id: true }
        }
      }
    })

    if (!product) {
      return { error: 'Produit introuvable' }
    }

    // Prevent deletion if product is used in any orders (to maintain data integrity)
    if (product.orderItems && product.orderItems.length > 0) {
      return { 
        error: `Impossible de supprimer ce produit car il est utilisé dans ${product.orderItems.length} commande(s). Pour supprimer un produit, il ne doit pas être référencé dans des commandes existantes.` 
      }
    }

    // Delete product (ProductPrice will be cascade deleted, StockMovements will be orphaned but kept for history)
    await prisma.product.delete({
      where: { id: productId }
    })

    // Log audit: Product deleted
    try {
      const { logEntityDeletion } = await import('@/lib/audit')
      await logEntityDeletion(
        'PRODUCT_DELETED',
        'PRODUCT',
        productId,
        session as any,
        {
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category,
        }
      )
    } catch (auditError) {
      console.error('Failed to log product deletion:', auditError)
    }

    revalidatePath('/admin/products')
    revalidatePath('/portal')
    return { success: true }
  } catch (error: any) {
    // If foreign key constraint error, product is still referenced
    if (error.code === 'P2003' || error.message?.includes('foreign key')) {
      return { error: 'Impossible de supprimer ce produit car il est utilisé dans des commandes existantes.' }
    }
    return { error: error.message || 'Erreur lors de la suppression du produit' }
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
