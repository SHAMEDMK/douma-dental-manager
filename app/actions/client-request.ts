'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const MAX_MESSAGE_LENGTH = 500

export async function createClientRequestAction(
  type: 'PRODUCT_REQUEST' | 'ADVICE' | 'CONTACT' | 'REMARK',
  message: string
) {
  const session = await getSession()
  if (!session) {
    return { error: 'Non authentifié' }
  }

  // Validation
  if (!type || !['PRODUCT_REQUEST', 'ADVICE', 'CONTACT', 'REMARK'].includes(type)) {
    return { error: 'Type de demande invalide' }
  }

  if (!message || message.trim().length === 0) {
    return { error: 'Le message est requis' }
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { error: `Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères` }
  }

  try {
    // Try to create the request - catch Prisma errors
    let request
    try {
      request = await prisma.clientRequest.create({
        data: {
          userId: session.id,
          type,
          message: message.trim(),
          status: 'PENDING'
        }
      })
      console.log('✅ Client request created successfully:', request.id)
    } catch (prismaError: any) {
      // Check if it's a "model not found" or "property doesn't exist" error
      const errorMessage = prismaError.message || ''
      const errorCode = prismaError.code || ''
      
      if (
        errorCode === 'P2001' || 
        errorMessage.includes('Unknown model') || 
        errorMessage.includes('clientRequest') ||
        errorMessage.includes('Cannot read properties') ||
        errorMessage.includes('undefined')
      ) {
        console.error('❌ ClientRequest model not available in Prisma client')
        console.error('Error details:', { code: errorCode, message: errorMessage })
        return { 
          error: 'Le modèle ClientRequest n\'est pas encore disponible. Veuillez exécuter dans votre terminal:\n\n1. npx prisma generate\n2. npx prisma db push\n\nPuis redémarrer le serveur de développement.' 
        }
      }
      // Re-throw other Prisma errors (foreign key, validation, etc.)
      throw prismaError
    }

    // Log audit: Client request created
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      await logEntityCreation(
        'CLIENT_REQUEST_CREATED',
        'CLIENT_REQUEST',
        request.id,
        session as any,
        {
          type,
          messageLength: message.length,
          status: 'PENDING'
        }
      )
    } catch (auditError) {
      console.error('Failed to log client request creation:', auditError)
    }

    revalidatePath('/portal/request')
    revalidatePath('/admin/requests')

    return { success: true, requestId: request.id }
  } catch (error: any) {
    console.error('Error creating client request:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    return { 
      error: error.message || 'Erreur lors de la création de la demande',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
}

export async function updateRequestStatusAction(
  requestId: string,
  status: 'READ' | 'RESOLVED',
  adminNotes?: string
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  try {
    // Check if ClientRequest model exists
    if (!prisma.clientRequest) {
      return { error: 'Le modèle ClientRequest n\'est pas encore disponible. Veuillez exécuter: npx prisma generate && npx prisma db push' }
    }

    const request = await prisma.clientRequest.findUnique({
      where: { id: requestId }
    })

    if (!request) {
      return { error: 'Demande introuvable' }
    }

    const updateData: Prisma.ClientRequestUpdateInput = {
      status,
      adminNotes: adminNotes?.trim() || null,
    }

    if (status === 'READ' && !request.readAt) {
      updateData.readAt = new Date()
    }

    if (status === 'RESOLVED' && !request.resolvedAt) {
      updateData.resolvedAt = new Date()
    }

    const updated = await prisma.clientRequest.update({
      where: { id: requestId },
      data: updateData
    })

    // Log audit: Request status updated
    try {
      const { logStatusChange } = await import('@/lib/audit')
      await logStatusChange(
        'CLIENT_REQUEST_STATUS_CHANGED',
        'CLIENT_REQUEST',
        requestId,
        request.status,
        status,
        session as any,
        {
          requestType: request.type,
          adminNotes: adminNotes || null
        }
      )
    } catch (auditError) {
      console.error('Failed to log request status change:', auditError)
    }

    revalidatePath('/admin/requests')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating request status:', error)
    return { error: error.message || 'Erreur lors de la mise à jour' }
  }
}
