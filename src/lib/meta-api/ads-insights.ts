/**
 * Meta Ads Insights
 *
 * Fetch advertising metrics from the Meta Marketing API.
 */

import type { MetaApiClient } from './client'
import type { AdInsight, DateRange, MetaAdCampaign, MetaAdSet, MetaAd } from './types'

// ===========================================
// Campaigns
// ===========================================

export interface CampaignsOptions {
  adAccountId?: string
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  limit?: number
  dateRange?: DateRange
}

/**
 * Get ad campaigns
 */
export async function getCampaigns(
  client: MetaApiClient,
  options: CampaignsOptions = {}
): Promise<MetaAdCampaign[]> {
  const adAccountId = options.adAccountId ?? client.adAccountId
  if (!adAccountId) {
    throw new Error('Ad Account ID is required')
  }

  const params: Record<string, string | number | boolean> = {
    fields:
      'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
    limit: options.limit ?? 50,
  }

  if (options.status) {
    params['filtering'] = JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: [options.status] },
    ])
  }

  if (options.dateRange) {
    params.time_range = JSON.stringify({
      since: formatDateForApi(options.dateRange.since),
      until: formatDateForApi(options.dateRange.until),
    })
  }

  return client.getAllPages<MetaAdCampaign>(`/${adAccountId}/campaigns`, params)
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(
  client: MetaApiClient,
  campaignId: string
): Promise<MetaAdCampaign> {
  const response = await client.get<MetaAdCampaign>(`/${campaignId}`, {
    fields:
      'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
  })

  return response.data
}

// ===========================================
// Ad Sets
// ===========================================

export interface AdSetsOptions {
  adAccountId?: string
  campaignId?: string
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  limit?: number
}

/**
 * Get ad sets
 */
export async function getAdSets(
  client: MetaApiClient,
  options: AdSetsOptions = {}
): Promise<MetaAdSet[]> {
  // Can fetch from campaign or ad account
  const endpoint = options.campaignId
    ? `/${options.campaignId}/adsets`
    : `/${options.adAccountId ?? client.adAccountId}/adsets`

  if (!options.campaignId && !options.adAccountId && !client.adAccountId) {
    throw new Error('Either Campaign ID or Ad Account ID is required')
  }

  const params: Record<string, string | number | boolean> = {
    fields:
      'id,name,campaign_id,status,daily_budget,lifetime_budget,bid_strategy,bid_amount,optimization_goal,targeting,created_time,updated_time',
    limit: options.limit ?? 50,
  }

  if (options.status) {
    params['filtering'] = JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: [options.status] },
    ])
  }

  return client.getAllPages<MetaAdSet>(endpoint, params)
}

/**
 * Get a single ad set by ID
 */
export async function getAdSet(client: MetaApiClient, adSetId: string): Promise<MetaAdSet> {
  const response = await client.get<MetaAdSet>(`/${adSetId}`, {
    fields:
      'id,name,campaign_id,status,daily_budget,lifetime_budget,bid_strategy,bid_amount,optimization_goal,targeting,created_time,updated_time',
  })

  return response.data
}

// ===========================================
// Ads
// ===========================================

export interface AdsOptions {
  adAccountId?: string
  adSetId?: string
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_REVIEW' | 'DISAPPROVED'
  limit?: number
}

/**
 * Get ads
 */
export async function getAds(client: MetaApiClient, options: AdsOptions = {}): Promise<MetaAd[]> {
  const endpoint = options.adSetId
    ? `/${options.adSetId}/ads`
    : `/${options.adAccountId ?? client.adAccountId}/ads`

  if (!options.adSetId && !options.adAccountId && !client.adAccountId) {
    throw new Error('Either Ad Set ID or Ad Account ID is required')
  }

  const params: Record<string, string | number | boolean> = {
    fields: 'id,name,adset_id,status,creative,created_time,updated_time',
    limit: options.limit ?? 50,
  }

  if (options.status) {
    params['filtering'] = JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: [options.status] },
    ])
  }

  return client.getAllPages<MetaAd>(endpoint, params)
}

/**
 * Get a single ad by ID
 */
export async function getAd(client: MetaApiClient, adId: string): Promise<MetaAd> {
  const response = await client.get<MetaAd>(`/${adId}`, {
    fields: 'id,name,adset_id,status,creative,created_time,updated_time',
  })

  return response.data
}

