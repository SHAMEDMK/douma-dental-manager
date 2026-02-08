'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPriceForSegment, getPriceForSegmentFromVariant } from '../lib/pricing'
import { hasVariants } from '../lib/variant-utils'

/** Vérifie si un SKU est déjà utilisé par un Product ou un ProductVariant (unicité globale). */
async function isSkuUsedGlobally(
  sku: string,
  options?: { excludeProductId?: string; excludeVariantId?: string }
): Promise<boolean> {
  if (!sku || sku.trim() === '') return false
  const existingProduct = await prisma.product.findFirst({
    where: { sku: sku.trim(), ...(options?.excludeProductId ? { id: { not: options.excludeProductId } } : {}) },
    select: { id: true },
  })
  if (existingProduct) return true
  const existingVariant = await prisma.productVariant.findFirst({
    where: { sku: sku.trim(), ...(options?.excludeVariantId ? { id: { not: options.excludeVariantId } } : {}) },
    select: { id: true },
  })
  return !!existingVariant
}

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

  if (!sku || sku === '') {
    return { error: 'La référence / SKU est obligatoire. Un SKU est unique dans le catalogue.' }
  }
  
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

  const hasVariants = formData.get('hasVariants') === '1' || formData.get('hasVariants') === 'on'
  // Si produit avec variantes, le stock sera géré par variante (on crée avec 0)
  const stockNum = hasVariants ? 0 : parseInt(stock || '0', 10)
  if (isNaN(stockNum) || stockNum < 0) {
    return { error: 'Le stock doit être un nombre entier positif' }
  }

  const minStockNum = hasVariants ? 0 : parseInt(minStock || '5', 10)
  if (isNaN(minStockNum) || minStockNum < 0) {
    return { error: 'Le stock minimum doit être un nombre entier positif' }
  }

  // Unicité SKU globale (Product + ProductVariant)
  if (sku !== null && sku !== '') {
    if (await isSkuUsedGlobally(sku)) {
      return { error: 'Ce SKU est déjà utilisé par un produit ou une variante.' }
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
    if (hasVariants) {
      redirect(`/admin/products/${product.id}/variants`)
    }
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

  if (!sku || sku === '') {
    return { error: 'La référence / SKU est obligatoire. Un SKU est unique dans le catalogue.' }
  }
  
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

  // Unicité SKU globale (Product + ProductVariant)
  if (sku !== null && sku !== '') {
    if (await isSkuUsedGlobally(sku, { excludeProductId: productId })) {
      return { error: 'Ce SKU est déjà utilisé par un autre produit ou une variante.' }
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
 * Delete a product (and optionally the order lines that reference it).
 * @param productId - Product id
 * @param force - If true and product is in orders, deletes those order lines then deletes the product.
 */
export async function deleteProductAction(productId: string, force?: boolean) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        category: true,
        orderItems: { select: { id: true } },
        variants: {
          select: { id: true, orderItems: { select: { id: true } } },
        },
      },
    })

    if (!product) {
      return { error: 'Produit introuvable' }
    }

    const productOrderCount = product.orderItems?.length ?? 0
    const variantOrderCount = product.variants?.reduce((sum, v) => sum + (v.orderItems?.length ?? 0), 0) ?? 0
    const totalOrderRefs = productOrderCount + variantOrderCount

    if (totalOrderRefs > 0 && !force) {
      return {
        error: `Impossible de supprimer ce produit car il est utilisé dans ${totalOrderRefs} ligne(s) de commande. Utilisez « Supprimer quand même » pour retirer ces lignes des commandes puis supprimer le produit.`,
        usedInOrders: totalOrderRefs,
      }
    }

    const variantIds = product.variants?.map((v) => v.id) ?? []

    if (totalOrderRefs > 0 && force) {
      await prisma.orderItem.deleteMany({
        where: {
          OR: [
            { productId: product.id },
            ...(variantIds.length > 0 ? [{ productVariantId: { in: variantIds } }] : []),
          ],
        },
      })
    }

    // StockMovement et favoris bloquent la suppression : les supprimer avant le produit
    await prisma.stockMovement.deleteMany({
      where: {
        OR: [
          { productId: product.id },
          ...(variantIds.length > 0 ? [{ productVariantId: { in: variantIds } }] : []),
        ],
      },
    })
    await prisma.favoriteProduct.deleteMany({
      where: {
        OR: [
          { productId: product.id },
          ...(variantIds.length > 0 ? [{ productVariantId: { in: variantIds } }] : []),
        ],
      },
    })

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
 * Create a product variant (SKU, stock, prices per segment, cost).
 * Enforces global SKU uniqueness (Product + ProductVariant).
 */
export async function createVariantAction(productId: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  const skuRaw = formData.get('sku') as string
  const sku = skuRaw?.trim()
  if (!sku) {
    return { error: 'Le SKU de la variante est requis.' }
  }

  const name = (formData.get('name') as string)?.trim() || null
  const stockNum = parseInt(String(formData.get('stock') ?? '0'), 10)
  const minStockNum = parseInt(String(formData.get('minStock') ?? '5'), 10)
  const priceLabo = formData.get('priceLabo') ? parseFloat(String(formData.get('priceLabo'))) : null
  const priceDentiste = formData.get('priceDentiste') ? parseFloat(String(formData.get('priceDentiste'))) : null
  const priceRevendeur = formData.get('priceRevendeur') ? parseFloat(String(formData.get('priceRevendeur'))) : null
  const cost = parseFloat(String(formData.get('cost') ?? '0'))

  if (isNaN(stockNum) || stockNum < 0) return { error: 'Le stock doit être un nombre entier positif.' }
  if (isNaN(minStockNum) || minStockNum < 0) return { error: 'Le stock minimum doit être un nombre entier positif.' }
  if (cost < 0) return { error: 'Le coût doit être positif ou nul.' }
  if (priceLabo !== null && (isNaN(priceLabo) || priceLabo < 0)) return { error: 'Prix LABO invalide.' }
  if (priceDentiste !== null && (isNaN(priceDentiste) || priceDentiste < 0)) return { error: 'Prix DENTISTE invalide.' }
  if (priceRevendeur !== null && (isNaN(priceRevendeur) || priceRevendeur < 0)) return { error: 'Prix REVENDEUR invalide.' }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) return { error: 'Produit introuvable.' }

  if (await isSkuUsedGlobally(sku)) {
    return { error: 'Ce SKU est déjà utilisé par un produit ou une variante.' }
  }

  const optionValueIds = (formData.get('optionValueIds') as string)?.split(',').filter(Boolean) ?? []
  const optionValueIdList = optionValueIds.map((id) => id.trim()).filter(Boolean)

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku,
        name,
        stock: stockNum,
        minStock: minStockNum,
        priceLabo: priceLabo ?? undefined,
        priceDentiste: priceDentiste ?? undefined,
        priceRevendeur: priceRevendeur ?? undefined,
        cost,
      },
    })
    if (optionValueIdList.length > 0) {
      await prisma.productVariantOptionValue.createMany({
        data: optionValueIdList.map((optionValueId) => ({
          variantId: variant.id,
          optionValueId,
        })),
      })
    }
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      await logEntityCreation('PRODUCT_VARIANT_CREATED', 'PRODUCT_VARIANT', variant.id, session as any, { sku: variant.sku, productId })
    } catch (e) { console.error('Audit variant create:', e) }
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}`)
    revalidatePath('/admin/products/${productId}/variants')
    revalidatePath('/portal')
    redirect(`/admin/products/${productId}/variants?variant=created`)
  } catch (error: any) {
    if (error.message?.includes('NEXT_REDIRECT')) throw error
    if (error?.code === 'P2002') return { error: 'Ce SKU est déjà utilisé.' }
    return { error: error.message || 'Erreur lors de la création de la variante.' }
  }
}

/**
 * Update a product variant.
 */
export async function updateVariantAction(variantId: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  const skuRaw = (formData.get('sku') as string)?.trim()
  if (!skuRaw) return { error: 'Le SKU de la variante est requis.' }

  const name = (formData.get('name') as string)?.trim() || null
  const stockNum = parseInt(String(formData.get('stock') ?? '0'), 10)
  const minStockNum = parseInt(String(formData.get('minStock') ?? '5'), 10)
  const priceLabo = formData.get('priceLabo') ? parseFloat(String(formData.get('priceLabo'))) : null
  const priceDentiste = formData.get('priceDentiste') ? parseFloat(String(formData.get('priceDentiste'))) : null
  const priceRevendeur = formData.get('priceRevendeur') ? parseFloat(String(formData.get('priceRevendeur'))) : null
  const costRaw = parseFloat(String(formData.get('cost') ?? '0'))
  const cost = Number.isNaN(costRaw) ? 0 : Math.max(0, costRaw)

  if (isNaN(stockNum) || stockNum < 0) return { error: 'Le stock doit être un nombre entier positif.' }
  if (isNaN(minStockNum) || minStockNum < 0) return { error: 'Le stock minimum doit être un nombre entier positif.' }

  const existing = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true },
  })
  if (!existing) return { error: 'Variante introuvable.' }

  if (await isSkuUsedGlobally(skuRaw, { excludeVariantId: variantId })) {
    return { error: 'Ce SKU est déjà utilisé par un autre produit ou variante.' }
  }

  const optionValueIds = (formData.get('optionValueIds') as string)?.split(',').filter(Boolean) ?? []
  const optionValueIdList = optionValueIds.map((id) => id.trim()).filter(Boolean)

  try {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: skuRaw,
        name,
        stock: stockNum,
        minStock: minStockNum,
        priceLabo: priceLabo ?? undefined,
        priceDentiste: priceDentiste ?? undefined,
        priceRevendeur: priceRevendeur ?? undefined,
        cost,
      },
    })
    await prisma.productVariantOptionValue.deleteMany({ where: { variantId } })
    if (optionValueIdList.length > 0) {
      await prisma.productVariantOptionValue.createMany({
        data: optionValueIdList.map((optionValueId) => ({
          variantId,
          optionValueId,
        })),
      })
    }
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate('PRODUCT_VARIANT_UPDATED', 'PRODUCT_VARIANT', variantId, session as any, {}, { sku: skuRaw })
    } catch (e) { console.error('Audit variant update:', e) }
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${existing.productId}`)
    revalidatePath(`/admin/products/${existing.productId}/variants`)
    revalidatePath('/portal')
    redirect(`/admin/products/${existing.productId}/variants?variant=updated`)
  } catch (error: any) {
    if (error.message?.includes('NEXT_REDIRECT')) throw error
    if (error?.code === 'P2002') return { error: 'Ce SKU est déjà utilisé.' }
    return { error: error.message || 'Erreur lors de la mise à jour de la variante.' }
  }
}

