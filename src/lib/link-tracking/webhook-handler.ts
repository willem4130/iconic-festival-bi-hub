/**
 * Short.io Webhook Handler
 *
 * Processes click events from Short.io webhooks and stores them in the database.
 */

import crypto from 'crypto'
import type { ShortIoClickEvent, ClickEvent } from './types'

/**
 * Parse and validate a Short.io webhook payload
 */
export function parseWebhookPayload(payload: unknown): ShortIoClickEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const data = payload as Record<string, unknown>

  // Validate required fields
  if (!data.id || !data.linkId || !data.shortURL) {
    return null
  }

  return {
    id: String(data.id),
    linkId: String(data.linkId),
    shortURL: String(data.shortURL),
    originalURL: String(data.originalURL ?? ''),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    country: data.country ? String(data.country) : undefined,
    city: data.city ? String(data.city) : undefined,
    region: data.region ? String(data.region) : undefined,
    deviceType: normalizeDeviceType(data.deviceType),
    browser: data.browser ? String(data.browser) : undefined,
    os: data.os ? String(data.os) : undefined,
    referer: data.referer ? String(data.referer) : undefined,
    userAgent: data.userAgent ? String(data.userAgent) : undefined,
    isBot: detectBot(data.userAgent ? String(data.userAgent) : undefined),
  }
}

/**
 * Normalize device type to standard values
 */
function normalizeDeviceType(deviceType: unknown): string | undefined {
  if (!deviceType) return undefined

  const type = String(deviceType).toLowerCase()

  if (type.includes('mobile') || type.includes('phone')) return 'mobile'
  if (type.includes('tablet') || type.includes('ipad')) return 'tablet'
  if (type.includes('desktop') || type.includes('pc')) return 'desktop'

  return type
}

/**
 * Simple bot detection based on user agent
 */
function detectBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /slurp/i,
    /googlebot/i,
    /bingbot/i,
    /yandex/i,
    /baidu/i,
    /facebook.*external/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
    /pingdom/i,
    /uptimerobot/i,
  ]

  return botPatterns.some((pattern) => pattern.test(userAgent))
}

/**
 * Convert webhook event to internal ClickEvent format
 */
export function webhookToClickEvent(event: ShortIoClickEvent, dbLinkId: string): ClickEvent {
  return {
    linkId: dbLinkId,
    timestamp: new Date(event.createdAt),
    country: event.country,
    city: event.city,
    region: event.region,
    deviceType: event.deviceType,
    browser: event.browser,
    os: event.os,
    referer: event.referer,
    isBot: event.isBot ?? false,
  }
}

/**
 * Extract domain from referer URL
 */
export function extractRefererDomain(referer: string | undefined): string | undefined {
  if (!referer) return undefined

  try {
    const url = new URL(referer)
    return url.hostname
  } catch {
    return undefined
  }
}

/**
 * Verify webhook signature (if Short.io provides one)
 * Short.io uses a simple secret-based verification
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  // If no secret is configured, skip verification (not recommended for production)
  if (!secret) {
    console.warn('Webhook signature verification skipped: no secret configured')
    return true
  }

  if (!signature) {
    return false
  }

  // Short.io may use different signature methods
  // This is a placeholder - implement based on Short.io's actual signature method
  // For now, we'll do a simple comparison (replace with proper HMAC if needed)
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}
