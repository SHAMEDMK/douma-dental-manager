/**
 * Utilitaires pour l'affichage des lignes de commande / facture avec support des variantes.
 * Utiliser partout où on affiche des OrderItem (admin, portail, emails, PDF).
 */

export type LineItemProduct = { name: string; sku?: string | null }
export type LineItemVariant = { name?: string | null; sku?: string | null } | null | undefined

export type LineItemLike = {
  product: LineItemProduct | null
  productVariant?: LineItemVariant
}

/**
 * Retourne le nom d'affichage d'une ligne : "Produit" ou "Produit - Nom variante / SKU variante".
 */
export function getLineItemDisplayName(item: LineItemLike): string {
  const productName = item.product?.name ?? 'Produit'
  if (item.productVariant) {
    const variantName = item.productVariant.name || item.productVariant.sku
    return variantName
      ? `${productName} - ${variantName}`
      : productName
  }
  return productName
}

/**
 * Retourne le SKU à afficher : variante si présente, sinon produit.
 */
export function getLineItemSku(item: LineItemLike): string {
  const sku = item.productVariant?.sku ?? item.product?.sku
  return sku ?? '-'
}