/**
 * Check if a SKU is available (not used by any product or variant).
 * For use in admin UI for real-time validation.
 */
export async function checkSkuAvailableAction(
  sku: string,
  options?: { excludeProductId?: string; excludeVariantId?: string }
): Promise<{ available: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { available: false, error: 'Non autorisé' }
  }
  const trimmed = (sku ?? '').trim()
  if (!trimmed) return { available: false, error: 'Le SKU est requis.' }
  const used = await isSkuUsedGlobally(trimmed, options)
  return { available: !used }
}

/**
 * Get a product with its variants, option values per variant, and options with values.
 * For admin product variant/options pages.
 */
export async function getProductWithVariantsAndOptions(productId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      segmentPrices: true,
      variants: {
        include: {
          optionValues: {
            include: {
              optionValue: {
                include: { option: true },
              },
            },
          },
        },
      },
      options: {
        include: { values: true },
        orderBy: { name: 'asc' },
      },
    },
  })
  return product
}

/**
 * Résout la variante à partir des 3 options (Variété, Teinte, Dimension).
 * Utilisé par le panier pour passer d'une ligne "par variété" à une variante complète.
 * Accessible depuis le portail (pas réservé admin).
 */
export async function resolveVariantFromOptions(
  productId: string,
  varieteOptionValueId: string,
  teinteOptionValueId: string,
  dimensionOptionValueId: string
): Promise<{ variant?: { id: string; sku: string; name: string | null; stock: number; priceLabo: number | null; priceDentiste: number | null; priceRevendeur: number | null }; error?: string }> {
  const optionValueIds = [varieteOptionValueId, teinteOptionValueId, dimensionOptionValueId].filter(Boolean)
  if (optionValueIds.length !== 3) {
    return { error: 'Trois options requises (Variété, Teinte, Dimension).' }
  }
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    include: {
      optionValues: { select: { optionValueId: true } },
    },
  })
  const setWanted = new Set(optionValueIds)
  const found = variants.find((v) => {
    const ids = v.optionValues.map((ov) => ov.optionValueId)
    return ids.length === 3 && setWanted.size === 3 && ids.every((id) => setWanted.has(id))
  })
  if (!found) {
    return { error: 'Aucune variante trouvée pour cette combinaison.' }
  }
  return {
    variant: {
      id: found.id,
      sku: found.sku,
      name: found.name,
      stock: found.stock,
      priceLabo: found.priceLabo,
      priceDentiste: found.priceDentiste,
      priceRevendeur: found.priceRevendeur,
    },
  }
}

