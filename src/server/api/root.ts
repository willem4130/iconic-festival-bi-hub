import { createTRPCRouter } from '@/server/api/trpc'
import { settingsRouter } from '@/server/api/routers/settings'
import { usersRouter } from '@/server/api/routers/users'
import { uploadRouter } from '@/server/api/routers/upload'
import { mappingRouter } from '@/server/api/routers/mapping'
import { transformationRouter } from '@/server/api/routers/transformation'
import { validationRouter } from '@/server/api/routers/validation'
import { analyticsRouter } from '@/server/api/routers/analytics'
import { metaInsightsRouter } from '@/server/api/routers/meta-insights'
import { weatherRouter } from '@/server/api/routers/weather'
import { linkTrackingRouter } from '@/server/api/routers/link-tracking'
import { hashtagsRouter } from '@/server/api/routers/hashtags'
import { sentimentRouter } from '@/server/api/routers/sentiment'
import { socialListeningRouter } from '@/server/api/routers/social-listening'
import { correlationsRouter } from '@/server/api/routers/correlations'
import { metaAuthRouter } from '@/server/api/routers/meta-auth'

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
  weather: weatherRouter,
  linkTracking: linkTrackingRouter,
  hashtags: hashtagsRouter,
  sentiment: sentimentRouter,
  socialListening: socialListeningRouter,
  correlations: correlationsRouter,
  metaAuth: metaAuthRouter,
})

// Export type definition of API
export type AppRouter = typeof appRouter
