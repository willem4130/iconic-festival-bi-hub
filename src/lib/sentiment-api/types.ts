/**
 * AWS Comprehend Sentiment Analysis Types
 * @see https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectSentiment.html
 */

export interface SentimentApiConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
}

// Sentiment labels from AWS Comprehend
export type SentimentLabel = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED'

// Sentiment scores from AWS Comprehend
export interface SentimentScores {
  Positive: number
  Negative: number
  Neutral: number
  Mixed: number
}

// AWS Comprehend DetectSentiment response
export interface ComprehendSentimentResponse {
  Sentiment: SentimentLabel
  SentimentScore: SentimentScores
}

// AWS Comprehend BatchDetectSentiment response
export interface ComprehendBatchSentimentResponse {
  ResultList: Array<{
    Index: number
    Sentiment: SentimentLabel
    SentimentScore: SentimentScores
  }>
  ErrorList: Array<{
    Index: number
    ErrorCode: string
    ErrorMessage: string
  }>
}

// AWS Comprehend DetectKeyPhrases response
export interface ComprehendKeyPhrasesResponse {
  KeyPhrases: Array<{
    Text: string
    Score: number
    BeginOffset: number
    EndOffset: number
  }>
}

// AWS Comprehend DetectEntities response
export interface ComprehendEntitiesResponse {
  Entities: Array<{
    Text: string
    Type: string // PERSON, LOCATION, ORGANIZATION, EVENT, etc.
    Score: number
    BeginOffset: number
    EndOffset: number
  }>
}

// Internal sentiment analysis result
export interface SentimentResult {
  text: string
  sentiment: SentimentLabel
  confidence: number
  scores: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  keyPhrases: string[]
  entities: Array<{
    text: string
    type: string
    score: number
  }>
  language?: string
}

// Comment for analysis
export interface CommentForAnalysis {
  id: string
  text: string
  contentId: string
  authorName?: string
  commentedAt: Date
}

// Batch analysis result
export interface BatchAnalysisResult {
  analyzed: number
  failed: number
  results: SentimentResult[]
  errors: Array<{
    index: number
    error: string
  }>
}

// Daily sentiment summary
export interface DailySentimentSummary {
  date: string
  totalComments: number
  sentimentBreakdown: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  avgSentimentScore: number
  trend: 'improving' | 'declining' | 'stable'
  topPositivePhrases: string[]
  topNegativePhrases: string[]
}

/**
 * Get the dominant sentiment label from scores
 */
export function getDominantSentiment(scores: SentimentScores): SentimentLabel {
  const entries = Object.entries(scores) as [keyof SentimentScores, number][]
  const sorted = entries.sort((a, b) => b[1] - a[1])
  return sorted[0]![0].toUpperCase() as SentimentLabel
}

/**
 * Calculate overall sentiment score (-1 to 1)
 * Negative = -1, Neutral = 0, Positive = 1
 */
export function calculateSentimentScore(scores: SentimentScores): number {
  return scores.Positive - scores.Negative
}

/**
 * Determine sentiment trend from previous and current scores
 */
export function determineTrend(
  previousScore: number,
  currentScore: number,
  threshold: number = 0.05
): 'improving' | 'declining' | 'stable' {
  const delta = currentScore - previousScore
  if (delta > threshold) return 'improving'
  if (delta < -threshold) return 'declining'
  return 'stable'
}

/**
 * Check if sentiment requires response (negative with high confidence)
 */
export function requiresResponse(
  sentiment: SentimentLabel,
  confidence: number,
  threshold: number = 0.7
): boolean {
  return sentiment === 'NEGATIVE' && confidence >= threshold
}

/**
 * Supported languages for AWS Comprehend
 */
export const SUPPORTED_LANGUAGES = [
  'en', // English
  'es', // Spanish
  'fr', // French
  'de', // German
  'it', // Italian
  'pt', // Portuguese
  'ar', // Arabic
  'hi', // Hindi
  'ja', // Japanese
  'ko', // Korean
  'zh', // Chinese (simplified)
  'zh-TW', // Chinese (traditional)
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
