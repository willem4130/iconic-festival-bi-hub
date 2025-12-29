/**
 * Hashtag Analytics module - RiteTag integration
 *
 * Provides hashtag trending analysis, suggestions, and banned hashtag detection.
 *
 * @example
 * ```typescript
 * import { createHashtagClientFromEnv } from '@/lib/hashtag-api'
 *
 * const client = createHashtagClientFromEnv()
 * if (client) {
 *   const stats = await client.getHashtagStats(['festival', 'music', 'summer'])
 *   console.log(stats[0]?.color) // "green" = trending
 * }
 * ```
 */

export { HashtagApiClient, HashtagApiError, createHashtagClientFromEnv } from './client'

export type {
  HashtagApiConfig,
  RiteTagHashtagStats,
  RiteTagSuggestion,
  RiteTagColor,
  RiteTagStatsResponse,
  RiteTagSuggestionsResponse,
  RiteTagBannedResponse,
  TrackedHashtag,
  HashtagPerformance,
  HashtagRecommendationRequest,
  HashtagRecommendation,
} from './types'

export {
  RITETAG_COLOR_MEANINGS,
  normalizeHashtag,
  extractHashtags,
  getColorPriority,
  getHashtagRecommendation,
} from './types'
