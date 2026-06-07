import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'
import {
  validateVercelAppUrl,
  generatePdfResponse,
  handlePdfError,
  getResolvedAppUrl,
} from '@/app/lib/pdf-route-handler'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMIT_PRESETS.PDF)
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = 'pdf/admin/purchases/[id]'

  try {
    const { id: purchaseOrderId } = await params

    if (!purchaseOrderId || typeof purchaseOrderId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid purchase order ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const session = await getSession()
    if (!session) {
      await logUnauthorizedAccess(
        `/api/pdf/admin/purchases/${purchaseOrderId}`,
        'Non authentifié',
        req.headers,
        null
      )
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (
      session.role !== 'ADMIN' &&
      session.role !== 'COMMERCIAL' &&
      session.role !== 'MAGASINIER'
    ) {
      await logUnauthorizedAccess(
        `/api/pdf/admin/purchases/${purchaseOrderId}`,
        `Rôle requis: ADMIN, COMMERCIAL ou MAGASINIER (actuel: ${session.role})`,
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: { id: true, orderNumber: true },
    })

    if (!po) {
      return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const vercelError = validateVercelAppUrl(requestId)
    if (vercelError) return vercelError

    const appUrl = getResolvedAppUrl()
    const printUrl = `${appUrl}/pdf-export/admin/purchases/${purchaseOrderId}`
    const filename = `${po.orderNumber}.pdf`

    return await generatePdfResponse({
      printUrl,
      filename,
      route,
      requestId,
      notFoundMessage: 'Bon de commande introuvable ou accès refusé',
    })
  } catch (error) {
    return handlePdfError(error, route, requestId)
  }
}
