/**
 * Meta OAuth Callback Route
 *
 * GET /api/auth/meta/callback
 *
 * Handles the OAuth callback from Facebook:
 * 1. Verifies CSRF state token
 * 2. Exchanges code for access token
 * 3. Exchanges for long-lived token (60 days)
 * 4. Gets user info and discovers pages/Instagram accounts
 * 5. Stores MetaConnection in database
 * 6. Redirects to account selection page
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerAuthSession } from '@/server/auth'
import { db } from '@/server/db'
import {
  createOAuthConfigFromEnv,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getMetaUserInfo,
} from '@/lib/meta-api/oauth'
import { discoverAllAccounts } from '@/lib/meta-api/account-discovery'

const STATE_COOKIE_NAME = 'meta_oauth_state'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Get base URL for redirects
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const settingsUrl = `${baseUrl}/admin/settings/connections`

  // Handle OAuth errors from Facebook
  if (error) {
    console.error('Meta OAuth error:', error, errorDescription)
    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', 'oauth_denied')
    errorUrl.searchParams.set('message', errorDescription ?? 'User denied access')
    return NextResponse.redirect(errorUrl)
  }

  // Verify required parameters
  if (!code || !state) {
    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', 'missing_params')
    errorUrl.searchParams.set('message', 'Missing code or state parameter')
    return NextResponse.redirect(errorUrl)
  }

  // Verify CSRF state token
  const cookieStore = await cookies()
  const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value

  // Log for debugging
  console.log('OAuth callback - state validation:', {
    receivedState: state?.substring(0, 10) + '...',
    storedState: storedState?.substring(0, 10) + '...',
    match: storedState === state,
  })

  if (!storedState || storedState !== state) {
    console.error('State mismatch:', {
      hasStoredState: !!storedState,
      statesMatch: storedState === state,
    })
    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', 'invalid_state')
    errorUrl.searchParams.set('message', 'Invalid state token - please try again')
    return NextResponse.redirect(errorUrl)
  }

  // Clear state cookie
  cookieStore.delete(STATE_COOKIE_NAME)

  // Get authenticated user session (or use dev-user if NextAuth not configured)
  const session = await getServerAuthSession()

  // Use session user ID if available, otherwise use 'dev-user'
  // This allows the OAuth flow to work without full NextAuth setup
  const userId = session?.user?.id ?? 'dev-user'

  // Get OAuth configuration
  const config = createOAuthConfigFromEnv()

  if (!config) {
    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', 'config_error')
    errorUrl.searchParams.set('message', 'Meta OAuth not configured')
    return NextResponse.redirect(errorUrl)
  }

  try {
    console.log('OAuth callback - starting token exchange')

    // Step 1: Exchange code for short-lived token
    const tokenResponse = await exchangeCodeForToken(config, code)
    console.log('OAuth callback - got short-lived token')

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedToken = await exchangeForLongLivedToken(config, tokenResponse.access_token)

    // Calculate expiration date (expires_in is in seconds)
    const tokenExpiresAt = new Date(Date.now() + longLivedToken.expires_in * 1000)

    // Step 3: Get Meta user info
    const userInfo = await getMetaUserInfo(longLivedToken.access_token)

    // Step 4: Discover available pages and Instagram accounts
    const discoveredAccounts = await discoverAllAccounts(longLivedToken.access_token)

    console.log('OAuth callback - discovered accounts:', {
      pages: discoveredAccounts.facebookPages.length,
      instagram: discoveredAccounts.instagramAccounts.length,
    })

    // Step 5: Store MetaConnection in database
    // Use upsert to handle reconnection scenarios
    console.log('OAuth callback - storing connection for user:', userId)
    const metaConnection = await db.metaConnection.upsert({
      where: {
        userId_metaUserId: {
          userId,
          metaUserId: userInfo.id,
        },
      },
      create: {
        userId,
        metaUserId: userInfo.id,
        metaUserName: userInfo.name,
        accessToken: longLivedToken.access_token,
        tokenExpiresAt,
        scopes: [
          'pages_show_list',
          'pages_read_engagement',
          'pages_read_user_content',
          'read_insights',
          'instagram_basic',
          'instagram_manage_insights',
          'business_management',
        ],
        status: 'ACTIVE',
      },
      update: {
        metaUserName: userInfo.name,
        accessToken: longLivedToken.access_token,
        tokenExpiresAt,
        tokenRefreshedAt: new Date(),
        status: 'ACTIVE',
        lastErrorMessage: null,
        lastErrorAt: null,
      },
    })

    console.log('OAuth callback - connection saved:', metaConnection.id)

    // Store discovered accounts in session/temp storage for selection step
    // Using cookies with short expiration for simplicity
    const accountsData = JSON.stringify({
      connectionId: metaConnection.id,
      facebookPages: discoveredAccounts.facebookPages.map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username,
        category: p.category,
        profilePictureUrl: p.profilePictureUrl,
        followersCount: p.followersCount,
        hasInstagram: !!p.instagramBusinessAccount,
        // Don't store access token in cookie - will fetch from API when needed
      })),
      instagramAccounts: discoveredAccounts.instagramAccounts.map((a) => ({
        id: a.id,
        username: a.username,
        name: a.name,
        profilePictureUrl: a.profilePictureUrl,
        followersCount: a.followersCount,
        linkedFacebookPageId: a.linkedFacebookPageId,
        linkedFacebookPageName: a.linkedFacebookPageName,
      })),
    })

    // Store in cookie (size limit ~4KB, should be fine for most cases)
    cookieStore.set('meta_discovered_accounts', accountsData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30, // 30 minutes
      path: '/',
    })

    // Redirect to settings page with success indicator
    const successUrl = new URL(settingsUrl)
    successUrl.searchParams.set('meta_connected', 'true')
    successUrl.searchParams.set('show_selector', 'true')

    return NextResponse.redirect(successUrl)
  } catch (error) {
    console.error('Meta OAuth callback error:', error)

    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', 'oauth_failed')
    errorUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'Failed to complete OAuth flow'
    )

    return NextResponse.redirect(errorUrl)
  }
}
