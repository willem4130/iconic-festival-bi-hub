/**
 * Meta OAuth Flow
 *
 * Handles Facebook/Instagram OAuth authentication flow.
 * Supports:
 * - Authorization URL generation
 * - Token exchange (code -> access token)
 * - Long-lived token exchange (short-lived -> long-lived)
 * - Token refresh
 */

import crypto from 'crypto'

const META_API_VERSION = 'v21.0'
const META_BASE_URL = 'https://graph.facebook.com'
const META_OAUTH_URL = 'https://www.facebook.com'

/**
 * Required OAuth scopes for full functionality
 */
export const META_OAUTH_SCOPES = [
  'pages_show_list', // List pages user manages
  'pages_read_engagement', // Read page engagement data
  'pages_read_user_content', // Read user content on pages
  'read_insights', // Read insights data
  'instagram_basic', // Basic Instagram access
  'instagram_manage_insights', // Instagram insights
  'business_management', // Business/Ad account access
  'ads_read', // Read ad data (optional, for ads feature)
] as const

export type MetaOAuthScope = (typeof META_OAUTH_SCOPES)[number]

export interface MetaOAuthConfig {
  appId: string
  appSecret: string
  redirectUri: string
}

export interface MetaTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

export interface MetaLongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number // Seconds until expiration (typically 5184000 = 60 days)
}

export interface MetaUserInfo {
  id: string
  name?: string
  email?: string
}

export interface MetaTokenDebugInfo {
  app_id: string
  type: string
  application: string
  data_access_expires_at: number
  expires_at: number
  is_valid: boolean
  scopes: string[]
  user_id?: string
}

export interface MetaOAuthError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

/**
 * Generate a cryptographically secure state token for CSRF protection
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Build the Meta OAuth authorization URL
 * User will be redirected here to authorize the app
 */
export function buildAuthorizationUrl(
  config: MetaOAuthConfig,
  state: string,
  scopes: MetaOAuthScope[] = [...META_OAUTH_SCOPES]
): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state,
    scope: scopes.join(','),
    response_type: 'code',
  })

  return `${META_OAUTH_URL}/${META_API_VERSION}/dialog/oauth?${params.toString()}`
}

/**
 * Exchange authorization code for short-lived access token
 */
export async function exchangeCodeForToken(
  config: MetaOAuthConfig,
  code: string
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/oauth/access_token?${params.toString()}`
  )

  const data = (await response.json()) as MetaTokenResponse | MetaOAuthError

  if ('error' in data) {
    throw new MetaOAuthFlowError(
      `Failed to exchange code: ${data.error.message}`,
      data.error.code,
      data.error.type
    )
  }

  return data
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function exchangeForLongLivedToken(
  config: MetaOAuthConfig,
  shortLivedToken: string
): Promise<MetaLongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/oauth/access_token?${params.toString()}`
  )

  const data = (await response.json()) as MetaLongLivedTokenResponse | MetaOAuthError

  if ('error' in data) {
    throw new MetaOAuthFlowError(
      `Failed to exchange for long-lived token: ${data.error.message}`,
      data.error.code,
      data.error.type
    )
  }

  return data
}

/**
 * Refresh a long-lived token before it expires
 * Note: Long-lived tokens can only be refreshed if they haven't expired yet
 */
export async function refreshLongLivedToken(
  config: MetaOAuthConfig,
  currentToken: string
): Promise<MetaLongLivedTokenResponse> {
  // Refreshing a long-lived token uses the same endpoint as initial exchange
  return exchangeForLongLivedToken(config, currentToken)
}

/**
 * Get information about the authenticated user
 */
export async function getMetaUserInfo(accessToken: string): Promise<MetaUserInfo> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,email',
  })

  const response = await fetch(`${META_BASE_URL}/${META_API_VERSION}/me?${params.toString()}`)

  const data = (await response.json()) as MetaUserInfo | MetaOAuthError

  if ('error' in data) {
    throw new MetaOAuthFlowError(
      `Failed to get user info: ${data.error.message}`,
      data.error.code,
      data.error.type
    )
  }

  return data
}

/**
 * Debug/validate an access token
 */
export async function debugToken(
  config: MetaOAuthConfig,
  tokenToDebug: string
): Promise<MetaTokenDebugInfo> {
  // Use app access token for debugging
  const appAccessToken = `${config.appId}|${config.appSecret}`

  const params = new URLSearchParams({
    input_token: tokenToDebug,
    access_token: appAccessToken,
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/debug_token?${params.toString()}`
  )

  const data = (await response.json()) as { data: MetaTokenDebugInfo } | MetaOAuthError

  if ('error' in data) {
    throw new MetaOAuthFlowError(
      `Failed to debug token: ${data.error.message}`,
      data.error.code,
      data.error.type
    )
  }

  return data.data
}

/**
 * Check if a token is valid and not expired
 */
export async function isTokenValid(config: MetaOAuthConfig, token: string): Promise<boolean> {
  try {
    const debug = await debugToken(config, token)
    return debug.is_valid
  } catch {
    return false
  }
}

/**
 * Get days until token expiration
 */
export async function getTokenDaysRemaining(
  config: MetaOAuthConfig,
  token: string
): Promise<number | null> {
  try {
    const debug = await debugToken(config, token)

    if (!debug.is_valid || debug.expires_at === 0) {
      return null
    }

    const expiresAt = new Date(debug.expires_at * 1000)
    const now = new Date()
    const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return daysRemaining
  } catch {
    return null
  }
}

/**
 * Revoke an access token (logout)
 */
export async function revokeToken(accessToken: string): Promise<boolean> {
  const params = new URLSearchParams({
    access_token: accessToken,
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/me/permissions?${params.toString()}`,
    {
      method: 'DELETE',
    }
  )

  const data = (await response.json()) as { success: boolean } | MetaOAuthError

  if ('error' in data) {
    throw new MetaOAuthFlowError(
      `Failed to revoke token: ${data.error.message}`,
      data.error.code,
      data.error.type
    )
  }

  return data.success
}

/**
 * Create OAuth config from environment variables
 */
export function createOAuthConfigFromEnv(): MetaOAuthConfig | null {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL

  if (!appId || !appSecret || !baseUrl) {
    return null
  }

  return {
    appId,
    appSecret,
    redirectUri: `${baseUrl}/api/auth/meta/callback`,
  }
}

/**
 * Custom error class for Meta OAuth errors
 */
export class MetaOAuthFlowError extends Error {
  code: number
  type: string

  constructor(message: string, code: number, type: string) {
    super(message)
    this.name = 'MetaOAuthFlowError'
    this.code = code
    this.type = type
  }
}
