/**
 * Meta Graph API Type Definitions
 *
 * These types match the Meta Graph API v21.0 responses.
 * Note: API deprecations coming Nov 2025:
 * - page_impressions -> page_views
 * - page_fans -> page_follows
 * Instagram video_views deprecated for non-Reels (Jan 2025)
 */

// ===========================================
// API Response Wrapper
// ===========================================

export interface MetaApiResponse<T> {
  data: T
  paging?: MetaPaging
  error?: MetaApiError
}

export interface MetaPaging {
  cursors?: {
    before: string
    after: string
  }
  next?: string
  previous?: string
}

export interface MetaApiError {
  message: string
  type: string
  code: number
  error_subcode?: number
  fbtrace_id?: string
}

// ===========================================
// Page Types
// ===========================================

export interface MetaPage {
  id: string
  name: string
  username?: string
  picture?: {
    data: {
      url: string
      width: number
      height: number
    }
  }
  access_token?: string
  category?: string
  followers_count?: number
  fan_count?: number
  instagram_business_account?: {
    id: string
  }
}

// ===========================================
// Instagram Account Types
// ===========================================

export interface InstagramAccount {
  id: string
  username: string
  name?: string
  profile_picture_url?: string
  followers_count?: number
  follows_count?: number
  media_count?: number
  biography?: string
  website?: string
}

// ===========================================
// Content/Media Types
// ===========================================

export interface MetaPost {
  id: string
  message?: string
  story?: string
  created_time: string
  permalink_url?: string
  full_picture?: string
  type: 'link' | 'status' | 'photo' | 'video' | 'offer'
  shares?: { count: number }
  attachments?: {
    data: Array<{
      type: string
      media_type?: string
      url?: string
      media?: {
        image?: { src: string }
      }
    }>
  }
}

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  username: string
  like_count?: number
  comments_count?: number
  children?: {
    data: Array<{
      id: string
      media_type: string
      media_url: string
    }>
  }
}

export interface InstagramStory {
  id: string
  media_type: 'IMAGE' | 'VIDEO'
  media_url?: string
  timestamp: string
  permalink?: string
}

export interface InstagramReel {
  id: string
  caption?: string
  media_type: 'VIDEO'
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
  play_count?: number
}

// ===========================================
// Insights Types - Page Level
// ===========================================

export interface PageInsightValue {
  value: number
  end_time: string
}

export interface PageInsightMetric {
  name: string
  period: 'day' | 'week' | 'days_28' | 'lifetime'
  values: PageInsightValue[]
  title: string
  description: string
  id: string
}

/**
 * Page insights response structure
 * Available metrics (using new API names where applicable):
 * - page_views (formerly page_impressions)
 * - page_follows (formerly page_fans)
 * - page_post_engagements
 * - page_fan_adds, page_fan_removes
 * - page_actions_post_reactions_*
 */
export interface PageInsightsResponse {
  data: PageInsightMetric[]
  paging?: MetaPaging
}

// ===========================================
// Insights Types - Post Level
// ===========================================

export interface PostInsight {
  name: string
  period: string
  values: Array<{ value: number | Record<string, number> }>
  title: string
  description: string
  id: string
}

export interface PostInsightsResponse {
  data: PostInsight[]
  paging?: MetaPaging
}

// ===========================================
// Insights Types - Instagram
// ===========================================

export interface InstagramInsightValue {
  value: number | Record<string, number>
  end_time?: string
}

export interface InstagramInsightMetric {
  name: string
  period: 'day' | 'week' | 'days_28' | 'lifetime'
  values: InstagramInsightValue[]
  title: string
  description: string
  id: string
}

export interface InstagramInsightsResponse {
  data: InstagramInsightMetric[]
  paging?: MetaPaging
}

/**
 * Instagram media insights
 * Note: video_views is deprecated for non-Reels (Jan 2025)
 * Use 'plays' for Reels instead
 */
export interface InstagramMediaInsight {
  name:
    | 'impressions'
    | 'reach'
    | 'engagement'
    | 'saved'
    | 'video_views' // Deprecated for non-Reels
    | 'plays' // Use for Reels
    | 'likes'
    | 'comments'
    | 'shares'
  period: 'lifetime'
  values: Array<{ value: number }>
  title: string
  description: string
  id: string
}

// ===========================================
// Audience Demographics
// ===========================================

export interface AudienceDemographics {
  age_gender?: Record<string, number> // e.g., "M.18-24": 1500
  country?: Record<string, number> // e.g., "NL": 5000
  city?: Record<string, number> // e.g., "Amsterdam, North Holland": 2500
  locale?: Record<string, number> // e.g., "en_US": 3000
}

// ===========================================
// Ad Types
// ===========================================

export interface MetaAdCampaign {
  id: string
  name: string
  objective: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
  created_time: string
  updated_time: string
}

export interface MetaAdSet {
  id: string
  name: string
  campaign_id: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  daily_budget?: string
  lifetime_budget?: string
  bid_strategy?: string
  bid_amount?: string
  optimization_goal?: string
  targeting?: Record<string, unknown>
  created_time: string
  updated_time: string
}

export interface MetaAd {
  id: string
  name: string
  adset_id: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_REVIEW' | 'DISAPPROVED'
  creative?: {
    id: string
    name?: string
    object_story_spec?: Record<string, unknown>
    call_to_action_type?: string
  }
  created_time: string
  updated_time: string
}

export interface AdInsight {
  campaign_id?: string
  adset_id?: string
  ad_id?: string
  date_start: string
  date_stop: string
  spend: string
  impressions: string
  reach: string
  clicks: string
  actions?: Array<{
    action_type: string
    value: string
  }>
  video_p25_watched_actions?: Array<{ value: string }>
  video_p50_watched_actions?: Array<{ value: string }>
  video_p75_watched_actions?: Array<{ value: string }>
  video_p100_watched_actions?: Array<{ value: string }>
  cost_per_action_type?: Array<{
    action_type: string
    value: string
  }>
  cpm?: string
  cpc?: string
  ctr?: string
}

// ===========================================
// Webhook Types (for real-time updates)
// ===========================================

export interface MetaWebhookEntry {
  id: string
  time: number
  changes: Array<{
    value: Record<string, unknown>
    field: string
  }>
}

export interface MetaWebhookPayload {
  object: 'page' | 'instagram' | 'ad_account'
  entry: MetaWebhookEntry[]
}

// ===========================================
// Client Configuration
// ===========================================

export interface MetaApiConfig {
  appId: string
  appSecret: string
  accessToken: string
  pageId?: string
  instagramAccountId?: string
  adAccountId?: string
  apiVersion?: string
}

// ===========================================
// Date Range for Insights
// ===========================================

export interface DateRange {
  since: Date | string
  until: Date | string
}