/**
 * Retourne les options d'un produit avec leurs valeurs, triées par order puis name.
 * Pour le portail (catalogue, panier) — pas de session admin requise.
 */
export async function getProductOptionsForPortal(productId: string) {
  const options = await prisma.productOption.findMany({
    where: { productId },
    include: { values: true },
    orderBy: { name: 'asc' },
  })
  return options
}

/**
 * Résout la variante et calcule le prix HT pour le client connecté (segment + remise).
 * Utilisé par le panier quand le client choisit Teinte et Dimension.
 */
export async function resolveVariantAndPriceForCart(
  productId: string,
  varieteOptionValueId: string,
  teinteOptionValueId: string,
  dimensionOptionValueId: string
) {
  const session = await getSession()
  if (!session) return { error: 'Non connecté' }
  const result = await resolveVariantFromOptions(
    productId,
    varieteOptionValueId,
    teinteOptionValueId,
    dimensionOptionValueId
  )
  if (result.error || !result.variant) return result
  const variant = result.variant
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { segment: true, discountRate: true },
  })
  const segment = (user?.segment ?? 'LABO') as 'LABO' | 'DENTISTE' | 'REVENDEUR'
  const discountRate = user?.discountRate ?? null
  let priceHT = getPriceForSegmentFromVariant(variant, segment)
  const basePriceHT = priceHT
  let discountAmount = 0
  if (discountRate != null && discountRate > 0) {
    discountAmount = priceHT * (discountRate / 100)
    priceHT = priceHT - discountAmount
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true },
  })
  const name = product ? `${product.name} – ${variant.name || variant.sku}` : variant.name || variant.sku
  return {
    variantId: variant.id,
    sku: variant.sku,
    name,
    priceHT,
    basePriceHT,
    discountRate,
    discountAmount,
  }
}

