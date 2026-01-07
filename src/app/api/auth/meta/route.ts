/**
 * Meta OAuth Initiation Route
 *
 * GET /api/auth/meta
 *
 * Initiates the Meta OAuth flow by:
 * 1. Generating a CSRF state token
 * 2. Storing it in the database (more reliable than cookies for cross-site redirects)
 * 3. Redirecting to Facebook OAuth dialog
 */

import { NextResponse } from 'next/server'
import {
  buildAuthorizationUrl,
  createOAuthConfigFromEnv,
  generateStateToken,
  META_OAUTH_SCOPES,
} from '@/lib/meta-api/oauth'
import { db } from '@/server/db'

const STATE_EXPIRY_MINUTES = 10 // State token valid for 10 minutes

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

  // Store state in database (more reliable than cookies for cross-site OAuth)
  // This avoids issues with sameSite cookie restrictions and browser privacy settings
  const expiresAt = new Date(Date.now() + STATE_EXPIRY_MINUTES * 60 * 1000)
  await db.oAuthState.create({
    data: {
      state,
      expiresAt,
    },
  })

  // Clean up expired states (fire and forget)
  db.oAuthState
    .deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })
    .catch(() => {
      // Ignore cleanup errors
    })

  // Build authorization URL
  const authUrl = buildAuthorizationUrl(config, state, [...META_OAUTH_SCOPES])

  // Redirect to Facebook OAuth dialog
  return NextResponse.redirect(authUrl)
}
