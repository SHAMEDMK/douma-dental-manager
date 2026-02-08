/**
 * Schémas Zod pour la validation des requêtes API.
 * À utiliser avec .safeParse() ou .parse() sur body/query.
 */
import { z } from 'zod'

/** Query pour les exports (factures, commandes, clients) */
export const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv']).optional().default('xlsx'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

/** Paramètres de route pour un ID type CUID */
export const cuidParamSchema = z.object({
  id: z.string().cuid(),
})

/** Body pour création / mise à jour (exemples à adapter) */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ExportQuery = z.infer<typeof exportQuerySchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