/**
 * Delete a product variant. Fails if variant is used in any order.
 */
export async function deleteVariantAction(variantId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true, sku: true, name: true, orderItems: { select: { id: true } } },
  })
  if (!variant) return { error: 'Variante introuvable.' }
  if (variant.orderItems && variant.orderItems.length > 0) {
    return {
      error: `Impossible de supprimer cette variante : elle est utilisée dans ${variant.orderItems.length} ligne(s) de commande.`,
    }
  }

  try {
    await prisma.productVariant.delete({ where: { id: variantId } })
    try {
      const { logEntityDeletion } = await import('@/lib/audit')
      await logEntityDeletion('PRODUCT_VARIANT_DELETED', 'PRODUCT_VARIANT', variantId, session as any, { sku: variant.sku, name: variant.name })
    } catch (e) { console.error('Audit variant delete:', e) }
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${variant.productId}`)
    revalidatePath('/portal')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la suppression de la variante.' }
  }
}

/** Ligne pour import en masse : SKU requis, reste optionnel */
export type BulkVariantRow = {
  sku: string
  name?: string | null
  stock?: number
  minStock?: number
  priceLabo?: number | null
}

/**
 * Parse CSV/text paste: one variant per line. Separator: ; or ,
 * Columns: SKU; Nom; Stock; Stock min; Prix LABO (optionnel)
 * Header line optional (if first line looks like header, skip it).
 */
function parseBulkVariantsInput(raw: string): BulkVariantRow[] {
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const rows: BulkVariantRow[] = []
  const maybeHeader = lines[0].toLowerCase()
  const start = maybeHeader.includes('sku') || maybeHeader.includes('réf') ? 1 : 0
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim())
    const sku = cells[0]?.trim()
    if (!sku) continue
    const name = cells[1] || null
    const stock = parseInt(cells[2] ?? '0', 10)
    const minStock = parseInt(cells[3] ?? '5', 10)
    const priceLabo = cells[4] ? parseFloat(cells[4]) : null
    rows.push({
      sku,
      name: name || null,
      stock: isNaN(stock) ? 0 : Math.max(0, stock),
      minStock: isNaN(minStock) ? 5 : Math.max(0, minStock),
      priceLabo: priceLabo != null && !isNaN(priceLabo) ? priceLabo : null,
    })
  }
  return rows
}

/**
 * Créer plusieurs variantes en une fois (import en masse).
 * Accepte du texte CSV (séparateur ; ou ,). Colonnes : SKU; Nom; Stock; Stock min; Prix LABO.
 */
export async function bulkCreateVariantsAction(productId: string, csvOrText: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) return { error: 'Produit introuvable.' }

  const rows = parseBulkVariantsInput(csvOrText)
  if (rows.length === 0) {
    return { error: 'Aucune ligne valide. Format : une ligne par variante, colonnes SKU; Nom; Stock; Stock min; Prix LABO (séparateur ; ou ,).' }
  }
  if (rows.length > 500) {
    return { error: 'Maximum 500 variantes par import.' }
  }

  const created: string[] = []
  const errors: string[] = []
  for (const row of rows) {
    if (await isSkuUsedGlobally(row.sku)) {
      errors.push(`SKU "${row.sku}" déjà utilisé, ignoré.`)
      continue
    }
    try {
      const variant = await prisma.productVariant.create({
        data: {
          productId,
          sku: row.sku,
          name: row.name ?? null,
          stock: row.stock ?? 0,
          minStock: row.minStock ?? 5,
          priceLabo: row.priceLabo ?? undefined,
        },
      })
      created.push(variant.sku)
      try {
        const { logEntityCreation } = await import('@/lib/audit')
        await logEntityCreation('PRODUCT_VARIANT_CREATED', 'PRODUCT_VARIANT', variant.id, session as any, { sku: variant.sku, productId })
      } catch (_) {}
    } catch (e: any) {
      if (e?.code === 'P2002') errors.push(`SKU "${row.sku}" : déjà utilisé.`)
      else errors.push(`SKU "${row.sku}" : ${e?.message ?? 'erreur'}.`)
    }
  }
  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}`)
  revalidatePath(`/admin/products/${productId}/variants`)
  revalidatePath('/portal')
  if (created.length > 0) {
    return { success: true, created: created.length, errors: errors.length > 0 ? errors : undefined }
  }
  return { error: errors[0] ?? 'Aucune variante créée.' }
}

