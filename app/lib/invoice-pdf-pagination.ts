/**
 * Règles de pagination premium pour le template PDF facture.
 *
 * Règle métier :
 * - 1 à 8 lignes : une page unique
 * - 9 lignes et + : split initial équilibré (page 1 = header + cartes, plus chargée visuellement)
 * - Rééquilibrage léger : éviter une dernière page quasi vide, sans vider la page 1
 */

/** Nombre max de lignes produits sur la page 1. */
export const LINES_PER_FIRST_PAGE = 8

/** Nombre max de lignes produits par page suivante (pages 2+). */
export const LINES_PER_SUBSEQUENT_PAGE = 25

/**
 * Minimum de lignes produits sur la dernière page (totaux en dessous).
 * Plus bas que l’ancien 6 : le bloc montant/RIB/totaux occupe déjà de la hauteur.
 */
export const MIN_LINES_LAST_PAGE = 4

/** Minimum à conserver sur la page 1 lors d’un rééquilibrage (header + cartes). */
export const MIN_LINES_FIRST_PAGE = 6

/** Minimum sur les pages intermédiaires (2 … avant-dernière). */
export const MIN_LINES_ANY_PAGE = 4

/** Jusqu’à ce total, split initial favorisant la page 1 (évite 8+2 puis drain → 4+6). */
export const BALANCED_SPLIT_MAX_TOTAL = 18

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
 * Nombre de lignes sur la page 1 au split initial (factures courtes multi-pages).
 * Ex. 10 lignes → 6 + 4 (et non 8 + 2 qui menait au rééquilibrage 4 + 6).
 */
export function getInitialFirstPageCount(total: number): number {
  if (total <= LINES_PER_FIRST_PAGE) return total
  if (total <= BALANCED_SPLIT_MAX_TOTAL) {
    // Plancher 5 au split initial (6 réservé au rééquilibrage sur page 1).
    const splitFloor = Math.min(MIN_LINES_FIRST_PAGE, 5)
    return Math.min(
      LINES_PER_FIRST_PAGE,
      Math.max(splitFloor, total - MIN_LINES_LAST_PAGE)
    )
  }
  return LINES_PER_FIRST_PAGE
}

function minLinesToKeepOnPage(pageIndex: number): number {
  return pageIndex === 0 ? MIN_LINES_FIRST_PAGE : MIN_LINES_ANY_PAGE
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

  const firstCount = getInitialFirstPageCount(items.length)
  const slices: PaginationSlice[] = []
  const firstPageItems = items.slice(0, firstCount)
  slices.push({ pageIndex: 0, items: firstPageItems, isContinuation: false })

  let rest = items.slice(firstCount)
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
    const canTake = Math.max(0, prevItems.length - minLinesToKeepOnPage(prev.pageIndex))
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
