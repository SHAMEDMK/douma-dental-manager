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
import { getQuoteNumberFromOrderNumber } from "@/app/lib/sequence"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const testId = req.headers.get("X-Rate-Limit-Test-Id")
  const rateLimitResponse = await withRateLimit(
    req,
    RATE_LIMIT_PRESETS.PDF,
    testId ? { identifierOverride: testId } : undefined
  )
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = "pdf/admin/orders/[id]/devis"

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
        `/api/pdf/admin/orders/${orderId}/devis`,
        "Non authentifié",
        req.headers,
        null
      )
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (
      session.role !== "ADMIN" &&
      session.role !== "COMPTABLE" &&
      session.role !== "MAGASINIER" &&
      session.role !== "COMMERCIAL"
    ) {
      await logUnauthorizedAccess(
        `/api/pdf/admin/orders/${orderId}/devis`,
        `Rôle requis: ADMIN, COMPTABLE, MAGASINIER ou COMMERCIAL (actuel: ${session.role})`,
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
      select: { id: true, orderNumber: true, createdAt: true },
    })

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const vercelError = validateVercelAppUrl(requestId)
    if (vercelError) return vercelError

    const quoteNumber = getQuoteNumberFromOrderNumber(
      order.orderNumber,
      order.createdAt
    )
    const filename = `${quoteNumber}.pdf`
    const appUrl = getResolvedAppUrl()
    const printUrl = `${appUrl}/pdf-export/admin/orders/${orderId}/devis`

    return await generatePdfResponse({
      printUrl,
      filename,
      route,
      requestId,
      notFoundMessage: "Devis introuvable ou accès refusé",
    })
  } catch (error) {
    return handlePdfError(error, route, requestId)
  }
}
