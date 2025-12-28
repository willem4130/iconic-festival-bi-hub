import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side environment variables schema
   */
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    // Upstash Redis for rate limiting
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // API Key for protected routes (optional - can be replaced with auth)
    API_SECRET_KEY: z.string().min(32).optional(),
    // Sentry (for error tracking and source maps upload)
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    // NextAuth
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url().optional(),
    // Email (Resend)
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().default('noreply@example.com'),
    EMAIL_REPLY_TO: z.string().email().optional(), // Inbound email for replies
    // Slack (optional)
    SLACK_BOT_TOKEN: z.string().optional(),

    // Meta (Facebook/Instagram) API
    META_APP_ID: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    META_ACCESS_TOKEN: z.string().optional(),
    META_PAGE_ID: z.string().optional(),
    META_INSTAGRAM_ACCOUNT_ID: z.string().optional(),
    META_AD_ACCOUNT_ID: z.string().optional(),

    // External Data Sources
    OPENWEATHERMAP_API_KEY: z.string().optional(),
    WEATHER_LOCATION_LAT: z.string().optional(),
    WEATHER_LOCATION_LON: z.string().optional(),
  },

  /**
   * Client-side environment variables schema
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    // NEXT_PUBLIC_APP_URL: z.string().url(),
    // Sentry DSN (public, safe to expose)
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },

  /**
   * Runtime environment variables
   * You can't destructure `process.env` as a regular object in Next.js edge runtimes
   * so we need to destructure manually
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    API_SECRET_KEY: process.env.API_SECRET_KEY,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,

    // Meta API
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
    META_PAGE_ID: process.env.META_PAGE_ID,
    META_INSTAGRAM_ACCOUNT_ID: process.env.META_INSTAGRAM_ACCOUNT_ID,
    META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,

    // External Data Sources
    OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
    WEATHER_LOCATION_LAT: process.env.WEATHER_LOCATION_LAT,
    WEATHER_LOCATION_LON: process.env.WEATHER_LOCATION_LON,
    // NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Skip validation in build (for Docker builds)
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined
   */
  emptyStringAsUndefined: true,
})
