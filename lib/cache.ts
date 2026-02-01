/**
 * Cache en mémoire avec TTL (Time To Live) configurable.
 * - Stockage via Map
 * - Nettoyage automatique des entrées expirées lors des accès (get/set/getOrSet)
 * - Types TypeScript stricts (pas de any)
 */

/** TTL par défaut en millisecondes (30 secondes). */
export const DEFAULT_TTL_MS = 30 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

/**
 * Supprime toutes les entrées dont le TTL est dépassé.
 * Appelée automatiquement lors des accès pour éviter une croissance illimitée.
 */
function clearExpired(): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    const e = entry as CacheEntry<unknown>
    if (now >= e.expiresAt) {
      store.delete(key)
    }
  }
}

/**
 * Récupère une valeur en cache.
 * @returns La valeur si présente et non expirée, sinon null.
 */
export function get<T>(key: string): T | null {
  clearExpired()
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value
}

/**
 * Enregistre une valeur en cache.
 * @param key Clé
 * @param value Valeur (sérialisable en mémoire)
 * @param ttl TTL en millisecondes (défaut: DEFAULT_TTL_MS)
 */
export function set<T>(key: string, value: T, ttl?: number): void {
  clearExpired()
  const ttlMs = ttl ?? DEFAULT_TTL_MS
  const expiresAt = Date.now() + ttlMs
  store.set(key, { value, expiresAt })
}

/**
 * Supprime une entrée du cache par clé.
 * (Interface « delete » : non utilisable en JS car mot réservé, d’où le nom deleteKey.)
 */
export function deleteKey(key: string): void {
  store.delete(key)
}

/**
 * Vide tout le cache.
 */
export function clear(): void {
  store.clear()
}

/**
 * Indique si une clé est présente et non expirée.
 */
export function has(key: string): boolean {
  clearExpired()
  const entry = store.get(key) as CacheEntry<unknown> | undefined
  if (!entry) return false
  if (Date.now() >= entry.expiresAt) {
    store.delete(key)
    return false
  }
  return true
}

/**
 * Récupère la valeur en cache ou exécute la fonction et met le résultat en cache.
 * @param key Clé
 * @param fetchFn Fonction asynchrone appelée en cas de cache miss
 * @param ttl TTL en millisecondes (défaut: DEFAULT_TTL_MS)
 * @returns La valeur (depuis le cache ou depuis fetchFn)
 */
export async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = get<T>(key)
  if (cached !== null) {
    return cached
  }
  const value = await fetchFn()
  set(key, value, ttl)
  return value
}

// --- Clé et helper pour le dashboard admin ---

export const ADMIN_DASHBOARD_CACHE_KEY = 'admin-dashboard-stats'

/**
 * Récupère les stats du dashboard admin depuis le cache (TTL 30 s) ou en les recalculant.
 * À utiliser dans app/admin/page.tsx.
 *
 * @example
 * const stats = await getCachedAdminDashboardStats(fetchDashboardStats)
 */
export async function getCachedAdminDashboardStats<T>(
  fetchFn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  return getOrSet(ADMIN_DASHBOARD_CACHE_KEY, fetchFn, ttlMs)
}

/*
 * --- Exemple d'utilisation ---
 *
 * // Récupération / mise en cache
 * const value = get<{ count: number }>('my-key')
 * if (value) console.log(value.count)
 *
 * set('my-key', { count: 42 }, 10_000)  // TTL 10 s
 * set('my-key', { count: 42 })          // TTL par défaut 30 s
 *
 * // Présence
 * if (has('my-key')) { ... }
 *
 * // Suppression
 * deleteKey('my-key')
 * clear()
 *
 * // Récupérer ou calculer (getOrSet)
 * const data = await getOrSet('expensive', async () => {
 *   const res = await fetch('/api/expensive')
 *   return res.json()
 * }, 60_000)
 *
 * // Dashboard admin (cache 30 s)
 * const stats = await getCachedAdminDashboardStats(fetchDashboardStats)
 */
