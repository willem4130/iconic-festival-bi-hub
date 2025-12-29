/**
 * Brand24 Social Listening API Types
 * @see https://developers.brand24.com/
 */

export interface SocialListeningConfig {
  apiKey: string
  projectId: string
}

// Brand24 mention sentiment
export type MentionSentiment = 'positive' | 'negative' | 'neutral'

// Brand24 source types
export type SourceType =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'reddit'
  | 'news'
  | 'blog'
  | 'forum'
  | 'web'
  | 'tiktok'
  | 'podcast'
  | 'review'

// Brand24 mention from API
export interface Brand24Mention {
  id: string
  url: string
  domain: string
  title?: string
  description: string
  date: string // ISO 8601
  source: SourceType
  sourceTitle?: string
  authorName?: string
  authorUrl?: string
  authorAvatar?: string
  authorFollowers?: number
  sentiment: MentionSentiment
  sentimentManual?: MentionSentiment
  reach?: number
  engagement?: number
  likes?: number
  shares?: number
  comments?: number
  isInfluencer: boolean
  influencerScore?: number
  language?: string
  country?: string
  keywords: string[]
  imageUrl?: string
}

// Brand24 API response
export interface Brand24MentionsResponse {
  data: Brand24Mention[]
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}

// Brand24 project summary
export interface Brand24ProjectSummary {
  mentions: number
  reach: number
  engagement: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  influencerMentions: number
  topSources: Array<{
    source: SourceType
    count: number
  }>
  topAuthors: Array<{
    name: string
    mentions: number
    followers: number
  }>
}

// Internal mention representation
export interface TrackedMention {
  id: string
  externalId: string
  platform: SourceType
  sourceName?: string
  sourceUrl?: string
  mentionText: string
  mentionUrl?: string
  authorName?: string
  authorHandle?: string
  authorFollowers?: number
  mentionedAt: Date
  sentiment: MentionSentiment
  sentimentScore?: number
  reach?: number
  engagement?: number
  keywords: string[]
  isInfluencer: boolean
  requiresResponse: boolean
  responded: boolean
}

// Mention alert
export interface MentionAlert {
  id: string
  mention: TrackedMention
  alertType: 'negative_sentiment' | 'high_reach' | 'influencer' | 'spike'
  priority: 'high' | 'medium' | 'low'
  message: string
  createdAt: Date
}

// Social listening summary
export interface SocialListeningSummary {
  period: {
    from: string
    to: string
  }
  totalMentions: number
  totalReach: number
  totalEngagement: number
  sentimentBreakdown: {
    positive: number
    negative: number
    neutral: number
  }
  sentimentScore: number // -1 to 1
  platformBreakdown: Record<SourceType, number>
  topKeywords: Array<{
    keyword: string
    count: number
  }>
  influencerMentions: number
  alertsCount: number
}

// Filters for mention queries
export interface MentionFilters {
  sentiment?: MentionSentiment
  source?: SourceType
  isInfluencer?: boolean
  requiresResponse?: boolean
  dateFrom?: Date
  dateTo?: Date
  keyword?: string
}

/**
 * Determine if a mention requires response
 */
export function shouldRequireResponse(mention: Brand24Mention): boolean {
  // Negative sentiment with high reach
  if (mention.sentiment === 'negative' && (mention.reach ?? 0) > 1000) {
    return true
  }
  // Influencer negative mention
  if (mention.sentiment === 'negative' && mention.isInfluencer) {
    return true
  }
  // Very high engagement negative
  if (mention.sentiment === 'negative' && (mention.engagement ?? 0) > 100) {
    return true
  }
  return false
}

/**
 * Calculate mention priority
 */
export function calculateMentionPriority(mention: Brand24Mention): 'high' | 'medium' | 'low' {
  const reach = mention.reach ?? 0
  const engagement = mention.engagement ?? 0

  if (mention.isInfluencer && mention.sentiment === 'negative') return 'high'
  if (reach > 10000 && mention.sentiment === 'negative') return 'high'
  if (engagement > 500) return 'high'

  if (reach > 1000 || engagement > 50) return 'medium'

  return 'low'
}

/**
 * Calculate overall sentiment score (-1 to 1)
 */
export function calculateSentimentScore(positive: number, negative: number, total: number): number {
  if (total === 0) return 0
  return (positive - negative) / total
}
