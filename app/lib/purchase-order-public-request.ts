import { prisma } from '@/lib/prisma'
import {
  normalizeShareTokenInput,
  verifyPurchaseOrderShareToken,
} from '@/app/lib/purchase-order-share-token'
import { isPurchaseOrderPubliclyShareable } from '@/app/lib/purchase-order-public-access'

export type PublicPurchaseOrderAccess =
  | { ok: true; purchaseOrderId: string; token: string }
  | { ok: false; status: 400 | 403 | 404; message: string; reason: string }

/**
 * Valide le jeton public et vérifie que la commande existe et est partageable.
 */
export async function resolvePublicPurchaseOrderAccess(
  purchaseOrderId: string,
  rawToken: string | string[] | null | undefined
): Promise<PublicPurchaseOrderAccess> {
  const token = normalizeShareTokenInput(rawToken)
  if (!token) {
    return {
      ok: false,
      status: 403,
      message: 'Lien invalide ou expiré',
      reason: 'missing_token',
    }
  }

  const tokenPoId = await verifyPurchaseOrderShareToken(token)
  if (!tokenPoId) {
    return {
      ok: false,
      status: 403,
      message: 'Lien invalide ou expiré',
      reason: 'invalid_signature_or_expired',
    }
  }

  if (tokenPoId !== purchaseOrderId) {
    return {
      ok: false,
      status: 403,
      message: 'Lien invalide ou expiré',
      reason: 'po_id_mismatch',
    }
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { id: true, status: true },
  })

  if (!po) {
    return {
      ok: false,
      status: 404,
      message: 'Bon de commande introuvable',
      reason: 'po_not_found',
    }
  }

  if (!isPurchaseOrderPubliclyShareable(po.status)) {
    return {
      ok: false,
      status: 403,
      message: 'Ce bon de commande n’est plus accessible',
      reason: 'status_not_shareable',
    }
  }

  return { ok: true, purchaseOrderId: po.id, token }
}
