import { createTRPCRouter } from '@/server/api/trpc'
import { settingsRouter } from '@/server/api/routers/settings'
import { usersRouter } from '@/server/api/routers/users'
import { uploadRouter } from '@/server/api/routers/upload'
import { mappingRouter } from '@/server/api/routers/mapping'
import { transformationRouter } from '@/server/api/routers/transformation'
import { validationRouter } from '@/server/api/routers/validation'
import { analyticsRouter } from '@/server/api/routers/analytics'
import { metaInsightsRouter } from '@/server/api/routers/meta-insights'

/**
 * This is the primary router for your server.
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  settings: settingsRouter,
  users: usersRouter,
  upload: uploadRouter,
  mapping: mappingRouter,
  transformation: transformationRouter,
  validation: validationRouter,
  analytics: analyticsRouter,
  metaInsights: metaInsightsRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
