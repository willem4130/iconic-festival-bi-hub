/**
 * Meta OAuth Initiation Route
 *
 * GET /api/auth/meta
 *
 * Initiates the Meta OAuth flow by:
 * 1. Generating a CSRF state token
 * 2. Storing it in a secure cookie
 * 3. Redirecting to Facebook OAuth dialog
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  buildAuthorizationUrl,
  createOAuthConfigFromEnv,
  generateStateToken,
  META_OAUTH_SCOPES,
} from '@/lib/meta-api/oauth'

const STATE_COOKIE_NAME = 'meta_oauth_state'
const STATE_COOKIE_MAX_AGE = 60 * 10 // 10 minutes

export async function GET() {
  // Get OAuth configuration
  const config = createOAuthConfigFromEnv()

  if (!config) {
    return NextResponse.json(
      {
        error: 'Meta OAuth not configured',
        message: 'Missing META_APP_ID, META_APP_SECRET, or NEXTAUTH_URL environment variables',
      },
      { status: 500 }
    )
  }

  // Generate CSRF state token
  const state = generateStateToken()

  // Store state in cookie for verification in callback
  // Using sameSite: 'none' with secure: true to ensure cookie is sent on cross-site redirect
  const cookieStore = await cookies()
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: true, // Required for sameSite: 'none'
    sameSite: 'none', // Required for cross-site OAuth redirects
    maxAge: STATE_COOKIE_MAX_AGE,
    path: '/',
  })

  // Build authorization URL
  const authUrl = buildAuthorizationUrl(config, state, [...META_OAUTH_SCOPES])

  // Redirect to Facebook OAuth dialog
  return NextResponse.redirect(authUrl)
}
