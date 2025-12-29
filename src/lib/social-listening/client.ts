/**
 * Brand24 Social Listening API Client
 * @see https://developers.brand24.com/
 */

import type {
  SocialListeningConfig,
  Brand24Mention,
  Brand24MentionsResponse,
  Brand24ProjectSummary,
  TrackedMention,
  MentionSentiment,
  SourceType,
} from './types'
import { shouldRequireResponse } from './types'

export class SocialListeningError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'SocialListeningError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class SocialListeningClient {
  private apiKey: string
  private projectId: string
  private baseUrl = 'https://api.brand24.com/v3'

  constructor(config: SocialListeningConfig) {
    this.apiKey = config.apiKey
    this.projectId = config.projectId
  }

  /**
   * Make a request to the Brand24 API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new SocialListeningError(errorMessage, 'API_ERROR', response.status)
    }

    return response.json() as Promise<T>
  }

  /**
   * Get mentions for the project
   */
  async getMentions(options?: {
    page?: number
    perPage?: number
    sentiment?: MentionSentiment
    source?: SourceType
    dateFrom?: Date
    dateTo?: Date
    keyword?: string
  }): Promise<Brand24MentionsResponse> {
    const params = new URLSearchParams({
      project_id: this.projectId,
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 50),
    })

    if (options?.sentiment) {
      params.set('sentiment', options.sentiment)
    }
    if (options?.source) {
      params.set('source', options.source)
    }
    if (options?.dateFrom) {
      params.set('date_from', options.dateFrom.toISOString().split('T')[0]!)
    }
    if (options?.dateTo) {
      params.set('date_to', options.dateTo.toISOString().split('T')[0]!)
    }
    if (options?.keyword) {
      params.set('keyword', options.keyword)
    }

    return this.request<Brand24MentionsResponse>(`/mentions?${params.toString()}`)
  }

  /**
   * Get a single mention by ID
   */
  async getMention(mentionId: string): Promise<Brand24Mention> {
    return this.request<Brand24Mention>(`/mentions/${mentionId}`)
  }

  /**
   * Get project summary/statistics
   */
  async getProjectSummary(options?: {
    dateFrom?: Date
    dateTo?: Date
  }): Promise<Brand24ProjectSummary> {
    const params = new URLSearchParams({
      project_id: this.projectId,
    })

    if (options?.dateFrom) {
      params.set('date_from', options.dateFrom.toISOString().split('T')[0]!)
    }
    if (options?.dateTo) {
      params.set('date_to', options.dateTo.toISOString().split('T')[0]!)
    }

    return this.request<Brand24ProjectSummary>(
      `/projects/${this.projectId}/summary?${params.toString()}`
    )
  }

  /**
   * Get influencer mentions
   */
  async getInfluencerMentions(options?: {
    page?: number
    perPage?: number
    dateFrom?: Date
    dateTo?: Date
  }): Promise<Brand24MentionsResponse> {
    const params = new URLSearchParams({
      project_id: this.projectId,
      influencer: 'true',
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 20),
    })

    if (options?.dateFrom) {
      params.set('date_from', options.dateFrom.toISOString().split('T')[0]!)
    }
    if (options?.dateTo) {
      params.set('date_to', options.dateTo.toISOString().split('T')[0]!)
    }

    return this.request<Brand24MentionsResponse>(`/mentions?${params.toString()}`)
  }

  /**
   * Get negative mentions requiring attention
   */
  async getNegativeMentions(options?: {
    page?: number
    perPage?: number
  }): Promise<Brand24MentionsResponse> {
    return this.getMentions({
      ...options,
      sentiment: 'negative',
    })
  }

  /**
   * Convert Brand24 mention to internal format
   */
  toTrackedMention(mention: Brand24Mention): TrackedMention {
    return {
      id: '', // Will be set by database
      externalId: mention.id,
      platform: mention.source,
      sourceName: mention.sourceTitle,
      sourceUrl: mention.url,
      mentionText: mention.description,
      mentionUrl: mention.url,
      authorName: mention.authorName,
      authorHandle: mention.authorUrl?.split('/').pop(),
      authorFollowers: mention.authorFollowers,
      mentionedAt: new Date(mention.date),
      sentiment: mention.sentiment,
      reach: mention.reach,
      engagement: mention.engagement,
      keywords: mention.keywords,
      isInfluencer: mention.isInfluencer,
      requiresResponse: shouldRequireResponse(mention),
      responded: false,
    }
  }

  /**
   * Validate API credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getMentions({ perPage: 1 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get project ID
   */
  get project(): string {
    return this.projectId
  }
}

/**
 * Create a SocialListeningClient from environment variables
 */
export function createSocialListeningClientFromEnv(): SocialListeningClient | null {
  const apiKey = process.env.BRAND24_API_KEY
  const projectId = process.env.BRAND24_PROJECT_ID

  if (!apiKey || !projectId) {
    console.warn('Social Listening: BRAND24_API_KEY or BRAND24_PROJECT_ID not configured')
    return null
  }

  return new SocialListeningClient({
    apiKey,
    projectId,
  })
}
