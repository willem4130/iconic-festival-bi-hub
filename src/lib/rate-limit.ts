import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting utility using Upstash Redis
 * Free tier: 10,000 requests/day
 */

// Check if Upstash Redis is configured
const isRedisConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

// Create Redis instance only if configured
let redis: Redis | undefined

if (isRedisConfigured) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
} else {
  console.warn(
    '⚠️ Upstash Redis not configured - rate limiting is DISABLED. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable rate limiting.'
  )
}

/**
 * Standard rate limit: 10 requests per 10 seconds
 * Use for general API endpoints
 */
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: '@api/ratelimit',
    })
  : null

/**
 * Strict rate limit: 5 requests per 10 seconds
 * Use for sensitive operations (create, update, delete)
 */
export const strictRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 s'),
      analytics: true,
      prefix: '@api/strict-ratelimit',
    })
  : null

/**
 * Auth rate limit: 3 attempts per minute
 * Use for authentication endpoints
 */
export const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '60 s'),
      analytics: true,
      prefix: '@api/auth-ratelimit',
    })
  : null

/**
 * Get client identifier from request
 * Uses IP address or forwarded IP
 */
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  if (realIp) {
    return realIp
  }

  return 'unknown'
}
