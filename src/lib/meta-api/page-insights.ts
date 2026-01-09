/**
 * Facebook Page Insights
 *
 * Fetch page-level metrics from the Meta Graph API.
 *
 * Note: API deprecations coming Nov 2025:
 * - page_impressions -> page_views
 * - page_fans -> page_follows
 */

import type { MetaApiClient } from './client'
import type { DateRange, MetaPage, PageInsightMetric, MetaPost, PostInsight } from './types'

// ===========================================
// Page Info
// ===========================================

export interface PageInfo {
  id: string
  name: string
  username?: string
  profilePictureUrl?: string
  category?: string
  followersCount?: number
  fanCount?: number
  instagramAccountId?: string
}

/**
 * Get basic page information
 */
export async function getPageInfo(client: MetaApiClient, pageId?: string): Promise<PageInfo> {
  const id = pageId ?? client.pageId
  if (!id) {
    throw new Error('Page ID is required')
  }

  const response = await client.get<MetaPage>(`/${id}`, {
    fields:
      'id,name,username,picture,category,followers_count,fan_count,instagram_business_account',
  })

  return {
    id: response.data.id,
    name: response.data.name,
    username: response.data.username,
    profilePictureUrl: response.data.picture?.data.url,
    category: response.data.category,
    followersCount: response.data.followers_count,
    fanCount: response.data.fan_count,
    instagramAccountId: response.data.instagram_business_account?.id,
  }
}

// ===========================================
// Page Insights
// ===========================================

/**
 * Page insight metrics available from the API
 *
 * Engagement metrics:
 * - page_post_engagements: Total engagement (reactions, comments, shares, clicks)
 * - page_consumptions: Clicks on content
 *
 * Reach metrics:
 * - page_impressions: Total impressions (deprecated Nov 2025 -> page_views)
 * - page_impressions_unique: Unique reach
 *
 * Follower metrics:
 * - page_fans: Total followers (deprecated Nov 2025 -> page_follows)
 * - page_fan_adds: New followers
 * - page_fan_removes: Unfollows
 *
 * Reaction metrics:
 * - page_actions_post_reactions_like_total
 * - page_actions_post_reactions_love_total
 * - page_actions_post_reactions_wow_total
 * - page_actions_post_reactions_haha_total
 * - page_actions_post_reactions_sorry_total
 * - page_actions_post_reactions_anger_total
 *
 * Video metrics:
 * - page_video_views: Total video views
 * - page_video_view_time: Total watch time
 */

export type PageMetric =
  | 'page_post_engagements'
  | 'page_consumptions'
  | 'page_impressions'
  | 'page_impressions_unique'
  | 'page_fans'
  | 'page_fan_adds'
  | 'page_fan_removes'
  | 'page_actions_post_reactions_like_total'
  | 'page_actions_post_reactions_love_total'
  | 'page_actions_post_reactions_wow_total'
  | 'page_actions_post_reactions_haha_total'
  | 'page_actions_post_reactions_sorry_total'
  | 'page_actions_post_reactions_anger_total'
  | 'page_video_views'
  | 'page_video_view_time'
  | 'page_views_total' // New metric (Nov 2025)
  | 'page_follows' // New metric (Nov 2025)

/**
 * Default metrics for daily page insights
 * Note: Many metrics were deprecated Nov 2025. Using only known working metrics.
 * See: https://github.com/facebook/facebook-python-business-sdk/issues/656
 *
 * Working metrics as of v21:
 * - page_post_engagements (total engagement)
 * - page_impressions_unique (unique reach)
 * - page_video_views (video views)
 * - page_views_total (page views - replacement for impressions)
 * - page_follows (total followers - NEW replacement for page_fans)
 */
export const DEFAULT_PAGE_METRICS: PageMetric[] = [
  'page_post_engagements',
  'page_impressions_unique', // Still works as of v21
  'page_video_views',
  'page_views_total', // New metric (Nov 2025 replacement)
  'page_follows', // New metric (Nov 2025 replacement for page_fans)
]

export interface PageInsightsOptions {
  pageId?: string
  metrics?: PageMetric[]
  dateRange?: DateRange
  period?: 'day' | 'week' | 'days_28'
}

/**
 * Get page insights for a date range
 */
export async function getPageInsights(
  client: MetaApiClient,
  options: PageInsightsOptions = {}
): Promise<PageInsightMetric[]> {
  const pageId = options.pageId ?? client.pageId
  if (!pageId) {
    throw new Error('Page ID is required')
  }

  const metrics = options.metrics ?? DEFAULT_PAGE_METRICS
  const period = options.period ?? 'day'

  const params: Record<string, string | number | boolean> = {
    metric: metrics.join(','),
    period,
  }

  // Add date range if provided
  if (options.dateRange) {
    params.since = formatDateForApi(options.dateRange.since)
    params.until = formatDateForApi(options.dateRange.until)
  }

  const response = await client.get<{ data: PageInsightMetric[] }>(`/${pageId}/insights`, params)

  return response.data.data
}

/**
 * Get daily page insights for the last N days
 */
export async function getPageInsightsForDays(
  client: MetaApiClient,
  days: number,
  options: Omit<PageInsightsOptions, 'dateRange'> = {}
): Promise<PageInsightMetric[]> {
  const until = new Date()
  const since = new Date()
  since.setDate(since.getDate() - days)

  return getPageInsights(client, {
    ...options,
    dateRange: { since, until },
    period: 'day',
  })
}

