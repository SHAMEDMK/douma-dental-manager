/** Statuts pour lesquels un lien public signé est autorisé (pas brouillon ni annulée). */
const PUBLIC_SHARE_STATUSES = new Set(['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'])

export function isPurchaseOrderPubliclyShareable(status: string): boolean {
  return PUBLIC_SHARE_STATUSES.has(status)
}
