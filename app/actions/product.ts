'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
    await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: price, // Legacy field, set to priceLabo
        priceLabo: priceLabo,
        priceDentiste: priceDentiste,
        priceRevendeur: priceRevendeur,
        stock: stockNum,
        minStock: minStockNum,
        category: category?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
      },
    })

    revalidatePath('/admin/products')
    revalidatePath('/admin/stock')
    redirect('/admin/products')
  } catch (error) {
    console.error('Error creating product:', error)
    return { error: 'Erreur lors de la création du produit' }
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
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: price, // Legacy field, set to priceLabo
        priceLabo: priceLabo,
        priceDentiste: priceDentiste,
        priceRevendeur: priceRevendeur,
        stock: stockNum,
        minStock: minStockNum,
        category: category?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
      },
    })

    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}`)
    revalidatePath('/admin/stock')
    redirect('/admin/products')
  } catch (error) {
    console.error('Error updating product:', error)
    return { error: 'Erreur lors de la mise à jour du produit' }
  }
}

