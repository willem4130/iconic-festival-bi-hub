/**
 * Prisma Database Client
 *
 * Singleton pattern to prevent multiple Prisma Client instances in development
 */

import { PrismaClient } from '@prisma/client'
import { env } from '@/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Export as 'db' for compatibility
export const db = prisma

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
