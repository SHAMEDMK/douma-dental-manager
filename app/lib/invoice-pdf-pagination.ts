/**
 * Règles de pagination premium pour le template PDF facture.
 *
 * Règle métier :
 * - 1 à 8 lignes : une page unique si la hauteur le permet
 * - 9 lignes et + : répartition équilibrée avec rééquilibrage
 *
 * Rééquilibrage : si la dernière page (totaux + montant) contient moins de
 * MIN_LINES_LAST_PAGE lignes, on déplace des lignes depuis la page précédente
 * pour un rendu plus naturel et premium (éviter une page 2 vide).
 */

/** Nombre max de lignes produits sur la page 1 (sans rééquilibrage). */
export const LINES_PER_FIRST_PAGE = 8

/** Nombre max de lignes produits par page suivante (pages 2+). */
export const LINES_PER_SUBSEQUENT_PAGE = 25

/** Si la dernière page a moins de lignes, on rééquilibre depuis la page précédente. */
export const MIN_LINES_LAST_PAGE = 6

/** Minimum de lignes à garder sur toute page lors du rééquilibrage. */
export const MIN_LINES_ANY_PAGE = 4

/** Hauteur estimée d'une ligne produit (mm). */
export const ROW_HEIGHT_MM = 8.5

/** Hauteur estimée d'une ligne en mode compact (mm). */
export const ROW_HEIGHT_COMPACT_MM = 6.5

export type PaginationSlice = {
  /** Indice 0-based de la page. */
  pageIndex: number
  /** Lignes pour cette page. */
  items: unknown[]
  /** true si c'est une page de continuation (2+). */
  isContinuation: boolean
}

/**
 * Répartition des items en tranches équilibrées.
 * Applique un rééquilibrage si la dernière page serait trop vide.
 */
export function paginateItems<T>(items: T[]): PaginationSlice[] {
  if (items.length === 0) return []

  if (items.length <= LINES_PER_FIRST_PAGE) {
    return [{ pageIndex: 0, items: [...items], isContinuation: false }]
  }

  const slices: PaginationSlice[] = []
  const firstPageItems = items.slice(0, LINES_PER_FIRST_PAGE)
  slices.push({ pageIndex: 0, items: firstPageItems, isContinuation: false })

  let rest = items.slice(LINES_PER_FIRST_PAGE)
  let pageIndex = 1
  while (rest.length > 0) {
    const chunk = rest.slice(0, LINES_PER_SUBSEQUENT_PAGE)
    rest = rest.slice(LINES_PER_SUBSEQUENT_PAGE)
    slices.push({ pageIndex, items: chunk, isContinuation: true })
    pageIndex++
  }

  // Rééquilibrage : dernière page trop vide → déplacer des lignes depuis la précédente
  let changed = true
  while (changed && slices.length > 1) {
    changed = false
    const last = slices[slices.length - 1]!
    const lastItems = last.items as T[]
    const prev = slices[slices.length - 2]!
    const prevItems = prev.items as T[]

    if (lastItems.length >= MIN_LINES_LAST_PAGE) break

    const needed = MIN_LINES_LAST_PAGE - lastItems.length
    const canTake = Math.max(0, prevItems.length - MIN_LINES_ANY_PAGE)
    const take = Math.min(needed, canTake)

    if (take > 0) {
      const moved = prevItems.slice(-take)
      slices[slices.length - 2] = {
        ...prev,
        items: prevItems.slice(0, -take),
      }
      slices[slices.length - 1] = {
        ...last,
        items: [...moved, ...lastItems],
      }
      changed = true
    } else {
      break
    }
  }

  return slices
}
