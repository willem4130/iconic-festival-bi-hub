/**
 * Cross-Data Correlations Types
 *
 * Types for analyzing relationships between different data sources:
 * - Weather + Social Engagement
 * - Hashtags + Reach/Engagement
 * - Sentiment + Follower Growth
 * - Link Clicks + Conversions
 */

// Correlation strength
export type CorrelationStrength = 'strong' | 'moderate' | 'weak' | 'none'

// Generic correlation result
export interface CorrelationResult {
  coefficient: number // -1 to 1 (Pearson correlation)
  strength: CorrelationStrength
  sampleSize: number
  pValue?: number
  insight: string
}

// Weather-Engagement correlation
export interface WeatherEngagementCorrelation {
  period: { from: string; to: string }
  correlations: {
    temperatureVsEngagement: CorrelationResult
    temperatureVsReach: CorrelationResult
    rainVsEngagement: CorrelationResult
    sunnyDaysEngagement: number
    rainyDaysEngagement: number
  }
  insights: string[]
  recommendations: string[]
}

// Hashtag performance correlation
export interface HashtagPerformanceCorrelation {
  period: { from: string; to: string }
  topPerformers: Array<{
    hashtag: string
    avgEngagementRate: number
    avgReach: number
    timesUsed: number
    color: string | null
  }>
  worstPerformers: Array<{
    hashtag: string
    avgEngagementRate: number
    avgReach: number
    timesUsed: number
    color: string | null
  }>
  colorCorrelation: {
    green: { avgEngagement: number; count: number }
    blue: { avgEngagement: number; count: number }
    red: { avgEngagement: number; count: number }
  }
  insights: string[]
}

// Sentiment-Growth correlation
export interface SentimentGrowthCorrelation {
  period: { from: string; to: string }
  correlation: CorrelationResult
  sentimentImpact: {
    highPositiveDays: { avgFollowerGrowth: number; count: number }
    highNegativeDays: { avgFollowerGrowth: number; count: number }
    neutralDays: { avgFollowerGrowth: number; count: number }
  }
  insights: string[]
}

// Attribution ROI correlation
export interface AttributionROICorrelation {
  period: { from: string; to: string }
  byPlatform: {
    facebook: { clicks: number; conversions: number; rate: number; value: number }
    instagram: { clicks: number; conversions: number; rate: number; value: number }
  }
  byMedium: {
    post: { clicks: number; conversions: number; rate: number }
    story: { clicks: number; conversions: number; rate: number }
    reel: { clicks: number; conversions: number; rate: number }
    ad: { clicks: number; conversions: number; rate: number }
  }
  topConverting: Array<{
    contentType: string
    conversionRate: number
    avgValue: number
  }>
  insights: string[]
}

// Full insights report combining all correlations
export interface FullInsightsReport {
  period: { from: string; to: string }
  weather?: WeatherEngagementCorrelation
  hashtags?: HashtagPerformanceCorrelation
  sentiment?: SentimentGrowthCorrelation
  attribution?: AttributionROICorrelation
  keyInsights: string[]
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    expectedImpact: string
  }>
}

/**
 * Calculate Pearson correlation coefficient
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i]!, 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Determine correlation strength from coefficient
 */
export function getCorrelationStrength(coefficient: number): CorrelationStrength {
  const abs = Math.abs(coefficient)
  if (abs >= 0.7) return 'strong'
  if (abs >= 0.4) return 'moderate'
  if (abs >= 0.2) return 'weak'
  return 'none'
}

/**
 * Generate insight text from correlation
 */
export function generateCorrelationInsight(
  factor1: string,
  factor2: string,
  coefficient: number
): string {
  const strength = getCorrelationStrength(coefficient)
  const direction = coefficient > 0 ? 'positive' : 'negative'

  if (strength === 'none') {
    return `No significant correlation found between ${factor1} and ${factor2}.`
  }

  return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation (${coefficient.toFixed(2)}) between ${factor1} and ${factor2}.`
}

/**
 * Calculate percentage change
 */
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return ((newValue - oldValue) / oldValue) * 100
}
