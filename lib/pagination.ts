/**
 * Parse page/pageSize from searchParams with safe bounds.
 * Avoids negative or excessive values that could overload DB.
 */
export function parsePaginationParams(params: {
  [key: string]: string | string[] | undefined
}) {
  const page = Math.max(1, Math.floor(Number(params.page) || 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(params.pageSize) || 20)))
  return { page, pageSize }
}
