/**
 * Instagram Insights
 *
 * Fetch Instagram Business/Creator account metrics.
 *
 * Note: video_views deprecated for non-Reels (Jan 2025)
 * Use 'plays' for Reels instead.
 */

import type { MetaApiClient } from './client'
import type {
  DateRange,
  InstagramAccount,
  InstagramMedia,
  InstagramInsightMetric,
  InstagramMediaInsight,
  InstagramStory,
} from './types'

// ===========================================
// Account Info
// ===========================================

export interface InstagramAccountInfo {
  id: string
  username: string
  name?: string
  profilePictureUrl?: string
  followersCount?: number
  followsCount?: number
  mediaCount?: number
  biography?: string
  website?: string
}

/**
 * Get Instagram account information
 */
export async function getInstagramAccountInfo(
  client: MetaApiClient,
  accountId?: string
): Promise<InstagramAccountInfo> {
  const id = accountId ?? client.instagramAccountId
  if (!id) {
    throw new Error('Instagram Account ID is required')
  }

  const response = await client.get<InstagramAccount>(`/${id}`, {
    fields:
      'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
  })

  return {
    id: response.data.id,
    username: response.data.username,
    name: response.data.name,
    profilePictureUrl: response.data.profile_picture_url,
    followersCount: response.data.followers_count,
    followsCount: response.data.follows_count,
    mediaCount: response.data.media_count,
    biography: response.data.biography,
    website: response.data.website,
  }
}

// ===========================================
// Account Insights
// ===========================================

/**
 * Instagram account metrics
 *
 * Daily metrics:
 * - impressions
 * - reach
 * - profile_views
 * - follower_count
 * - email_contacts
 * - phone_call_clicks
 * - text_message_clicks
 * - get_directions_clicks
 * - website_clicks
 *
 * Lifetime metrics:
 * - audience_city
 * - audience_country
 * - audience_gender_age
 * - audience_locale
 */

export type InstagramAccountMetric =
  | 'impressions'
  | 'reach'
  | 'profile_views'
  | 'follower_count'
  | 'email_contacts'
  | 'phone_call_clicks'
  | 'text_message_clicks'
  | 'get_directions_clicks'
  | 'website_clicks'

export const DEFAULT_INSTAGRAM_ACCOUNT_METRICS: InstagramAccountMetric[] = [
  'reach',
  'profile_views',
  'follower_count',
  'website_clicks',
]

export interface InstagramInsightsOptions {
  accountId?: string
  metrics?: InstagramAccountMetric[]
  dateRange?: DateRange
  period?: 'day' | 'week' | 'days_28' | 'lifetime'
}

/**
 * Get Instagram account insights
 */
export async function getInstagramInsights(
  client: MetaApiClient,
  options: InstagramInsightsOptions = {}
): Promise<InstagramInsightMetric[]> {
  const accountId = options.accountId ?? client.instagramAccountId
  if (!accountId) {
    throw new Error('Instagram Account ID is required')
  }

  const metrics = options.metrics ?? DEFAULT_INSTAGRAM_ACCOUNT_METRICS
  const period = options.period ?? 'day'

  const params: Record<string, string | number | boolean> = {
    metric: metrics.join(','),
    period,
  }

  if (options.dateRange) {
    params.since = formatDateForApi(options.dateRange.since)
    params.until = formatDateForApi(options.dateRange.until)
  }

  const response = await client.get<{ data: InstagramInsightMetric[] }>(
    `/${accountId}/insights`,
    params
  )

  return response.data.data
}

/**
 * Get Instagram insights for the last N days
 */
export async function getInstagramInsightsForDays(
  client: MetaApiClient,
  days: number,
  options: Omit<InstagramInsightsOptions, 'dateRange'> = {}
): Promise<InstagramInsightMetric[]> {
  const until = new Date()
  const since = new Date()
  since.setDate(since.getDate() - days)

  return getInstagramInsights(client, {
    ...options,
    dateRange: { since, until },
    period: 'day',
  })
}

// ===========================================
// Media (Posts, Reels, Carousels)
// ===========================================

export interface InstagramMediaOptions {
  accountId?: string
  limit?: number
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
}

/**
 * Get Instagram media (posts, reels, carousels)
 */
