/**
 * Meta Account Discovery
 *
 * Discovers Facebook Pages and Instagram Business accounts that the user has access to.
 * Used after OAuth to list available accounts for connection.
 */

const META_API_VERSION = 'v21.0'
const META_BASE_URL = 'https://graph.facebook.com'

/**
 * Discovered Facebook Page
 */
export interface DiscoveredFacebookPage {
  id: string
  name: string
  accessToken: string // Page-specific access token (never expires when derived from long-lived user token)
  category?: string
  username?: string
  profilePictureUrl?: string
  followersCount?: number
  instagramBusinessAccount?: {
    id: string
  }
}

/**
 * Discovered Instagram Business Account
 */
export interface DiscoveredInstagramAccount {
  id: string
  username: string
  name?: string
  profilePictureUrl?: string
  followersCount?: number
  followsCount?: number
  mediaCount?: number
  biography?: string
  linkedFacebookPageId: string
  linkedFacebookPageName: string
}

/**
 * All discovered accounts
 */
export interface DiscoveredAccounts {
  facebookPages: DiscoveredFacebookPage[]
  instagramAccounts: DiscoveredInstagramAccount[]
}

interface MetaApiError {
  error: {
    message: string
    type: string
    code: number
  }
}

interface PageResponse {
  id: string
  name: string
  access_token: string
  category?: string
  username?: string
  picture?: {
    data: {
      url: string
    }
  }
  followers_count?: number
  instagram_business_account?: {
    id: string
  }
}

interface InstagramResponse {
  id: string
  username: string
  name?: string
  profile_picture_url?: string
  followers_count?: number
  follows_count?: number
  media_count?: number
  biography?: string
}

/**
 * Discover all Facebook Pages the user has access to
 */
export async function discoverFacebookPages(
  userAccessToken: string
): Promise<DiscoveredFacebookPage[]> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields:
      'id,name,access_token,category,username,picture,followers_count,instagram_business_account',
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/me/accounts?${params.toString()}`
  )

  const data = (await response.json()) as { data: PageResponse[] } | MetaApiError

  if ('error' in data) {
    throw new AccountDiscoveryError(
      `Failed to discover Facebook pages: ${data.error.message}`,
      data.error.code
    )
  }

  return data.data.map((page) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    category: page.category,
    username: page.username,
    profilePictureUrl: page.picture?.data?.url,
    followersCount: page.followers_count,
    instagramBusinessAccount: page.instagram_business_account,
  }))
}

/**
 * Get Instagram Business Account info using the page's access token
 */
export async function getInstagramAccountInfo(
  instagramAccountId: string,
  pageAccessToken: string
): Promise<InstagramResponse> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields:
      'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography',
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/${instagramAccountId}?${params.toString()}`
  )

  const data = (await response.json()) as InstagramResponse | MetaApiError

  if ('error' in data) {
    throw new AccountDiscoveryError(
      `Failed to get Instagram account info: ${data.error.message}`,
      data.error.code
    )
  }

  return data
}

/**
 * Discover all Instagram Business Accounts linked to the user's Facebook Pages
 */
export async function discoverInstagramAccounts(
  pages: DiscoveredFacebookPage[]
): Promise<DiscoveredInstagramAccount[]> {
  const instagramAccounts: DiscoveredInstagramAccount[] = []

  for (const page of pages) {
    if (page.instagramBusinessAccount?.id) {
      try {
        const igInfo = await getInstagramAccountInfo(
          page.instagramBusinessAccount.id,
          page.accessToken
        )

        instagramAccounts.push({
          id: igInfo.id,
          username: igInfo.username,
          name: igInfo.name,
          profilePictureUrl: igInfo.profile_picture_url,
          followersCount: igInfo.followers_count,
          followsCount: igInfo.follows_count,
          mediaCount: igInfo.media_count,
          biography: igInfo.biography,
          linkedFacebookPageId: page.id,
          linkedFacebookPageName: page.name,
        })
      } catch (error) {
        // Log but don't fail if we can't get Instagram info for one page
        console.warn(
          `Failed to get Instagram account for page ${page.name}:`,
          error instanceof Error ? error.message : error
        )
      }
    }
  }

  return instagramAccounts
}

/**
 * Discover all accounts (Facebook Pages and Instagram Business Accounts)
 */
export async function discoverAllAccounts(userAccessToken: string): Promise<DiscoveredAccounts> {
  // First, discover all Facebook Pages
  const facebookPages = await discoverFacebookPages(userAccessToken)

  // Then, discover Instagram accounts linked to those pages
  const instagramAccounts = await discoverInstagramAccounts(facebookPages)

  return {
    facebookPages,
    instagramAccounts,
  }
}

/**
 * Get page access token for a specific page
 * Page access tokens derived from long-lived user tokens don't expire
 */
export async function getPageAccessToken(pageId: string, userAccessToken: string): Promise<string> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields: 'access_token',
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/${pageId}?${params.toString()}`
  )

  const data = (await response.json()) as { access_token: string } | MetaApiError

  if ('error' in data) {
    throw new AccountDiscoveryError(
      `Failed to get page access token: ${data.error.message}`,
      data.error.code
    )
  }

  return data.access_token
}

/**
 * Check if a page has the required permissions
 */
export async function checkPagePermissions(
  pageId: string,
  userAccessToken: string
): Promise<{ hasInsights: boolean; hasPosts: boolean }> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
  })

  const response = await fetch(
    `${META_BASE_URL}/${META_API_VERSION}/${pageId}/permissions?${params.toString()}`
  )

  const data = (await response.json()) as
    | {
        data: Array<{ permission: string; status: string }>
      }
    | MetaApiError

  if ('error' in data) {
    return { hasInsights: false, hasPosts: false }
  }

  const permissions = data.data.reduce(
    (acc, p) => {
      acc[p.permission] = p.status === 'granted'
      return acc
    },
    {} as Record<string, boolean>
  )

  return {
    hasInsights: permissions['read_insights'] ?? false,
    hasPosts: permissions['pages_read_user_content'] ?? false,
  }
}

/**
 * Custom error class for account discovery errors
 */
export class AccountDiscoveryError extends Error {
  code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'AccountDiscoveryError'
    this.code = code
  }
}
