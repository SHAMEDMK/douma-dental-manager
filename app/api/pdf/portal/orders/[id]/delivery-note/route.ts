import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit-middleware"
import { logUnauthorizedAccess } from "@/lib/audit-security"
import {
  validateVercelAppUrl,
  generatePdfResponse,
  handlePdfError,
  getResolvedAppUrl,
} from "@/app/lib/pdf-route-handler"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMIT_PRESETS.PDF)
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = "pdf/portal/orders/delivery-note/[id]"

  try {
    const { id: orderId } = await params

    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid order ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const session = await getSession()
    if (!session) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/orders/${orderId}/delivery-note`,
        "Non authentifié",
        req.headers,
        null
      )
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (session.role !== "CLIENT") {
      await logUnauthorizedAccess(
        `/api/pdf/portal/orders/${orderId}/delivery-note`,
        `Rôle requis: CLIENT (actuel: ${session.role})`,
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        deliveryNoteNumber: true,
        status: true,
      },
    })

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (order.userId !== session.id) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/orders/${orderId}/delivery-note`,
        "Commande appartient à un autre utilisateur",
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!order.deliveryNoteNumber) {
      return new Response(
        JSON.stringify({ error: "Delivery note not available for this order" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    const vercelError = validateVercelAppUrl(requestId)
    if (vercelError) return vercelError

    const appUrl = getResolvedAppUrl()
    const printUrl = `${appUrl}/portal/orders/${orderId}/delivery-note/print?pdf=1`
    const filename = `${order.deliveryNoteNumber}.pdf`

    return await generatePdfResponse({
      printUrl,
      filename,
      route,
      requestId,
      notFoundMessage: "Bon de livraison introuvable ou accès refusé",
    })
  } catch (error) {
    return handlePdfError(error, route, requestId)
  }
}
