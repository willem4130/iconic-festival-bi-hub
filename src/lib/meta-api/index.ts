/**
 * Meta Graph API Client
 *
 * Unified client for Facebook and Instagram Graph API.
 *
 * Usage:
 * ```typescript
 * import { createMetaClientFromEnv, getPageInsights, getInstagramMedia } from '@/lib/meta-api'
 *
 * const client = createMetaClientFromEnv()
 * if (client) {
 *   const insights = await getPageInsights(client, { days: 30 })
 *   const media = await getInstagramMedia(client)
 * }
 * ```
 *
 * Note: API deprecations coming Nov 2025:
 * - page_impressions -> page_views
 * - page_fans -> page_follows
 * Instagram video_views deprecated for non-Reels (Jan 2025)
 */

// Client
export { MetaApiClient, MetaApiClientError, createMetaClientFromEnv } from './client'

// Types
export type {
  MetaApiConfig,
  MetaApiResponse,
  MetaApiError,
  MetaPaging,
  DateRange,
  // Page types
  MetaPage,
  MetaPost,
  PageInsightMetric,
  PageInsightValue,
  PostInsight,
  PostInsightsResponse,
  // Instagram types
  InstagramAccount,
  InstagramMedia,
  InstagramStory,
  InstagramReel,
  InstagramInsightMetric,
  InstagramInsightValue,
  InstagramMediaInsight,
  // Audience
  AudienceDemographics,
  // Ads
  MetaAdCampaign,
  MetaAdSet,
  MetaAd,
  AdInsight,
  // Webhooks
  MetaWebhookEntry,
  MetaWebhookPayload,
} from './types'

// Page Insights
export {
  getPageInfo,
  getPageInsights,
  getPageInsightsForDays,
  getPagePosts,
  getPostInsights,
  getBatchPostInsights,
  getPageAudienceDemographics,
  parseInsightsToMap,
  DEFAULT_PAGE_METRICS,
  DEFAULT_POST_METRICS,
} from './page-insights'

export type {
  PageInfo,
  PageInsightsOptions,
  PagePostsOptions,
  PostInsightsOptions,
  PageAudienceOptions,
  PageMetric,
  PostMetric,
} from './page-insights'

// Instagram Insights
export {
  getInstagramAccountInfo,
  getInstagramInsights,
  getInstagramInsightsForDays,
  getInstagramMedia,
  getInstagramReels,
  getInstagramMediaInsights,
  getBatchInstagramMediaInsights,
  getInstagramStories,
  getInstagramStoryInsights,
  getInstagramAudienceDemographics,
  searchHashtag,
  getHashtagRecentMedia,
  parseInstagramInsightsToMap,
  calculateEngagementRate,
  DEFAULT_INSTAGRAM_ACCOUNT_METRICS,
  DEFAULT_STORY_METRICS,
  IMAGE_CAROUSEL_METRICS,
  VIDEO_REEL_METRICS,
} from './instagram-insights'

export type {
  InstagramAccountInfo,
  InstagramInsightsOptions,
  InstagramMediaOptions,
  InstagramStoriesOptions,
  InstagramAudienceOptions,
  HashtagSearchOptions,
  InstagramAccountMetric,
  InstagramMediaMetric,
  StoryMetric,
} from './instagram-insights'

// Ads Insights
export {
  getCampaigns,
  getCampaign,
  getAdSets,
  getAdSet,
  getAds,
  getAd,
  getAdAccountInsights,
  getCampaignInsights,
  getAdSetInsights,
  getAdInsights,
  getAdInsightsForDays,
  aggregateAdInsights,
  groupInsightsByDate,
  calculateVideoCompletionRates,
  DEFAULT_AD_INSIGHT_FIELDS,
  VIDEO_AD_INSIGHT_FIELDS,
  CONVERSION_AD_INSIGHT_FIELDS,
} from './ads-insights'

export type {
  CampaignsOptions,
  AdSetsOptions,
  AdsOptions,
  AdInsightsOptions,
  AdInsightField,
  AggregatedAdMetrics,
  VideoCompletionRates,
} from './ads-insights'
