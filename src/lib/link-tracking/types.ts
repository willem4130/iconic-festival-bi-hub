/**
 * Short.io Link Tracking API Types
 * @see https://developers.short.io/reference/
 */

export interface LinkTrackingConfig {
  apiKey: string
  domain: string // Custom short domain (e.g., "iconic.link")
}

// UTM Parameters for link attribution
export interface UTMParams {
  source?: string // "facebook", "instagram"
  medium?: string // "post", "story", "ad", "bio"
  campaign?: string // "summer_festival_2025"
  content?: string // Post ID or creative identifier
  term?: string // Optional keyword/term
}

// Request to create a short link
export interface CreateLinkRequest {
  originalUrl: string
  title?: string
  utmParams?: UTMParams
  contentId?: string // Link to specific Meta content
}

// Short.io link response
export interface ShortIoLink {
  id: string
  originalURL: string
  shortURL: string
  path: string // The short code
  title?: string
  createdAt: string
  updatedAt?: string
  clicks?: number
  uniqueClicks?: number
  // Custom properties
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

// Short.io link creation request body
export interface ShortIoCreateRequest {
  domain: string
  originalURL: string
  title?: string
  path?: string // Custom short code (optional)
  allowDuplicates?: boolean
}

// Short.io link stats response
export interface ShortIoLinkStats {
  clicks: number
  uniqueClicks: number
  clicksByCountry: Record<string, number>
  clicksByBrowser: Record<string, number>
  clicksByDevice: Record<string, number>
  clicksByOs: Record<string, number>
  clicksByDate: Array<{
    date: string
    clicks: number
  }>
}

// Short.io webhook click event
export interface ShortIoClickEvent {
  id: string
  linkId: string
  shortURL: string
  originalURL: string
  createdAt: string // ISO 8601 timestamp
  // Geographic
  country?: string
  city?: string
  region?: string
  // Device info
  deviceType?: string // "mobile", "desktop", "tablet"
  browser?: string
  os?: string
  // Referrer
  referer?: string
  // User agent
  userAgent?: string
  // Bot detection
  isBot?: boolean
}

// Internal link representation
export interface TrackedLink {
  id: string
  shortUrl: string
  originalUrl: string
  shortCode: string
  title?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  contentId?: string
  totalClicks: number
  uniqueClicks: number
  createdAt: Date
}

// Click event for storage
export interface ClickEvent {
  linkId: string
  timestamp: Date
  country?: string
  city?: string
  region?: string
  deviceType?: string
  browser?: string
  os?: string
  referer?: string
  isBot: boolean
}

// Attribution report
export interface AttributionReport {
  dateRange: {
    from: string
    to: string
  }
  totalClicks: number
  uniqueClicks: number
  conversions: number
  conversionRate: number
  byPlatform: {
    facebook: number
    instagram: number
    other: number
  }
  byMedium: {
    post: number
    story: number
    reel: number
    ad: number
    bio: number
    other: number
  }
  byCountry: Record<string, number>
  byDevice: {
    mobile: number
    desktop: number
    tablet: number
  }
  topLinks: Array<{
    shortUrl: string
    originalUrl: string
    clicks: number
    conversions: number
  }>
}

// Link with content relationship
export interface LinkWithContent extends TrackedLink {
  content?: {
    id: string
    message?: string
    contentType: string
    publishedAt: Date
  }
}

/**
 * Build a URL with UTM parameters
 */
export function buildUrlWithUtm(baseUrl: string, utm: UTMParams): string {
  const url = new URL(baseUrl)

  if (utm.source) url.searchParams.set('utm_source', utm.source)
  if (utm.medium) url.searchParams.set('utm_medium', utm.medium)
  if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign)
  if (utm.content) url.searchParams.set('utm_content', utm.content)
  if (utm.term) url.searchParams.set('utm_term', utm.term)

  return url.toString()
}

/**
 * Parse UTM parameters from a URL
 */
export function parseUtmFromUrl(url: string): UTMParams {
  const parsed = new URL(url)
  return {
    source: parsed.searchParams.get('utm_source') ?? undefined,
    medium: parsed.searchParams.get('utm_medium') ?? undefined,
    campaign: parsed.searchParams.get('utm_campaign') ?? undefined,
    content: parsed.searchParams.get('utm_content') ?? undefined,
    term: parsed.searchParams.get('utm_term') ?? undefined,
  }
}
