import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Log des requêtes SQL uniquement si DEBUG=prisma (ex: DEBUG=prisma npm run dev)
const logOptions = process.env.DEBUG?.includes('prisma') ? ['query'] as const : undefined

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(
    logOptions ? { log: ['query'] } : undefined
  )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