/**
 * Génère les variantes à partir des options du produit (produit cartésien des valeurs).
 * Ex. Teinte (A1, A2) × Taille (S, M, L) = 6 variantes. SKU = base + "-" + valeurs.
 */
export async function generateVariantsFromOptionsAction(productId: string, defaultStock?: number, defaultMinStock?: number) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      options: { include: { values: true } },
    },
  })
  if (!product) return { error: 'Produit introuvable.' }
  const options = product.options ?? []
  if (options.length === 0) {
    return { error: 'Ce produit n\'a pas d\'options. Allez dans l\'onglet Options pour définir des attributs (ex. Teinte, Taille) et leurs valeurs.' }
  }
  const optionValues = options.map((o) => (o.values ?? []).map((v) => ({ optionId: o.id, optionName: o.name, valueId: v.id, value: v.value })))
  const withValues = optionValues.every((arr) => arr.length > 0)
  if (!withValues) {
    return { error: 'Chaque option doit avoir au moins une valeur.' }
  }

  function cartesian<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]]
    const [first, ...rest] = arrays
    const restCart = cartesian(rest)
    return first.flatMap((item) => restCart.map((r) => [item, ...r]))
  }
  const valueRows = optionValues.map((arr) => arr.map((v) => v))
  const combinations = cartesian(valueRows)
  const baseSku = (product.sku || product.id.slice(0, 6)).replace(/\s+/g, '-')
  const stock = defaultStock ?? 0
  const minStock = defaultMinStock ?? 5
  const created: string[] = []
  const skipped: string[] = []
  for (const combo of combinations) {
    const parts = combo.map((c: { value: string }) => c.value.replace(/\s+/g, '-'))
    const skuSuffix = parts.join('-')
    const sku = `${baseSku}-${skuSuffix}`
    const name = combo.map((c: { value: string }) => c.value).join(', ')
    if (await isSkuUsedGlobally(sku)) {
      skipped.push(sku)
      continue
    }
    try {
      const variant = await prisma.productVariant.create({
        data: {
          productId,
          sku,
          name,
          stock,
          minStock,
        },
      })
      const optionValueIds = combo.map((c: { valueId: string }) => c.valueId)
      if (optionValueIds.length > 0) {
        await prisma.productVariantOptionValue.createMany({
          data: optionValueIds.map((optionValueId) => ({ variantId: variant.id, optionValueId })),
        })
      }
      created.push(sku)
      try {
        const { logEntityCreation } = await import('@/lib/audit')
        await logEntityCreation('PRODUCT_VARIANT_CREATED', 'PRODUCT_VARIANT', variant.id, session as any, { sku: variant.sku, productId })
      } catch (_) {}
    } catch (_) {
      skipped.push(sku)
    }
  }
  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}`)
  revalidatePath(`/admin/products/${productId}/variants`)
  revalidatePath('/portal')
  if (created.length === 0) {
    return { error: skipped.length > 0 ? 'Toutes les variantes existent déjà (SKU en doublon).' : 'Aucune variante générée.' }
  }
  return { success: true, created: created.length, skipped: skipped.length }
}

/**
 * Create a product option (e.g. "Teinte", "Dimension").
 */
export async function createProductOptionAction(productId: string, name: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Non autorisé' }
  const trimmed = (name ?? '').trim()
  if (!trimmed) return { error: 'Le nom de l\'option est requis.' }
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) return { error: 'Produit introuvable.' }
  try {
    await prisma.productOption.create({
      data: { productId, name: trimmed },
    })
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}`)
    revalidatePath(`/admin/products/${productId}/options`)
    revalidatePath(`/admin/products/${productId}/variants`)
    return { success: true }
  } catch (e: any) {
    return { error: e?.message ?? 'Erreur lors de la création de l\'option.' }
  }
}