// ===========================================
// Ad Insights
// ===========================================

/**
 * Ad insight fields available
 */
export type AdInsightField =
  | 'spend'
  | 'impressions'
  | 'reach'
  | 'clicks'
  | 'actions'
  | 'cost_per_action_type'
  | 'cpm'
  | 'cpc'
  | 'ctr'
  | 'frequency'
  | 'video_p25_watched_actions'
  | 'video_p50_watched_actions'
  | 'video_p75_watched_actions'
  | 'video_p100_watched_actions'
  | 'conversions'
  | 'cost_per_conversion'

export const DEFAULT_AD_INSIGHT_FIELDS: AdInsightField[] = [
  'spend',
  'impressions',
  'reach',
  'clicks',
  'cpm',
  'cpc',
  'ctr',
  'frequency',
]

export const VIDEO_AD_INSIGHT_FIELDS: AdInsightField[] = [
  ...DEFAULT_AD_INSIGHT_FIELDS,
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p100_watched_actions',
]

export const CONVERSION_AD_INSIGHT_FIELDS: AdInsightField[] = [
  ...DEFAULT_AD_INSIGHT_FIELDS,
  'actions',
  'cost_per_action_type',
  'conversions',
  'cost_per_conversion',
]

export interface AdInsightsOptions {
  adAccountId?: string
  level?: 'account' | 'campaign' | 'adset' | 'ad'
  dateRange?: DateRange
  fields?: AdInsightField[]
  breakdowns?: Array<
    'age' | 'gender' | 'country' | 'region' | 'device_platform' | 'publisher_platform'
  >
  timeIncrement?: 1 | 7 | 28 | 'monthly' | 'all_days'
  limit?: number
}

/**
 * Get ad account insights
 */
export async function getAdAccountInsights(
  client: MetaApiClient,
  options: AdInsightsOptions = {}
): Promise<AdInsight[]> {
  const adAccountId = options.adAccountId ?? client.adAccountId
  if (!adAccountId) {
    throw new Error('Ad Account ID is required')
  }

  const fields = options.fields ?? DEFAULT_AD_INSIGHT_FIELDS

  const params: Record<string, string | number | boolean> = {
    fields: fields.join(','),
    level: options.level ?? 'ad',
    limit: options.limit ?? 100,
  }

  if (options.dateRange) {
    params.time_range = JSON.stringify({
      since: formatDateForApi(options.dateRange.since),
      until: formatDateForApi(options.dateRange.until),
    })
  }

  if (options.breakdowns && options.breakdowns.length > 0) {
    params.breakdowns = options.breakdowns.join(',')
  }

  if (options.timeIncrement) {
    params.time_increment = String(options.timeIncrement)
  }

  return client.getAllPages<AdInsight>(`/${adAccountId}/insights`, params)
}

/**
 * Get insights for a specific campaign
 */
export async function getCampaignInsights(
  client: MetaApiClient,
  campaignId: string,
  options: Omit<AdInsightsOptions, 'adAccountId' | 'level'> = {}
): Promise<AdInsight[]> {
  const fields = options.fields ?? DEFAULT_AD_INSIGHT_FIELDS

  const params: Record<string, string | number | boolean> = {
    fields: fields.join(','),
    limit: options.limit ?? 100,
  }

  if (options.dateRange) {
    params.time_range = JSON.stringify({
      since: formatDateForApi(options.dateRange.since),
      until: formatDateForApi(options.dateRange.until),
    })
  }

  if (options.breakdowns && options.breakdowns.length > 0) {
    params.breakdowns = options.breakdowns.join(',')
  }

  if (options.timeIncrement) {
    params.time_increment = String(options.timeIncrement)
  }

  return client.getAllPages<AdInsight>(`/${campaignId}/insights`, params)
}

/**
 * Get insights for a specific ad set
 */
export async function getAdSetInsights(
  client: MetaApiClient,
  adSetId: string,
  options: Omit<AdInsightsOptions, 'adAccountId' | 'level'> = {}
): Promise<AdInsight[]> {
  const fields = options.fields ?? DEFAULT_AD_INSIGHT_FIELDS

  const params: Record<string, string | number | boolean> = {
    fields: fields.join(','),
    limit: options.limit ?? 100,
  }

  if (options.dateRange) {
    params.time_range = JSON.stringify({
      since: formatDateForApi(options.dateRange.since),
      until: formatDateForApi(options.dateRange.until),
    })
  }

  if (options.breakdowns && options.breakdowns.length > 0) {
    params.breakdowns = options.breakdowns.join(',')
  }

  if (options.timeIncrement) {
    params.time_increment = String(options.timeIncrement)
  }

  return client.getAllPages<AdInsight>(`/${adSetId}/insights`, params)
}

