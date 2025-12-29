/**
 * Link Tracking module - Short.io integration
 *
 * Provides URL shortening with UTM parameters for attribution tracking.
 * Tracks clicks and conversions from social media posts.
 *
 * @example
 * ```typescript
 * import { createLinkTrackingClientFromEnv } from '@/lib/link-tracking'
 *
 * const client = createLinkTrackingClientFromEnv()
 * if (client) {
 *   const link = await client.createLink('https://tickets.iconic.nl', {
 *     title: 'Festival Tickets',
 *     utmParams: {
 *       source: 'instagram',
 *       medium: 'post',
 *       campaign: 'summer_2025',
 *     },
 *   })
 *   console.log(link.shortURL) // "https://iconic.link/abc123"
 * }
 * ```
 */

export { LinkTrackingClient, LinkTrackingError, createLinkTrackingClientFromEnv } from './client'

export {
  parseWebhookPayload,
  webhookToClickEvent,
  extractRefererDomain,
  verifyWebhookSignature,
} from './webhook-handler'

export type {
  LinkTrackingConfig,
  UTMParams,
  CreateLinkRequest,
  ShortIoLink,
  ShortIoLinkStats,
  ShortIoClickEvent,
  TrackedLink,
  ClickEvent,
  AttributionReport,
  LinkWithContent,
} from './types'

export { buildUrlWithUtm, parseUtmFromUrl } from './types'