/**
 * Add a value to a product option (e.g. "Blanc" for "Teinte").
 */
export async function addProductOptionValueAction(optionId: string, value: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Non autorisé' }
  const trimmed = (value ?? '').trim()
  if (!trimmed) return { error: 'La valeur est requise.' }
  const option = await prisma.productOption.findUnique({
    where: { id: optionId },
    select: { id: true, productId: true },
  })
  if (!option) return { error: 'Option introuvable.' }
  try {
    await prisma.productOptionValue.create({
      data: { optionId, value: trimmed },
    })
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${option.productId}`)
    revalidatePath(`/admin/products/${option.productId}/options`)
    revalidatePath(`/admin/products/${option.productId}/variants`)
    return { success: true }
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'Cette valeur existe déjà pour cette option.' }
    return { error: e?.message ?? 'Erreur lors de l\'ajout de la valeur.' }
  }
}

/**
 * Delete a product option value. Fails if any variant uses it.
 */
export async function deleteProductOptionValueAction(optionValueId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Non autorisé' }
  const optionValue = await prisma.productOptionValue.findUnique({
    where: { id: optionValueId },
    include: { option: true, variantLinks: { select: { id: true } } },
  })
  if (!optionValue) return { error: 'Valeur introuvable.' }
  if (optionValue.variantLinks?.length) {
    return { error: 'Impossible de supprimer : cette valeur est utilisée par des variantes.' }
  }
  try {
    await prisma.productOptionValue.delete({ where: { id: optionValueId } })
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${optionValue.option.productId}`)
    revalidatePath(`/admin/products/${optionValue.option.productId}/options`)
    revalidatePath(`/admin/products/${optionValue.option.productId}/variants`)
    return { success: true }
  } catch (e: any) {
    return { error: e?.message ?? 'Erreur lors de la suppression.' }
  }
}