export async function getInstagramMedia(
  client: MetaApiClient,
  options: InstagramMediaOptions = {}
): Promise<InstagramMedia[]> {
  const accountId = options.accountId ?? client.instagramAccountId
  if (!accountId) {
    throw new Error('Instagram Account ID is required')
  }

  const params: Record<string, string | number | boolean> = {
    fields:
      'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,like_count,comments_count,children{id,media_type,media_url}',
    limit: options.limit ?? 25,
  }

  const media = await client.getAllPages<InstagramMedia>(`/${accountId}/media`, params)

  // Filter by media type if specified
  if (options.mediaType) {
    return media.filter((m) => m.media_type === options.mediaType)
  }

  return media
}

/**
 * Get only Reels from Instagram
 */
export async function getInstagramReels(
  client: MetaApiClient,
  options: Omit<InstagramMediaOptions, 'mediaType'> = {}
): Promise<InstagramMedia[]> {
  return getInstagramMedia(client, { ...options, mediaType: 'VIDEO' }).then(
    (media) =>
      // Filter to only reels (short-form video)
      // Note: API doesn't distinguish reels vs regular videos directly
      // You may need additional filtering based on aspect ratio or duration
      media
  )
}

// ===========================================
// Media Insights
// ===========================================

/**
 * Instagram media metrics
 *
 * For IMAGE and CAROUSEL_ALBUM:
 * - impressions, reach, engagement, saved
 *
 * For VIDEO (including Reels):
 * - impressions, reach, plays, saved
 * - video_views is DEPRECATED for non-Reels (Jan 2025)
 *
 * For Reels specifically:
 * - plays, reach, saved, shares, comments, likes
 */

export type InstagramMediaMetric =
  | 'impressions'
  | 'reach'
  | 'engagement'
  | 'saved'
  | 'plays' // For Reels
  | 'video_views' // Deprecated for non-Reels

export const IMAGE_CAROUSEL_METRICS: InstagramMediaMetric[] = [
  'impressions',
  'reach',
  'engagement',
  'saved',
]

export const VIDEO_REEL_METRICS: InstagramMediaMetric[] = ['impressions', 'reach', 'plays', 'saved']

/**
 * Get insights for a specific Instagram media item
 */
export async function getInstagramMediaInsights(
  client: MetaApiClient,
  mediaId: string,
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' = 'IMAGE'
): Promise<InstagramMediaInsight[]> {
  // Select appropriate metrics based on media type
  const metrics =
    mediaType === 'VIDEO'
      ? VIDEO_REEL_METRICS
      : mediaType === 'CAROUSEL_ALBUM'
        ? IMAGE_CAROUSEL_METRICS
        : IMAGE_CAROUSEL_METRICS

  const response = await client.get<{ data: InstagramMediaInsight[] }>(`/${mediaId}/insights`, {
    metric: metrics.join(','),
  })

  return response.data.data
}

/**
 * Get insights for multiple media items
 */
