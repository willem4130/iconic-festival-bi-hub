/**
 * RiteTag Hashtag Analytics API Types
 * @see https://ritetag.com/api-documentation
 */

export interface HashtagApiConfig {
  apiKey: string
}

// RiteTag hashtag stats response
export interface RiteTagHashtagStats {
  tag: string
  tweets: number // Posts per hour
  retweets: number // Shares per hour
  exposure: number // Estimated exposure per hour
  images: number // Posts with images
  links: number // Posts with links
  mentions: number // Mentions per hour
  color: RiteTagColor // Trending status
}

// RiteTag color coding
export type RiteTagColor = 'green' | 'blue' | 'red' | 'grey'

// Color meanings
export const RITETAG_COLOR_MEANINGS: Record<RiteTagColor, string> = {
  green: 'Hot right now - use immediately for maximum exposure',
  blue: 'Good for long-term visibility and reach',
  red: 'Overused - avoid, limited visibility',
  grey: 'Unknown or insufficient data',
}

// RiteTag hashtag suggestions response
export interface RiteTagSuggestion {
  tag: string
  tweets: number
  retweets: number
  exposure: number
  images: number
  links: number
  mentions: number
  color: RiteTagColor
}

// RiteTag API response for stats
export interface RiteTagStatsResponse {
  result: boolean
  stats: RiteTagHashtagStats[]
}

// RiteTag API response for suggestions
export interface RiteTagSuggestionsResponse {
  result: boolean
  hashtags: RiteTagSuggestion[]
}

// RiteTag banned hashtag check
export interface RiteTagBannedResponse {
  result: boolean
  banned: boolean
  tag: string
}

// Internal hashtag representation
export interface TrackedHashtag {
  id: string
  hashtag: string // With #
  hashtagClean: string // Without #
  exposure: number | null
  retweets: number | null
  images: number | null
  links: number | null
  mentions: number | null
  color: RiteTagColor | null
  timesUsed: number
  lastUsedAt: Date | null
  avgEngagementRate: number | null
  avgReach: number | null
}

// Hashtag performance analysis
export interface HashtagPerformance {
  hashtag: string
  timesUsed: number
  totalReach: number
  totalEngagement: number
  avgEngagementRate: number
  color: RiteTagColor | null
  recommendation: 'keep' | 'test' | 'avoid'
}

// Hashtag recommendation request
export interface HashtagRecommendationRequest {
  text?: string // Caption text to analyze
  image?: string // Image URL for visual analysis
  existingHashtags?: string[] // Already selected hashtags
  platform?: 'instagram' | 'facebook' | 'twitter'
  maxSuggestions?: number
}

// Hashtag recommendation response
export interface HashtagRecommendation {
  hashtag: string
  score: number // 0-100 relevance score
  color: RiteTagColor
  reason: string // Why this hashtag is recommended
  exposure: number
  category: 'trending' | 'niche' | 'branded' | 'location'
}

/**
 * Normalize hashtag (lowercase, with #)
 */
export function normalizeHashtag(tag: string): string {
  const cleaned = tag.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `#${cleaned}`
}

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const regex = /#[a-zA-Z0-9_]+/g
  const matches = text.match(regex) || []
  return matches.map((tag) => tag.toLowerCase())
}

/**
 * Get color priority for sorting (green > blue > grey > red)
 */
export function getColorPriority(color: RiteTagColor | null): number {
  switch (color) {
    case 'green':
      return 4
    case 'blue':
      return 3
    case 'grey':
      return 2
    case 'red':
      return 1
    default:
      return 0
  }
}

/**
 * Get recommendation based on color and usage
 */
export function getHashtagRecommendation(
  color: RiteTagColor | null,
  engagementRate: number | null
): 'keep' | 'test' | 'avoid' {
  if (color === 'red') return 'avoid'
  if (color === 'green' || (engagementRate && engagementRate > 3)) return 'keep'
  return 'test'
}
