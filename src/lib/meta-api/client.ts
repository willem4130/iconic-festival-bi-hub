/**
 * Meta Graph API Client
 *
 * Handles authentication, rate limiting, and request management
 * for the Facebook/Instagram Graph API.
 */

import type { MetaApiConfig, MetaApiError, MetaApiResponse } from './types'

const DEFAULT_API_VERSION = 'v21.0'
const BASE_URL = 'https://graph.facebook.com'

export class MetaApiClient {
  private config: Required<Omit<MetaApiConfig, 'pageId' | 'instagramAccountId' | 'adAccountId'>> &
    Pick<MetaApiConfig, 'pageId' | 'instagramAccountId' | 'adAccountId'>

  constructor(config: MetaApiConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion ?? DEFAULT_API_VERSION,
    }
  }

  /**
   * Get the base URL for API requests
   */
  private getBaseUrl(): string {
    return `${BASE_URL}/${this.config.apiVersion}`
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params: Record<string, string | number | boolean> = {}): URL {
    const url = new URL(`${this.getBaseUrl()}${endpoint}`)

    // Add access token
    url.searchParams.set('access_token', this.config.accessToken)

    // Add other params
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }

    return url
  }

  /**
   * Make a GET request to the Meta API
   */
  async get<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<MetaApiResponse<T>> {
    const url = this.buildUrl(endpoint, params)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    const data = (await response.json()) as Record<string, unknown>

    if (data.error) {
      throw new MetaApiClientError(data.error as MetaApiError)
    }

    return { data: data as T }
  }

  /**
   * Make a POST request to the Meta API
   */
  async post<T>(
    endpoint: string,
    body: Record<string, unknown> = {},
    params: Record<string, string | number | boolean> = {}
  ): Promise<MetaApiResponse<T>> {
    const url = this.buildUrl(endpoint, params)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as Record<string, unknown>

    if (data.error) {
      throw new MetaApiClientError(data.error as MetaApiError)
    }

    return { data: data as T }
  }

  /**
   * Fetch all pages of a paginated response
   */
  async getAllPages<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
    maxPages = 10
  ): Promise<T[]> {
    const results: T[] = []
    let nextUrl: string | undefined
    let pageCount = 0

    // Initial request
    const url = this.buildUrl(endpoint, params)
    let response = await fetch(url.toString())
    let json = (await response.json()) as { data: T[]; paging?: { next?: string } }

    if (Array.isArray(json.data)) {
      results.push(...json.data)
    }

    nextUrl = json.paging?.next
    pageCount++

    // Follow pagination
    while (nextUrl && pageCount < maxPages) {
      response = await fetch(nextUrl)
      json = (await response.json()) as { data: T[]; paging?: { next?: string } }

      if (Array.isArray(json.data)) {
        results.push(...json.data)
      }

      nextUrl = json.paging?.next
      pageCount++
    }

    return results
  }

  // ===========================================
  // Token Management
  // ===========================================

  /**
   * Exchange short-lived token for long-lived token
   * Long-lived tokens are valid for 60 days
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<{
    access_token: string
    token_type: string
    expires_in: number
  }> {
    const response = await this.get<{
      access_token: string
      token_type: string
      expires_in: number
    }>('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      fb_exchange_token: shortLivedToken,
    })

    return response.data
  }

  /**
   * Get debug info for an access token
   */
  async debugToken(token?: string): Promise<{
    app_id: string
    type: string
    application: string
    data_access_expires_at: number
    expires_at: number
    is_valid: boolean
    scopes: string[]
    user_id?: string
  }> {
    const response = await this.get<{
      data: {
        app_id: string
        type: string
        application: string
        data_access_expires_at: number
        expires_at: number
        is_valid: boolean
        scopes: string[]
        user_id?: string
      }
    }>('/debug_token', {
      input_token: token ?? this.config.accessToken,
    })

    return response.data.data
  }

  /**
   * Check if token is expired or expiring soon (within 7 days)
   */
  async isTokenExpiring(token?: string): Promise<{
    isExpiring: boolean
    expiresAt: Date | null
    daysRemaining: number | null
  }> {
    try {
      const debug = await this.debugToken(token)

      if (!debug.is_valid) {
        return { isExpiring: true, expiresAt: null, daysRemaining: null }
      }

      if (debug.expires_at === 0) {
        // Token never expires
        return { isExpiring: false, expiresAt: null, daysRemaining: null }
      }

      const expiresAt = new Date(debug.expires_at * 1000)
      const now = new Date()
      const daysRemaining = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        isExpiring: daysRemaining <= 7,
        expiresAt,
        daysRemaining,
      }
    } catch {
      return { isExpiring: true, expiresAt: null, daysRemaining: null }
    }
  }

  // ===========================================
  // Convenience Getters
  // ===========================================

  get pageId(): string | undefined {
    return this.config.pageId
  }

  get instagramAccountId(): string | undefined {
    return this.config.instagramAccountId
  }

  get adAccountId(): string | undefined {
    return this.config.adAccountId
  }

  get apiVersion(): string {
    return this.config.apiVersion
  }
}

/**
 * Custom error class for Meta API errors
 */
export class MetaApiClientError extends Error {
  code: number
  type: string
  subcode?: number
  fbtraceId?: string

  constructor(error: MetaApiError) {
    super(error.message)
    this.name = 'MetaApiClientError'
    this.code = error.code
    this.type = error.type
    this.subcode = error.error_subcode
    this.fbtraceId = error.fbtrace_id
  }
}

/**
 * Create a Meta API client from environment variables
 */
export function createMetaClientFromEnv(): MetaApiClient | null {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!appId || !appSecret || !accessToken) {
    return null
  }

  return new MetaApiClient({
    appId,
    appSecret,
    accessToken,
    pageId: process.env.META_PAGE_ID,
    instagramAccountId: process.env.META_INSTAGRAM_ACCOUNT_ID,
    adAccountId: process.env.META_AD_ACCOUNT_ID,
  })
}
