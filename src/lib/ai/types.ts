// AI Analysis Types for Claude Integration

export interface QuickInsight {
  emoji: string
  title: string
  description: string
  metric?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface PostRecommendation {
  bestPostingTime: {
    dayOfWeek: string
    hour: number
    timezone: string
  }
  optimalContentType: string
  suggestedHashtags: string[]
  engagementPrediction: number
  confidence: number
}

export interface PerformanceAnalysis {
  contentId: string
  whyItWorked?: string
  whyItFailed?: string
  keyFactors: string[]
  improvementSuggestions: string[]
  similarSuccessfulContent?: string[]
}

export interface ContentComparison {
  contentIds: string[]
  winner: string
  analysis: string
  keyDifferences: Array<{
    factor: string
    contentA: string
    contentB: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
  recommendations: string[]
}

export interface StrategicAdvice {
  focus: 'growth' | 'engagement' | 'reach'
  summary: string
  topOpportunities: Array<{
    title: string
    description: string
    expectedImpact: string
    effort: 'low' | 'medium' | 'high'
  }>
  contentCalendarSuggestions: Array<{
    dayOfWeek: string
    contentType: string
    theme: string
  }>
  competitorInsights?: string[]
}

export interface NarrativeReport {
  month: number
  year: number
  summary: string
  highlights: Array<{
    title: string
    metric: string
    context: string
  }>
  challenges: string[]
  recommendations: string[]
  outlook: string
}

export interface AnomalyAlert {
  type: 'spike' | 'drop' | 'trend_change'
  metric: string
  severity: 'info' | 'warning' | 'critical'
  description: string
  date: string
  possibleCauses: string[]
}

// Input types for AI analysis
export interface InsightsData {
  platform: 'facebook' | 'instagram' | 'all'
  days: number
  metrics: {
    totalReach: number
    totalEngagement: number
    totalFollowers: number
    newFollowers: number
    engagementRate: number
  }
  dailyData: Array<{
    date: string
    reach: number
    engagement: number
    followers: number
  }>
  topContent: Array<{
    id: string
    type: string
    reach: number
    engagement: number
    caption?: string
  }>
  bottomContent: Array<{
    id: string
    type: string
    reach: number
    engagement: number
    caption?: string
  }>
}

export interface ContentData {
  id: string
  platform: 'FACEBOOK' | 'INSTAGRAM'
  contentType: string
  caption?: string
  publishedAt: string
  metrics: {
    likes: number
    comments: number
    shares: number
    reach: number
    impressions: number
  }
  hashtags?: string[]
}

// Cache types
export interface CachedAnalysis<T> {
  result: T
  cachedAt: Date
  expiresAt: Date
}
