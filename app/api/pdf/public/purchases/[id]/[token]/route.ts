import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-middleware'
import {
  validateVercelAppUrl,
  generatePublicPdfResponse,
  handlePdfError,
} from '@/app/lib/pdf-route-handler'
import { resolvePublicPurchaseOrderAccess } from '@/app/lib/purchase-order-public-request'
import { buildPurchaseOrderPublicPdfExportUrl } from '@/app/lib/purchase-order-share-token'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMIT_PRESETS.PDF)
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = 'pdf/public/purchases/[id]/[token]'

  try {
    const { id: purchaseOrderId, token } = await params

    if (!purchaseOrderId || typeof purchaseOrderId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid purchase order ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const access = await resolvePublicPurchaseOrderAccess(purchaseOrderId, token)
    if (!access.ok) {
      return new Response(JSON.stringify({ error: access.message }), {
        status: access.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: { orderNumber: true },
    })

    if (!po) {
      return new Response(JSON.stringify({ error: 'Purchase order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const vercelError = validateVercelAppUrl(requestId)
    if (vercelError) return vercelError

    const printUrl = buildPurchaseOrderPublicPdfExportUrl(purchaseOrderId, access.token)
    const filename = `${po.orderNumber}.pdf`

    return await generatePublicPdfResponse({
      printUrl,
      filename,
      route,
      requestId,
      notFoundMessage: 'Bon de commande introuvable ou lien expiré',
    })
  } catch (error) {
    return handlePdfError(error, route, requestId)
  }
}
