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
  const testId = req.headers.get("X-Rate-Limit-Test-Id")
  const rateLimitResponse = await withRateLimit(
    req,
    RATE_LIMIT_PRESETS.PDF,
    testId ? { identifierOverride: testId } : undefined
  )
  if (rateLimitResponse) return rateLimitResponse

  const requestId = crypto.randomUUID()
  const route = "pdf/admin/invoices/[id]"

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
        `/api/pdf/admin/invoices/${invoiceId}`,
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
        `/api/pdf/admin/invoices/${invoiceId}`,
        `Rôle requis: ADMIN, COMPTABLE, MAGASINIER ou COMMERCIAL (actuel: ${session.role})`,
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
      select: { invoiceNumber: true, id: true, createdAt: true },
    })

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
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

    // Utiliser la page pdf-export dédiée (sans barre, badge Verrouillée, ni en-tête app)
    const printUrl =
      session.role === "COMPTABLE"
        ? `${appUrl}/pdf-export/comptable/invoices/${invoiceId}`
        : `${appUrl}/pdf-export/admin/invoices/${invoiceId}`

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
