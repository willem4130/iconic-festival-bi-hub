/**
 * Link Tracking Router - Short.io API Integration
 *
 * Provides URL shortening with UTM parameters for attribution tracking.
 * Tracks clicks from social media posts to measure campaign effectiveness.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { createLinkTrackingClientFromEnv, type UTMParams } from '@/lib/link-tracking'
import { db as prismaDb } from '@/server/db'

type PrismaClient = typeof prismaDb

/**
 * Get or create a DimDate record for a given date
 */
async function ensureDimDate(db: PrismaClient, dateStr: string): Promise<string> {
  const date = new Date(dateStr)

  const existing = await db.dimDate.findUnique({
    where: { date },
    select: { id: true },
  })

  if (existing) return existing.id

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const dayOfMonth = date.getDate()
  const dayOfWeek = date.getDay()
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )

  const jan4 = new Date(year, 0, 4)
  const startOfWeek = new Date(jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000)
  const week = Math.ceil(((date.getTime() - startOfWeek.getTime()) / 86400000 + 1) / 7)

  const quarter = Math.ceil(month / 3)

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const created = await db.dimDate.create({
    data: {
      date,
      year,
      quarter,
      month,
      week,
      dayOfMonth,
      dayOfWeek,
      dayOfYear,
      monthName: monthNames[month - 1]!,
      dayName: dayNames[dayOfWeek]!,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: false,
      isFestivalDay: false,
    },
    select: { id: true },
  })

  return created.id
}

const utmParamsSchema = z.object({
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  content: z.string().optional(),
  term: z.string().optional(),
})

