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
  const route = "pdf/portal/invoices/[id]"

  try {
    const { id: invoiceId } = await params

    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid invoice ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const session = await getSession()
    if (!session) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/invoices/${invoiceId}`,
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
        `/api/pdf/portal/invoices/${invoiceId}`,
        `Rôle requis: CLIENT (actuel: ${session.role})`,
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        id: true,
        createdAt: true,
        order: { select: { userId: true } },
      },
    })

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (invoice.order.userId !== session.id) {
      await logUnauthorizedAccess(
        `/api/pdf/portal/invoices/${invoiceId}`,
        `Facture appartient à un autre utilisateur`,
        req.headers,
        session
      )
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const vercelError = validateVercelAppUrl(requestId)
    if (vercelError) return vercelError

    const safeId = invoice.id.replace(/[^a-zA-Z0-9_-]/g, "")
    const rawNumber = invoice.invoiceNumber?.trim() ?? ""
    const invoiceNumber = rawNumber.length > 0 ? rawNumber : `FAC-${safeId}`
    const filename = `${invoiceNumber}.pdf`
    const appUrl = getResolvedAppUrl()
    const printUrl = `${appUrl}/portal/invoices/${invoiceId}/print?pdf=1`

    return await generatePdfResponse({
      printUrl,
      filename,
      route,
      requestId,
      notFoundMessage: "Facture introuvable ou accès refusé",
    })
  } catch (error) {
    return handlePdfError(error, route, requestId)
  }
}
