/**
 * Sentiment Analysis module - AWS Comprehend integration
 *
 * Provides sentiment analysis, key phrase extraction, and entity detection
 * for social media comments.
 *
 * @example
 * ```typescript
 * import { createSentimentClientFromEnv } from '@/lib/sentiment-api'
 *
 * const client = createSentimentClientFromEnv()
 * if (client) {
 *   const result = await client.detectSentiment('This festival was amazing!')
 *   console.log(result.sentiment) // "POSITIVE"
 *   console.log(result.keyPhrases) // ["festival", "amazing"]
 * }
 * ```
 */

export { SentimentApiClient, SentimentApiError, createSentimentClientFromEnv } from './client'

export type {
  SentimentApiConfig,
  SentimentLabel,
  SentimentScores,
  SentimentResult,
  CommentForAnalysis,
  BatchAnalysisResult,
  DailySentimentSummary,
  SupportedLanguage,
} from './types'

export {
  getDominantSentiment,
  calculateSentimentScore,
  determineTrend,
  requiresResponse,
  SUPPORTED_LANGUAGES,
} from './types'
