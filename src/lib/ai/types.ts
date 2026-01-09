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
    reasoning: string
  }
  secondaryPostingTimes: Array<{
    dayOfWeek: string
    hour: number
    engagementPotential: 'high' | 'medium' | 'low'
  }>
  weeklySchedule: Array<{
    day: string
    postCount: number
    bestTimes: number[]
    contentType: string
    theme: string
  }>
  optimalContentType: string
  contentMix: Array<{
    type: string
    percentage: number
    description: string
    examples: string[]
  }>
  suggestedHashtags: string[]
  hashtagStrategy: {
    branded: string[]
    trending: string[]
    niche: string[]
    community: string[]
    usage: string
  }
  captionTemplates: Array<{
    type: string
    template: string
    example: string
    tips: string[]
  }>
  audienceInsights: {
    peakActivityHours: number[]
    preferredContentTypes: string[]
    engagementPatterns: string
    demographicNotes: string
  }
  platformSpecificTips: Array<{
    tip: string
    impact: 'high' | 'medium' | 'low'
    category: 'timing' | 'content' | 'engagement' | 'growth' | 'hashtags'
  }>
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
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  benchmarkComparison: {
    vsIndustry: string
    vsPreviousPeriod: string
    areasAboveAverage: string[]
    areasBelowAverage: string[]
  }
  topOpportunities: Array<{
    title: string
    description: string
    expectedImpact: string
    effort: 'low' | 'medium' | 'high'
    priority: number
    steps: string[]
  }>
  quickWins: Array<{
    action: string
    impact: string
    timeToImplement: string
  }>
  riskAssessment: Array<{
    risk: string
    severity: 'low' | 'medium' | 'high'
    mitigation: string
  }>
  growthProjections: {
    conservative: string
    moderate: string
    aggressive: string
    keyAssumptions: string[]
  }
  contentCalendarSuggestions: Array<{
    dayOfWeek: string
    contentType: string
    theme: string
    caption: string
    bestTime: string
  }>
  competitorInsights?: string[]
  keyMetricsToTrack: Array<{
    metric: string
    currentValue: string
    targetValue: string
    importance: string
  }>
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