/**
 * Get insights for a specific ad
 */
export async function getAdInsights(
  client: MetaApiClient,
  adId: string,
  options: Omit<AdInsightsOptions, 'adAccountId' | 'level'> = {}
): Promise<AdInsight[]> {
  const fields = options.fields ?? DEFAULT_AD_INSIGHT_FIELDS

  const params: Record<string, string | number | boolean> = {
    fields: fields.join(','),
    limit: options.limit ?? 100,
  }

  if (options.dateRange) {
    params.time_range = JSON.stringify({
      since: formatDateForApi(options.dateRange.since),
      until: formatDateForApi(options.dateRange.until),
    })
  }

  if (options.timeIncrement) {
    params.time_increment = String(options.timeIncrement)
  }

  return client.getAllPages<AdInsight>(`/${adId}/insights`, params)
}

/**
 * Get daily ad insights for the last N days
 */
export async function getAdInsightsForDays(
  client: MetaApiClient,
  days: number,
  options: Omit<AdInsightsOptions, 'dateRange' | 'timeIncrement'> = {}
): Promise<AdInsight[]> {
  const until = new Date()
  const since = new Date()
  since.setDate(since.getDate() - days)

  return getAdAccountInsights(client, {
    ...options,
    dateRange: { since, until },
    timeIncrement: 1,
  })
}

// ===========================================
// Helpers
// ===========================================

/**
 * Format date for Meta API (YYYY-MM-DD)
 */
function formatDateForApi(date: Date | string): string {
  if (typeof date === 'string') {
    return date
  }
  const isoString = date.toISOString()
  return isoString.split('T')[0] ?? isoString
}

/**
 * Parse ad insights into aggregated metrics
 */
export interface AggregatedAdMetrics {
  spend: number
  impressions: number
  reach: number
  clicks: number
  cpm: number
  cpc: number
  ctr: number
  conversions: number
  costPerConversion: number
  roas: number
}

export function aggregateAdInsights(insights: AdInsight[]): AggregatedAdMetrics {
  const totals = insights.reduce(
    (acc, insight) => {
      acc.spend += parseFloat(insight.spend || '0')
      acc.impressions += parseInt(insight.impressions || '0', 10)
      acc.reach += parseInt(insight.reach || '0', 10)
      acc.clicks += parseInt(insight.clicks || '0', 10)

      // Extract conversions and value from actions
      const purchaseAction = insight.actions?.find((a) => a.action_type === 'purchase')
      if (purchaseAction) {
        acc.conversions += parseInt(purchaseAction.value || '0', 10)
      }

      return acc
    },
    { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0 }
  )

  return {
    spend: totals.spend,
    impressions: totals.impressions,
    reach: totals.reach,
    clicks: totals.clicks,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    conversions: totals.conversions,
    costPerConversion: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    roas: 0, // Would need conversion value to calculate
  }
}

/**
 * Group ad insights by date
 */
export function groupInsightsByDate(insights: AdInsight[]): Map<string, AdInsight[]> {
  const grouped = new Map<string, AdInsight[]>()

  for (const insight of insights) {
    const date = insight.date_start
    const existing = grouped.get(date) ?? []
    existing.push(insight)
    grouped.set(date, existing)
  }

  return grouped
}

/**
 * Calculate video completion rates
 */
export interface VideoCompletionRates {
  p25: number
  p50: number
  p75: number
  p100: number
}

export function calculateVideoCompletionRates(insight: AdInsight): VideoCompletionRates {
  return {
    p25: parseInt(insight.video_p25_watched_actions?.[0]?.value ?? '0', 10),
    p50: parseInt(insight.video_p50_watched_actions?.[0]?.value ?? '0', 10),
    p75: parseInt(insight.video_p75_watched_actions?.[0]?.value ?? '0', 10),
    p100: parseInt(insight.video_p100_watched_actions?.[0]?.value ?? '0', 10),
  }
}