// ===========================================
// Page Posts
// ===========================================

export interface PagePostsOptions {
  pageId?: string
  limit?: number
  dateRange?: DateRange
}

/**
 * Get published posts from a page
 */
export async function getPagePosts(
  client: MetaApiClient,
  options: PagePostsOptions = {}
): Promise<MetaPost[]> {
  const pageId = options.pageId ?? client.pageId
  if (!pageId) {
    throw new Error('Page ID is required')
  }

  const params: Record<string, string | number | boolean> = {
    fields: 'id,message,story,created_time,permalink_url,full_picture,type,shares,attachments',
    limit: options.limit ?? 25,
  }

  if (options.dateRange) {
    params.since = formatDateForApi(options.dateRange.since)
    params.until = formatDateForApi(options.dateRange.until)
  }

  return client.getAllPages<MetaPost>(`/${pageId}/posts`, params)
}

// ===========================================
// Post Insights
// ===========================================

/**
 * Post insight metrics
 */
export type PostMetric =
  | 'post_impressions'
  | 'post_impressions_unique'
  | 'post_engaged_users'
  | 'post_clicks'
  | 'post_reactions_like_total'
  | 'post_reactions_love_total'
  | 'post_reactions_wow_total'
  | 'post_reactions_haha_total'
  | 'post_reactions_sorry_total'
  | 'post_reactions_anger_total'

export const DEFAULT_POST_METRICS: PostMetric[] = [
  'post_impressions',
  'post_impressions_unique',
  'post_engaged_users',
  'post_clicks',
  'post_reactions_like_total',
  'post_reactions_love_total',
]

export interface PostInsightsOptions {
  metrics?: PostMetric[]
}

/**
 * Get insights for a specific post
 */
export async function getPostInsights(
  client: MetaApiClient,
  postId: string,
  options: PostInsightsOptions = {}
): Promise<PostInsight[]> {
  const metrics = options.metrics ?? DEFAULT_POST_METRICS

  const response = await client.get<{ data: PostInsight[] }>(`/${postId}/insights`, {
    metric: metrics.join(','),
  })

  return response.data.data
}

/**
 * Get insights for multiple posts in batch
 */
export async function getBatchPostInsights(
  client: MetaApiClient,
  postIds: string[],
  options: PostInsightsOptions = {}
): Promise<Map<string, PostInsight[]>> {
  const results = new Map<string, PostInsight[]>()

  // Process in batches of 50 (API limit)
  const batchSize = 50

  for (let i = 0; i < postIds.length; i += batchSize) {
    const batch = postIds.slice(i, i + batchSize)

    // Fetch in parallel
    const promises = batch.map((postId) =>
      getPostInsights(client, postId, options)
        .then((insights) => ({ postId, insights }))
        .catch(() => ({ postId, insights: [] as PostInsight[] }))
    )

    const batchResults = await Promise.all(promises)

    for (const { postId, insights } of batchResults) {
      results.set(postId, insights)
    }
  }

  return results
}

// ===========================================
// Audience Demographics
// ===========================================

export interface PageAudienceOptions {
  pageId?: string
}

/**
 * Get page audience demographics
 */
export async function getPageAudienceDemographics(
  client: MetaApiClient,
  options: PageAudienceOptions = {}
): Promise<{
  ageGender: Record<string, number>
  country: Record<string, number>
  city: Record<string, number>
  locale: Record<string, number>
}> {
  const pageId = options.pageId ?? client.pageId
  if (!pageId) {
    throw new Error('Page ID is required')
  }

  const metrics = [
    'page_fans_gender_age',
    'page_fans_country',
    'page_fans_city',
    'page_fans_locale',
  ].join(',')

  const response = await client.get<{ data: PageInsightMetric[] }>(`/${pageId}/insights`, {
    metric: metrics,
    period: 'lifetime',
  })

  const result = {
    ageGender: {} as Record<string, number>,
    country: {} as Record<string, number>,
    city: {} as Record<string, number>,
    locale: {} as Record<string, number>,
  }

  for (const metric of response.data.data) {
    const value = metric.values[0]?.value
    if (typeof value === 'object' && value !== null) {
      switch (metric.name) {
        case 'page_fans_gender_age':
          result.ageGender = value as Record<string, number>
          break
        case 'page_fans_country':
          result.country = value as Record<string, number>
          break
        case 'page_fans_city':
          result.city = value as Record<string, number>
          break
        case 'page_fans_locale':
          result.locale = value as Record<string, number>
          break
      }
    }
  }

  return result
}

// ===========================================
// Helpers
// ===========================================

/**
 * Format date for Meta API (Unix timestamp or YYYY-MM-DD)
 */
function formatDateForApi(date: Date | string): string {
  if (typeof date === 'string') {
    return date
  }
  return Math.floor(date.getTime() / 1000).toString()
}

/**
 * Parse insights response into a simple key-value map
 */
export function parseInsightsToMap(
  insights: PageInsightMetric[]
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()

  for (const metric of insights) {
    const metricValues = new Map<string, number>()

    for (const value of metric.values) {
      const date = value.end_time.split('T')[0] ?? value.end_time // Get just the date part
      metricValues.set(date, value.value)
    }

    result.set(metric.name, metricValues)
  }

  return result
}
