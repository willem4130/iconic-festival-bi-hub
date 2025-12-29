/**
 * Short.io Link Tracking API Client
 * @see https://developers.short.io/reference/
 */

import type {
  LinkTrackingConfig,
  ShortIoLink,
  ShortIoCreateRequest,
  ShortIoLinkStats,
  UTMParams,
  TrackedLink,
} from './types'
import { buildUrlWithUtm } from './types'

export class LinkTrackingError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'LinkTrackingError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class LinkTrackingClient {
  private apiKey: string
  private domain: string
  private baseUrl = 'https://api.short.io'

  constructor(config: LinkTrackingConfig) {
    this.apiKey = config.apiKey
    this.domain = config.domain
  }

  /**
   * Make a request to the Short.io API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // Use status text if JSON parsing fails
        errorMessage = response.statusText || errorMessage
      }
      throw new LinkTrackingError(errorMessage, 'API_ERROR', response.status)
    }

    return response.json() as Promise<T>
  }

  /**
   * Create a new short link with optional UTM parameters
   */
  async createLink(
    originalUrl: string,
    options?: {
      title?: string
      utmParams?: UTMParams
      customPath?: string
    }
  ): Promise<ShortIoLink> {
    // Build URL with UTM parameters if provided
    const urlWithUtm = options?.utmParams
      ? buildUrlWithUtm(originalUrl, options.utmParams)
      : originalUrl

    const body: ShortIoCreateRequest = {
      domain: this.domain,
      originalURL: urlWithUtm,
      title: options?.title,
      path: options?.customPath,
      allowDuplicates: false,
    }

    const link = await this.request<ShortIoLink>('/links', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    // Store UTM params for reference
    return {
      ...link,
      utmSource: options?.utmParams?.source,
      utmMedium: options?.utmParams?.medium,
      utmCampaign: options?.utmParams?.campaign,
      utmContent: options?.utmParams?.content,
      utmTerm: options?.utmParams?.term,
    }
  }

  /**
   * Get link details by ID
   */
  async getLink(linkId: string): Promise<ShortIoLink> {
    return this.request<ShortIoLink>(`/links/${linkId}`)
  }

  /**
   * Get link statistics
   */
  async getLinkStats(
    linkId: string,
    options?: {
      startDate?: Date
      endDate?: Date
    }
  ): Promise<ShortIoLinkStats> {
    let endpoint = `/links/${linkId}/statistics`

    const params = new URLSearchParams()
    if (options?.startDate) {
      params.set('startDate', options.startDate.toISOString().split('T')[0]!)
    }
    if (options?.endDate) {
      params.set('endDate', options.endDate.toISOString().split('T')[0]!)
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }

    return this.request<ShortIoLinkStats>(endpoint)
  }

  /**
   * List all links for the domain
   */
  async listLinks(options?: { limit?: number; offset?: number }): Promise<ShortIoLink[]> {
    const params = new URLSearchParams({
      domain_id: this.domain,
      limit: String(options?.limit ?? 50),
      offset: String(options?.offset ?? 0),
    })

    return this.request<ShortIoLink[]>(`/links?${params.toString()}`)
  }

  /**
   * Delete a link
   */
  async deleteLink(linkId: string): Promise<void> {
    await this.request(`/links/${linkId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Update a link
   */
  async updateLink(
    linkId: string,
    updates: {
      title?: string
      originalUrl?: string
    }
  ): Promise<ShortIoLink> {
    return this.request<ShortIoLink>(`/links/${linkId}`, {
      method: 'POST',
      body: JSON.stringify(updates),
    })
  }

  /**
   * Validate API key by listing links
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.listLinks({ limit: 1 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get domain info
   */
  get domainName(): string {
    return this.domain
  }

  /**
   * Convert Short.io link to internal TrackedLink format
   */
  toTrackedLink(link: ShortIoLink): TrackedLink {
    return {
      id: link.id,
      shortUrl: link.shortURL,
      originalUrl: link.originalURL,
      shortCode: link.path,
      title: link.title,
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      utmContent: link.utmContent,
      utmTerm: link.utmTerm,
      totalClicks: link.clicks ?? 0,
      uniqueClicks: link.uniqueClicks ?? 0,
      createdAt: new Date(link.createdAt),
    }
  }
}

/**
 * Create a LinkTrackingClient from environment variables
 */
export function createLinkTrackingClientFromEnv(): LinkTrackingClient | null {
  const apiKey = process.env.SHORT_IO_API_KEY
  const domain = process.env.SHORT_IO_DOMAIN

  if (!apiKey || !domain) {
    console.warn('Link Tracking: SHORT_IO_API_KEY or SHORT_IO_DOMAIN not configured')
    return null
  }

  return new LinkTrackingClient({
    apiKey,
    domain,
  })
}