/**
 * Delete a product option. Deletes all its values; fails if any variant uses any value.
 */
export async function deleteProductOptionAction(optionId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Non autorisé' }
  const option = await prisma.productOption.findUnique({
    where: { id: optionId },
    include: {
      values: {
        include: { variantLinks: { select: { id: true } } },
      },
    },
  })
  if (!option) return { error: 'Option introuvable.' }
  const hasVariantLinks = option.values?.some((v) => v.variantLinks?.length) ?? false
  if (hasVariantLinks) {
    return { error: 'Impossible de supprimer : des variantes utilisent les valeurs de cette option.' }
  }
  try {
    await prisma.productOptionValue.deleteMany({ where: { optionId } })
    await prisma.productOption.delete({ where: { id: optionId } })
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${option.productId}`)
    revalidatePath(`/admin/products/${option.productId}/options`)
    revalidatePath(`/admin/products/${option.productId}/variants`)
    return { success: true }
  } catch (e: any) {
    return { error: e?.message ?? 'Erreur lors de la suppression de l\'option.' }
  }
}

/**
 * Get available sellable units for order editing.
 * Returns one entry per product (if no variants) or one per variant (if product has variants), with stock > 0.
 * When clientId is provided, caller must be ADMIN and pricing uses that client's segment/discount.
 */
export async function getAvailableProducts(clientId?: string | null) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  const userId = (() => {
    if (clientId != null && clientId !== '') {
      if (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL') return null
      return clientId
    }
    return session.id
  })()

  if (userId === null) return { error: 'Non autorisé' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { segment: true, discountRate: true, role: true },
    })
    if (clientId && user?.role !== 'CLIENT') {
      return { error: 'Client introuvable.' }
    }
    const segment = user?.segment || 'LABO'
    const discountRate = user?.discountRate ?? null

    const products = await prisma.product.findMany({
      include: {
        segmentPrices: true,
        variants: true,
      },
      orderBy: { name: 'asc' },
    })

    const units: Array<{
      id: string
      productId: string
      productVariantId?: string
      name: string
      sku: string | null
      stock: number
      price: number
    }> = []

    for (const product of products) {
      if (hasVariants(product)) {
        for (const variant of product.variants ?? []) {
          if (variant.stock <= 0) continue
          let price = getPriceForSegmentFromVariant(variant, segment as any)
          if (discountRate && discountRate > 0) price = price * (1 - discountRate / 100)
          units.push({
            id: variant.id,
            productId: product.id,
            productVariantId: variant.id,
            name: `${product.name} – ${variant.name || variant.sku}`,
            sku: variant.sku ?? product.sku ?? null,
            stock: variant.stock,
            price,
          })
        }
      } else {
        if (product.stock <= 0) continue
        let price = getPriceForSegment(product, segment as any)
        if (discountRate && discountRate > 0) price = price * (1 - discountRate / 100)
        units.push({
          id: product.id,
          productId: product.id,
          name: product.name,
          sku: product.sku ?? null,
          stock: product.stock,
          price,
        })
      }
    }

    return { products: units }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la récupération des produits' }
  }
}