export async function getBatchInstagramMediaInsights(
  client: MetaApiClient,
  mediaItems: Array<{ id: string; mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' }>
): Promise<Map<string, InstagramMediaInsight[]>> {
  const results = new Map<string, InstagramMediaInsight[]>()

  // Process in batches of 50
  const batchSize = 50

  for (let i = 0; i < mediaItems.length; i += batchSize) {
    const batch = mediaItems.slice(i, i + batchSize)

    const promises = batch.map((item) =>
      getInstagramMediaInsights(client, item.id, item.mediaType)
        .then((insights) => ({ id: item.id, insights }))
        .catch(() => ({ id: item.id, insights: [] as InstagramMediaInsight[] }))
    )

    const batchResults = await Promise.all(promises)

    for (const { id, insights } of batchResults) {
      results.set(id, insights)
    }
  }

  return results
}

// ===========================================
// Stories
// ===========================================

export interface InstagramStoriesOptions {
  accountId?: string
}

/**
 * Get Instagram stories (last 24 hours only)
 * Note: Stories are only available via API for 24 hours after posting
 */
export async function getInstagramStories(
  client: MetaApiClient,
  options: InstagramStoriesOptions = {}
): Promise<InstagramStory[]> {
  const accountId = options.accountId ?? client.instagramAccountId
  if (!accountId) {
    throw new Error('Instagram Account ID is required')
  }

  const response = await client.get<{ data: InstagramStory[] }>(`/${accountId}/stories`, {
    fields: 'id,media_type,media_url,timestamp,permalink',
  })

  return response.data.data
}

/**
 * Story insight metrics
 */
export type StoryMetric =
  | 'impressions'
  | 'reach'
  | 'replies'
  | 'exits'
  | 'taps_forward'
  | 'taps_back'

export const DEFAULT_STORY_METRICS: StoryMetric[] = [
  'impressions',
  'reach',
  'replies',
  'exits',
  'taps_forward',
  'taps_back',
]

/**
 * Get insights for a specific story
 */
export async function getInstagramStoryInsights(
  client: MetaApiClient,
  storyId: string,
  metrics: StoryMetric[] = DEFAULT_STORY_METRICS
): Promise<InstagramMediaInsight[]> {
  const response = await client.get<{ data: InstagramMediaInsight[] }>(`/${storyId}/insights`, {
    metric: metrics.join(','),
  })

  return response.data.data
}

// ===========================================
// Audience Demographics
// ===========================================

export interface InstagramAudienceOptions {
  accountId?: string
}

/**
 * Get Instagram audience demographics
 */
export async function getInstagramAudienceDemographics(
  client: MetaApiClient,
  options: InstagramAudienceOptions = {}
): Promise<{
  ageGender: Record<string, number>
  country: Record<string, number>
  city: Record<string, number>
}> {
  const accountId = options.accountId ?? client.instagramAccountId
  if (!accountId) {
    throw new Error('Instagram Account ID is required')
  }

  const metrics = ['audience_gender_age', 'audience_country', 'audience_city'].join(',')

  const response = await client.get<{ data: InstagramInsightMetric[] }>(`/${accountId}/insights`, {
    metric: metrics,
    period: 'lifetime',
  })

  const result = {
    ageGender: {} as Record<string, number>,
    country: {} as Record<string, number>,
    city: {} as Record<string, number>,
  }

  for (const metric of response.data.data) {
    const value = metric.values[0]?.value
    if (typeof value === 'object' && value !== null) {
      switch (metric.name) {
        case 'audience_gender_age':
          result.ageGender = value as Record<string, number>
          break
        case 'audience_country':
          result.country = value as Record<string, number>
          break
        case 'audience_city':
          result.city = value as Record<string, number>
          break
      }
    }
  }

  return result
}

// ===========================================
// Hashtag Search (Public data)
// ===========================================

export interface HashtagSearchOptions {
  accountId?: string
  limit?: number
}

/**
 * Search for a hashtag ID
 */
export async function searchHashtag(
  client: MetaApiClient,
  hashtag: string,
  options: HashtagSearchOptions = {}
): Promise<string | null> {
  const accountId = options.accountId ?? client.instagramAccountId
  if (!accountId) {
    throw new Error('Instagram Account ID is required')
  }

  try {
    const response = await client.get<{ data: Array<{ id: string }> }>('/ig_hashtag_search', {
      user_id: accountId,
      q: hashtag.replace('#', ''),
    })

    return response.data.data[0]?.id ?? null
  } catch {
    return null
  }
}

/**
 * Get recent media for a hashtag
 * Note: Limited to 30 unique hashtags per 7 days per account
 */
export async function getHashtagRecentMedia(
  client: MetaApiClient,
  hashtagId: string,
  options: HashtagSearchOptions = {}
): Promise<InstagramMedia[]> {
  const accountId = options.accountId ?? client.instagramAccountId
  if (!accountId) {
    throw new Error('Instagram Account ID is required')
  }

  const response = await client.get<{ data: InstagramMedia[] }>(`/${hashtagId}/recent_media`, {
    user_id: accountId,
    fields: 'id,caption,media_type,permalink,timestamp,like_count,comments_count',
    limit: options.limit ?? 25,
  })

  return response.data.data
}

// ===========================================
// Helpers
// ===========================================

/**
 * Format date for Meta API
 */
function formatDateForApi(date: Date | string): string {
  if (typeof date === 'string') {
    return date
  }
  return Math.floor(date.getTime() / 1000).toString()
}

/**
 * Parse Instagram insights to a simple map
 */
export function parseInstagramInsightsToMap(
  insights: InstagramInsightMetric[]
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()

  for (const metric of insights) {
    const metricValues = new Map<string, number>()

    for (const value of metric.values) {
      if (value.end_time && typeof value.value === 'number') {
        const date = value.end_time.split('T')[0] ?? value.end_time
        metricValues.set(date, value.value)
      }
    }

    result.set(metric.name, metricValues)
  }

  return result
}

/**
 * Calculate engagement rate for Instagram media
 */
export function calculateEngagementRate(
  likes: number,
  comments: number,
  saves: number,
  reach: number
): number {
  if (reach === 0) return 0
  return ((likes + comments + saves) / reach) * 100
}
