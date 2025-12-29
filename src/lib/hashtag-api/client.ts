/**
 * RiteTag Hashtag Analytics API Client
 * @see https://ritetag.com/api-documentation
 */

import type {
  HashtagApiConfig,
  RiteTagStatsResponse,
  RiteTagSuggestionsResponse,
  RiteTagBannedResponse,
  RiteTagHashtagStats,
  RiteTagSuggestion,
  RiteTagColor,
} from './types'

export class HashtagApiError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'HashtagApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class HashtagApiClient {
  private apiKey: string
  private baseUrl = 'https://api.ritetag.com/v2'

  constructor(config: HashtagApiConfig) {
    this.apiKey = config.apiKey
  }

  /**
   * Make a request to the RiteTag API
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${url}${separator}client_id=${this.apiKey}`

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new HashtagApiError(errorMessage, 'API_ERROR', response.status)
    }

    return response.json() as Promise<T>
  }

  /**
   * Get stats for specific hashtags
   * @param hashtags - Array of hashtags (with or without #)
   */
  async getHashtagStats(hashtags: string[]): Promise<RiteTagHashtagStats[]> {
    // Clean and join hashtags
    const tags = hashtags.map((h) => h.replace(/^#/, '').toLowerCase()).join(',')

    const response = await this.request<RiteTagStatsResponse>(
      `/hashtag-stats?hashtag=${encodeURIComponent(tags)}`
    )

    if (!response.result) {
      return []
    }

    return response.stats
  }

  /**
   * Get hashtag suggestions based on text
   * @param text - Text to analyze for hashtag suggestions
   */
  async getSuggestionsForText(text: string): Promise<RiteTagSuggestion[]> {
    const response = await this.request<RiteTagSuggestionsResponse>(
      `/hashtag-suggestions?text=${encodeURIComponent(text)}`
    )

    if (!response.result) {
      return []
    }

    return response.hashtags
  }

  /**
   * Get hashtag suggestions based on image
   * @param imageUrl - URL of image to analyze
   */
  async getSuggestionsForImage(imageUrl: string): Promise<RiteTagSuggestion[]> {
    const response = await this.request<RiteTagSuggestionsResponse>(
      `/hashtag-suggestions?image=${encodeURIComponent(imageUrl)}`
    )

    if (!response.result) {
      return []
    }

    return response.hashtags
  }

  /**
   * Check if a hashtag is banned on Instagram
   * @param hashtag - Hashtag to check (with or without #)
   */
  async isHashtagBanned(hashtag: string): Promise<boolean> {
    const tag = hashtag.replace(/^#/, '').toLowerCase()

    try {
      const response = await this.request<RiteTagBannedResponse>(
        `/instagram-banned?hashtag=${encodeURIComponent(tag)}`
      )
      return response.banned
    } catch {
      // If API fails, assume not banned
      return false
    }
  }

  /**
   * Get trending hashtags for a topic/category
   * @param topic - Topic to get trending hashtags for
   */
  async getTrendingHashtags(topic: string): Promise<RiteTagSuggestion[]> {
    // Use text suggestions with the topic
    return this.getSuggestionsForText(topic)
  }

  /**
   * Analyze multiple hashtags and return sorted by quality
   * @param hashtags - Array of hashtags to analyze
   */
  async analyzeHashtags(
    hashtags: string[]
  ): Promise<Array<RiteTagHashtagStats & { recommendation: string }>> {
    const stats = await this.getHashtagStats(hashtags)

    return stats
      .map((stat) => ({
        ...stat,
        recommendation: this.getRecommendation(stat.color, stat.exposure),
      }))
      .sort((a, b) => {
        // Sort by color priority, then by exposure
        const colorPriority: Record<RiteTagColor, number> = {
          green: 4,
          blue: 3,
          grey: 2,
          red: 1,
        }
        const colorDiff = (colorPriority[b.color] || 0) - (colorPriority[a.color] || 0)
        if (colorDiff !== 0) return colorDiff
        return b.exposure - a.exposure
      })
  }

  /**
   * Get recommendation text based on color
   */
  private getRecommendation(color: RiteTagColor, exposure: number): string {
    switch (color) {
      case 'green':
        return `Hot now! Use immediately (${exposure.toLocaleString()} exposure/hr)`
      case 'blue':
        return `Good for reach (${exposure.toLocaleString()} exposure/hr)`
      case 'red':
        return 'Overused - consider alternatives'
      case 'grey':
      default:
        return 'Limited data available'
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getHashtagStats(['test'])
      return true
    } catch {
      return false
    }
  }
}

/**
 * Create a HashtagApiClient from environment variables
 */
export function createHashtagClientFromEnv(): HashtagApiClient | null {
  const apiKey = process.env.RITETAG_API_KEY

  if (!apiKey) {
    console.warn('Hashtag API: RITETAG_API_KEY not configured')
    return null
  }

  return new HashtagApiClient({ apiKey })
}