export const linkTrackingRouter = createTRPCRouter({
  /**
   * Get connection status for Short.io API
   */
  getConnectionStatus: protectedProcedure.query(async () => {
    const client = createLinkTrackingClientFromEnv()

    if (!client) {
      return {
        connected: false,
        error: 'SHORT_IO_API_KEY or SHORT_IO_DOMAIN not configured',
        domain: null,
      }
    }

    try {
      const isValid = await client.validateApiKey()
      return {
        connected: isValid,
        error: isValid ? null : 'Invalid API key',
        domain: client.domainName,
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        domain: client.domainName,
      }
    }
  }),

  /**
   * Create a new tracked short link
   */
  createLink: protectedProcedure
    .input(
      z.object({
        originalUrl: z.string().url(),
        title: z.string().optional(),
        utmParams: utmParamsSchema.optional(),
        contentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = createLinkTrackingClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Link tracking API not configured',
        })
      }

      try {
        // Create link via Short.io
        const shortIoLink = await client.createLink(input.originalUrl, {
          title: input.title,
          utmParams: input.utmParams as UTMParams,
        })

        // Store in database
        const dbLink = await ctx.db.dimLink.create({
          data: {
            shortUrl: shortIoLink.shortURL,
            originalUrl: shortIoLink.originalURL,
            shortCode: shortIoLink.path,
            externalId: shortIoLink.id,
            domain: client.domainName,
            title: input.title,
            utmSource: input.utmParams?.source,
            utmMedium: input.utmParams?.medium,
            utmCampaign: input.utmParams?.campaign,
            utmContent: input.utmParams?.content,
            utmTerm: input.utmParams?.term,
            contentId: input.contentId,
          },
        })

        return {
          id: dbLink.id,
          shortUrl: dbLink.shortUrl,
          originalUrl: dbLink.originalUrl,
          shortCode: dbLink.shortCode,
          utmSource: dbLink.utmSource,
          utmMedium: dbLink.utmMedium,
          utmCampaign: dbLink.utmCampaign,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create link',
        })
      }
    }),

  /**
   * Get all tracked links with pagination
   */
  getLinks: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        campaign: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { isActive: true }

      if (input.campaign) {
        where.utmCampaign = input.campaign
      }
      if (input.source) {
        where.utmSource = input.source
      }

      const [links, total] = await Promise.all([
        ctx.db.dimLink.findMany({
          where,
          include: {
            content: {
              select: {
                id: true,
                message: true,
                contentType: true,
                publishedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.dimLink.count({ where }),
      ])

      return {
        links: links.map((link) => ({
          id: link.id,
          shortUrl: link.shortUrl,
          originalUrl: link.originalUrl,
          shortCode: link.shortCode,
          title: link.title,
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
          totalClicks: link.totalClicks,
          uniqueClicks: link.uniqueClicks,
          createdAt: link.createdAt,
          content: link.content,
        })),
        total,
        hasMore: input.offset + links.length < total,
      }
    }),

  /**
   * Get link analytics by ID
   */
  getLinkAnalytics: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const link = await ctx.db.dimLink.findUnique({
        where: { id: input.linkId },
        include: {
          content: {
            select: {
              id: true,
              message: true,
              contentType: true,
            },
          },
        },
      })

      if (!link) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Link not found',
        })
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      // Get click events
      const clicks = await ctx.db.factLinkClicks.findMany({
        where: {
          linkId: link.id,
          clickTimestamp: { gte: cutoffDate },
        },
        include: {
          date: {
            select: { date: true },
          },
        },
        orderBy: { clickTimestamp: 'desc' },
      })

      // Aggregate by country
      const byCountry: Record<string, number> = {}
      const byDevice: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 }
      const byDate: Record<string, number> = {}

      for (const click of clicks) {
        if (click.country) {
          byCountry[click.country] = (byCountry[click.country] ?? 0) + 1
        }
        if (click.deviceType) {
          const device = click.deviceType.toLowerCase()
          if (device in byDevice) {
            byDevice[device]! += 1
          }
        }
        const dateStr = click.date.date.toISOString().split('T')[0]!
        byDate[dateStr] = (byDate[dateStr] ?? 0) + 1
      }

      // Get conversion stats
      const conversions = clicks.filter((c) => c.converted)
      const totalConversionValue = conversions.reduce((sum, c) => sum + (c.conversionValue ?? 0), 0)

      return {
        link: {
          id: link.id,
          shortUrl: link.shortUrl,
          originalUrl: link.originalUrl,
          title: link.title,
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
          content: link.content,
        },
        stats: {
          totalClicks: clicks.length,
          uniqueClicks: link.uniqueClicks,
          conversions: conversions.length,
          conversionRate: clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0,
          conversionValue: totalConversionValue,
        },
        byCountry,
        byDevice,
        byDate: Object.entries(byDate)
          .map(([date, clicks]) => ({ date, clicks }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }
    }),

  /**
   * Get attribution report for a date range
   */
  getAttributionReport: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
        campaign: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      // Build where clause for links
      const linkWhere: Record<string, unknown> = {}
      if (input.campaign) {
        linkWhere.utmCampaign = input.campaign
      }

      // Get all clicks with link info
      const clicks = await ctx.db.factLinkClicks.findMany({
        where: {
          clickTimestamp: { gte: cutoffDate },
          ...(input.campaign ? { link: { utmCampaign: input.campaign } } : {}),
        },
        include: {
          link: {
            select: {
              id: true,
              shortUrl: true,
              originalUrl: true,
              utmSource: true,
              utmMedium: true,
              utmCampaign: true,
            },
          },
        },
      })

      // Aggregate metrics
      const byPlatform = { facebook: 0, instagram: 0, other: 0 }
      const byMedium = { post: 0, story: 0, reel: 0, ad: 0, bio: 0, other: 0 }
      const byCountry: Record<string, number> = {}
      const byDevice = { mobile: 0, desktop: 0, tablet: 0 }
      const linkStats: Record<
        string,
        { shortUrl: string; originalUrl: string; clicks: number; conversions: number }
      > = {}

      let conversions = 0
      let conversionValue = 0

      for (const click of clicks) {
        // By platform (source)
        const source = click.link.utmSource?.toLowerCase()
        if (source === 'facebook') byPlatform.facebook++
        else if (source === 'instagram') byPlatform.instagram++
        else byPlatform.other++

        // By medium
        const medium = click.link.utmMedium?.toLowerCase()
        if (medium === 'post') byMedium.post++
        else if (medium === 'story') byMedium.story++
        else if (medium === 'reel') byMedium.reel++
        else if (medium === 'ad') byMedium.ad++
        else if (medium === 'bio') byMedium.bio++
        else byMedium.other++

        // By country
        if (click.country) {
          byCountry[click.country] = (byCountry[click.country] ?? 0) + 1
        }

        // By device
        const device = click.deviceType?.toLowerCase()
        if (device === 'mobile') byDevice.mobile++
        else if (device === 'desktop') byDevice.desktop++
        else if (device === 'tablet') byDevice.tablet++

        // Track conversions
        if (click.converted) {
          conversions++
          conversionValue += click.conversionValue ?? 0
        }

        // Track per link
        if (!linkStats[click.link.id]) {
          linkStats[click.link.id] = {
            shortUrl: click.link.shortUrl,
            originalUrl: click.link.originalUrl,
            clicks: 0,
            conversions: 0,
          }
        }
        linkStats[click.link.id]!.clicks++
        if (click.converted) {
          linkStats[click.link.id]!.conversions++
        }
      }

      // Get top links
      const topLinks = Object.values(linkStats)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)

      return {
        dateRange: {
          from: cutoffDate.toISOString().split('T')[0]!,
          to: new Date().toISOString().split('T')[0]!,
        },
        totalClicks: clicks.length,
        uniqueClicks: new Set(clicks.map((c) => c.id)).size,
        conversions,
        conversionRate: clicks.length > 0 ? (conversions / clicks.length) * 100 : 0,
        conversionValue,
        byPlatform,
        byMedium,
        byCountry,
        byDevice,
        topLinks,
      }
    }),

  /**
   * Record a click event (from webhook)
   */
  recordClick: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
        externalClickId: z.string().optional(),
        timestamp: z.date().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        deviceType: z.string().optional(),
        browser: z.string().optional(),
        os: z.string().optional(),
        referer: z.string().optional(),
        isBot: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.db.dimLink.findUnique({
        where: { id: input.linkId },
      })

      if (!link) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Link not found',
        })
      }

      const timestamp = input.timestamp ?? new Date()
      const dateStr = timestamp.toISOString().split('T')[0]!
      const dateId = await ensureDimDate(ctx.db, dateStr)

      // Extract referer domain
      let refererDomain: string | undefined
      if (input.referer) {
        try {
          refererDomain = new URL(input.referer).hostname
        } catch {
          // Invalid URL, ignore
        }
      }

      // Create click record
      const click = await ctx.db.factLinkClicks.create({
        data: {
          linkId: link.id,
          dateId,
          clickTimestamp: timestamp,
          externalClickId: input.externalClickId,
          country: input.country,
          city: input.city,
          region: input.region,
          deviceType: input.deviceType,
          browser: input.browser,
          os: input.os,
          referer: input.referer,
          refererDomain,
          isBot: input.isBot,
        },
      })

      // Update link click counts
      await ctx.db.dimLink.update({
        where: { id: link.id },
        data: {
          totalClicks: { increment: 1 },
          // Note: uniqueClicks would need more sophisticated tracking
        },
      })

      return { id: click.id, recorded: true }
    }),

  /**
   * Mark a click as converted
   */
  recordConversion: protectedProcedure
    .input(
      z.object({
        clickId: z.string(),
        conversionValue: z.number().optional(),
        conversionType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const click = await ctx.db.factLinkClicks.update({
        where: { id: input.clickId },
        data: {
          converted: true,
          conversionValue: input.conversionValue,
          conversionType: input.conversionType,
        },
      })

      return { id: click.id, converted: true }
    }),

  /**
   * Get available campaigns for filtering
   */
  getCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.db.dimLink.findMany({
      where: {
        utmCampaign: { not: null },
      },
      select: {
        utmCampaign: true,
      },
      distinct: ['utmCampaign'],
    })

    return campaigns.map((c) => c.utmCampaign).filter((c): c is string => c !== null)
  }),

  /**
   * Sync link stats from Short.io
   */
  syncLinkStats: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = createLinkTrackingClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Link tracking API not configured',
        })
      }

      const link = await ctx.db.dimLink.findUnique({
        where: { id: input.linkId },
      })

      if (!link || !link.externalId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Link not found or not synced with Short.io',
        })
      }

      try {
        const stats = await client.getLinkStats(link.externalId)

        await ctx.db.dimLink.update({
          where: { id: link.id },
          data: {
            totalClicks: stats.clicks,
            uniqueClicks: stats.uniqueClicks,
          },
        })

        return {
          synced: true,
          clicks: stats.clicks,
          uniqueClicks: stats.uniqueClicks,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync stats',
        })
      }
    }),
})
