import { prisma } from '@/lib/prisma'
import { verifyPurchaseOrderShareToken } from '@/app/lib/purchase-order-share-token'
import { isPurchaseOrderPubliclyShareable } from '@/app/lib/purchase-order-public-access'

export type PublicPurchaseOrderAccess =
  | { ok: true; purchaseOrderId: string }
  | { ok: false; status: 400 | 403 | 404; message: string }

/**
 * Valide le jeton public et vérifie que la commande existe et est partageable.
 */
export async function resolvePublicPurchaseOrderAccess(
  purchaseOrderId: string,
  token: string | null | undefined
): Promise<PublicPurchaseOrderAccess> {
  if (!token?.trim()) {
    return { ok: false, status: 403, message: 'Lien invalide ou expiré' }
  }

  const tokenPoId = await verifyPurchaseOrderShareToken(token.trim())
  if (!tokenPoId || tokenPoId !== purchaseOrderId) {
    return { ok: false, status: 403, message: 'Lien invalide ou expiré' }
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { id: true, status: true },
  })

  if (!po) {
    return { ok: false, status: 404, message: 'Bon de commande introuvable' }
  }

  if (!isPurchaseOrderPubliclyShareable(po.status)) {
    return { ok: false, status: 403, message: 'Ce bon de commande n’est plus accessible' }
  }

  return { ok: true, purchaseOrderId: po.id }
}
