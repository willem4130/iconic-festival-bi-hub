/**
 * Social Listening module - Brand24 integration
 *
 * Monitors brand mentions across social media, news, blogs, and forums.
 * Provides real-time alerts for negative sentiment and influencer mentions.
 *
 * @example
 * ```typescript
 * import { createSocialListeningClientFromEnv } from '@/lib/social-listening'
 *
 * const client = createSocialListeningClientFromEnv()
 * if (client) {
 *   const mentions = await client.getMentions({ sentiment: 'negative' })
 *   console.log(mentions.data.length) // Number of negative mentions
 * }
 * ```
 */

export {
  SocialListeningClient,
  SocialListeningError,
  createSocialListeningClientFromEnv,
} from './client'

export type {
  SocialListeningConfig,
  MentionSentiment,
  SourceType,
  Brand24Mention,
  Brand24MentionsResponse,
  Brand24ProjectSummary,
  TrackedMention,
  MentionAlert,
  SocialListeningSummary,
  MentionFilters,
} from './types'

export { shouldRequireResponse, calculateMentionPriority, calculateSentimentScore } from './types'
