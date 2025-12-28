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
  const price = formData.get('price') as string
  const stock = formData.get('stock') as string
  const minStock = formData.get('minStock') as string
  const category = formData.get('category') as string
  const imageUrl = formData.get('imageUrl') as string

  // Validation
  if (!name || name.trim() === '') {
    return { error: 'Le nom du produit est requis' }
  }

  const priceNum = parseFloat(price || '0')
  if (isNaN(priceNum) || priceNum < 0) {
    return { error: 'Le prix doit être un nombre positif' }
  }

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
        price: priceNum,
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

