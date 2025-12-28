import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { ratelimit, strictRatelimit, getClientIdentifier } from './rate-limit'

/**
 * API Response helper
 */
export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * API Error response helper
 */
export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status }
  )
}

/**
 * Rate limiting middleware
 * @param request - Next.js request object
 * @param strict - Use strict rate limiting (5 req/10s instead of 10 req/10s)
 */
export async function withRateLimit(request: NextRequest, strict = false) {
  const limiter = strict ? strictRatelimit : ratelimit

  // Skip rate limiting if Upstash is not configured
  if (!limiter) {
    return null
  }

  const identifier = getClientIdentifier(request)
  const { success, limit, reset, remaining } = await limiter.limit(identifier)

  if (!success) {
    return apiError('Too many requests. Please try again later.', 429, {
      limit,
      remaining,
      reset: new Date(reset).toISOString(),
    })
  }

  return null // null means rate limit passed
}

/**
 * API Key authentication middleware
 * Checks for API key in Authorization header or x-api-key header
 * Can be replaced with your preferred auth system (NextAuth, Clerk, etc.)
 */
export function withAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const apiKeyHeader = request.headers.get('x-api-key')

  const apiKey = authHeader?.replace('Bearer ', '') || apiKeyHeader

  // If no API_SECRET_KEY is configured, skip auth check (development mode)
  if (!process.env.API_SECRET_KEY) {
    console.warn('⚠️ API_SECRET_KEY not configured - API routes are unprotected!')
    return null
  }

  if (!apiKey) {
    return apiError('Missing API key. Provide via Authorization header or x-api-key header.', 401)
  }

  if (apiKey !== process.env.API_SECRET_KEY) {
    return apiError('Invalid API key', 403)
  }

  return null // null means auth passed
}

/**
 * Request body validation middleware using Zod
 */
export async function validateRequest<T>(request: NextRequest, schema: ZodSchema<T>) {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return { data: validatedData, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: apiError('Validation error', 400, error.issues),
      }
    }
    return {
      data: null,
      error: apiError('Invalid request body', 400),
    }
  }
}

/**
 * Combined middleware wrapper for protected API routes
 * Applies rate limiting, authentication, and error handling
 */
export async function protectedRoute(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    strictRateLimit?: boolean
    skipAuth?: boolean
  } = {}
) {
  try {
    // Apply rate limiting
    const rateLimitError = await withRateLimit(request, options.strictRateLimit)
    if (rateLimitError) return rateLimitError

    // Apply authentication
    if (!options.skipAuth) {
      const authError = withAuth(request)
      if (authError) return authError
    }

    // Execute handler
    return await handler(request)
  } catch (error) {
    // Log error to console
    console.error('API Error:', error)

    // Sentry error tracking disabled
    // Error already logged to console above

    return apiError('Internal server error', 500, {
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
