/**
 * Social Listening Router - Brand24 API Integration
 *
 * Monitors brand mentions across social media, news, and web.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import {
  createSocialListeningClientFromEnv,
  shouldRequireResponse,
  calculateMentionPriority,
  calculateSentimentScore,
  type MentionSentiment,
  type SourceType,
} from '@/lib/social-listening'
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

const sourceTypeSchema = z.enum([
  'twitter',
  'facebook',
  'instagram',
  'youtube',
  'reddit',
  'news',
  'blog',
  'forum',
  'web',
  'tiktok',
  'podcast',
  'review',
])

const sentimentSchema = z.enum(['positive', 'negative', 'neutral'])

export const socialListeningRouter = createTRPCRouter({
  /**
   * Get connection status for Brand24 API
   */
  getConnectionStatus: protectedProcedure.query(async () => {
    const client = createSocialListeningClientFromEnv()

    if (!client) {
      return {
        connected: false,
        error: 'BRAND24_API_KEY or BRAND24_PROJECT_ID not configured',
        projectId: null,
      }
    }

    try {
      const isValid = await client.validateCredentials()
      return {
        connected: isValid,
        error: isValid ? null : 'Invalid API credentials',
        projectId: client.project,
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: client.project,
      }
    }
  }),

  /**
   * Sync mentions from Brand24 to database
   */
  syncMentions: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(30).default(7),
        sentiment: sentimentSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = createSocialListeningClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Social listening API not configured',
        })
      }

      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - input.days)

      try {
        const response = await client.getMentions({
          dateFrom,
          sentiment: input.sentiment,
          perPage: 100,
        })

        let synced = 0
        let skipped = 0

        for (const mention of response.data) {
          // Check if already exists
          const existing = await ctx.db.factBrandMention.findUnique({
            where: { externalId: mention.id },
          })

          if (existing) {
            skipped++
            continue
          }

          // Get or create date
          const dateStr = mention.date.split('T')[0]!
          const dateId = await ensureDimDate(ctx.db, dateStr)

          // Get or create source
          let source = await ctx.db.dimMentionSource.findFirst({
            where: {
              platform: mention.source,
              sourceUrl: mention.url,
            },
          })

          if (!source) {
            source = await ctx.db.dimMentionSource.create({
              data: {
                platform: mention.source,
                sourceUrl: mention.url,
                sourceName: mention.sourceTitle ?? mention.domain,
                followerCount: mention.authorFollowers,
              },
            })
          }

          // Create mention
          await ctx.db.factBrandMention.create({
            data: {
              sourceId: source.id,
              dateId,
              externalId: mention.id,
              mentionText: mention.description,
              mentionUrl: mention.url,
              authorName: mention.authorName,
              authorHandle: mention.authorUrl?.split('/').pop(),
              authorFollowers: mention.authorFollowers,
              mentionedAt: new Date(mention.date),
              sentiment: mention.sentiment,
              reach: mention.reach,
              engagement: mention.engagement,
              keywords: mention.keywords,
              isInfluencer: mention.isInfluencer,
              requiresResponse: shouldRequireResponse(mention),
            },
          })

          synced++
        }

        return {
          synced,
          skipped,
          total: response.meta.total,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync mentions',
        })
      }
    }),

  /**
   * Get stored mentions from database
   */
  getMentions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        sentiment: sentimentSchema.optional(),
        platform: sourceTypeSchema.optional(),
        isInfluencer: z.boolean().optional(),
        requiresResponse: z.boolean().optional(),
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const where: Record<string, unknown> = {
        mentionedAt: { gte: cutoffDate },
      }

      if (input.sentiment) {
        where.sentiment = input.sentiment
      }
      if (input.isInfluencer !== undefined) {
        where.isInfluencer = input.isInfluencer
      }
      if (input.requiresResponse !== undefined) {
        where.requiresResponse = input.requiresResponse
        if (input.requiresResponse) {
          where.responded = false
        }
      }
      if (input.platform) {
        where.source = { platform: input.platform }
      }

      const [mentions, total] = await Promise.all([
        ctx.db.factBrandMention.findMany({
          where,
          include: {
            source: {
              select: {
                platform: true,
                sourceName: true,
              },
            },
          },
          orderBy: { mentionedAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.factBrandMention.count({ where }),
      ])

      return {
        mentions: mentions.map((m) => ({
          id: m.id,
          externalId: m.externalId,
          platform: m.source.platform as SourceType,
          sourceName: m.source.sourceName,
          text: m.mentionText,
          url: m.mentionUrl,
          authorName: m.authorName,
          authorHandle: m.authorHandle,
          authorFollowers: m.authorFollowers,
          mentionedAt: m.mentionedAt,
          sentiment: m.sentiment as MentionSentiment,
          reach: m.reach,
          engagement: m.engagement,
          keywords: m.keywords,
          isInfluencer: m.isInfluencer,
          requiresResponse: m.requiresResponse,
          responded: m.responded,
          priority: calculateMentionPriority({
            id: m.externalId,
            url: m.mentionUrl ?? '',
            domain: '',
            description: m.mentionText,
            date: m.mentionedAt.toISOString(),
            source: m.source.platform as SourceType,
            sentiment: m.sentiment as MentionSentiment,
            reach: m.reach ?? undefined,
            engagement: m.engagement ?? undefined,
            isInfluencer: m.isInfluencer,
            keywords: m.keywords,
          }),
        })),
        total,
        hasMore: input.offset + mentions.length < total,
      }
    }),

  /**
   * Get mentions requiring response (alerts)
   */
  getAlerts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        includeResponded: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        requiresResponse: true,
      }

      if (!input.includeResponded) {
        where.responded = false
      }

      const mentions = await ctx.db.factBrandMention.findMany({
        where,
        include: {
          source: {
            select: {
              platform: true,
              sourceName: true,
            },
          },
        },
        orderBy: [{ isInfluencer: 'desc' }, { reach: 'desc' }, { mentionedAt: 'desc' }],
        take: input.limit,
      })

      return mentions.map((m) => ({
        id: m.id,
        platform: m.source.platform,
        sourceName: m.source.sourceName,
        text: m.mentionText,
        url: m.mentionUrl,
        authorName: m.authorName,
        authorFollowers: m.authorFollowers,
        mentionedAt: m.mentionedAt,
        sentiment: m.sentiment,
        reach: m.reach,
        isInfluencer: m.isInfluencer,
        responded: m.responded,
        priority: m.isInfluencer ? 'high' : (m.reach ?? 0) > 5000 ? 'high' : 'medium',
      }))
    }),

  /**
   * Get influencer mentions
   */
  getInfluencerMentions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const mentions = await ctx.db.factBrandMention.findMany({
        where: {
          isInfluencer: true,
          mentionedAt: { gte: cutoffDate },
        },
        include: {
          source: {
            select: {
              platform: true,
              sourceName: true,
            },
          },
        },
        orderBy: [{ authorFollowers: 'desc' }, { reach: 'desc' }],
        take: input.limit,
      })

      return mentions.map((m) => ({
        id: m.id,
        platform: m.source.platform,
        text: m.mentionText,
        url: m.mentionUrl,
        authorName: m.authorName,
        authorHandle: m.authorHandle,
        authorFollowers: m.authorFollowers,
        mentionedAt: m.mentionedAt,
        sentiment: m.sentiment,
        reach: m.reach,
        engagement: m.engagement,
      }))
    }),

  /**
   * Mark mention as responded
   */
  markAsResponded: protectedProcedure
    .input(
      z.object({
        mentionId: z.string(),
        responseUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.factBrandMention.update({
        where: { id: input.mentionId },
        data: {
          responded: true,
          responseUrl: input.responseUrl,
        },
      })

      return { success: true }
    }),

  /**
   * Get social listening summary/statistics
   */
  getSummary: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const mentions = await ctx.db.factBrandMention.findMany({
        where: {
          mentionedAt: { gte: cutoffDate },
        },
        include: {
          source: {
            select: { platform: true },
          },
        },
      })

      if (mentions.length === 0) {
        return null
      }

      // Calculate aggregates
      let totalReach = 0
      let totalEngagement = 0
      let positiveCount = 0
      let negativeCount = 0
      let neutralCount = 0
      let influencerCount = 0
      let alertsCount = 0

      const platformCounts: Record<string, number> = {}
      const keywordCounts: Record<string, number> = {}

      for (const m of mentions) {
        totalReach += m.reach ?? 0
        totalEngagement += m.engagement ?? 0

        if (m.sentiment === 'positive') positiveCount++
        else if (m.sentiment === 'negative') negativeCount++
        else neutralCount++

        if (m.isInfluencer) influencerCount++
        if (m.requiresResponse && !m.responded) alertsCount++

        const platform = m.source.platform
        platformCounts[platform] = (platformCounts[platform] ?? 0) + 1

        for (const kw of m.keywords) {
          keywordCounts[kw] = (keywordCounts[kw] ?? 0) + 1
        }
      }

      // Get top keywords
      const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }))

      return {
        period: {
          from: cutoffDate.toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0],
        },
        totalMentions: mentions.length,
        totalReach,
        totalEngagement,
        sentimentBreakdown: {
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount,
        },
        sentimentScore: calculateSentimentScore(positiveCount, negativeCount, mentions.length),
        platformBreakdown: platformCounts,
        topKeywords,
        influencerMentions: influencerCount,
        alertsCount,
      }
    }),

  /**
   * Get mentions by platform
   */
  getMentionsByPlatform: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const mentions = await ctx.db.factBrandMention.findMany({
        where: {
          mentionedAt: { gte: cutoffDate },
        },
        include: {
          source: {
            select: { platform: true },
          },
        },
      })

      const byPlatform: Record<
        string,
        {
          total: number
          positive: number
          negative: number
          neutral: number
          reach: number
          engagement: number
        }
      > = {}

      for (const m of mentions) {
        const platform = m.source.platform
        if (!byPlatform[platform]) {
          byPlatform[platform] = {
            total: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
            reach: 0,
            engagement: 0,
          }
        }

        byPlatform[platform]!.total++
        byPlatform[platform]!.reach += m.reach ?? 0
        byPlatform[platform]!.engagement += m.engagement ?? 0

        if (m.sentiment === 'positive') byPlatform[platform]!.positive++
        else if (m.sentiment === 'negative') byPlatform[platform]!.negative++
        else byPlatform[platform]!.neutral++
      }

      return Object.entries(byPlatform).map(([platform, stats]) => ({
        platform,
        ...stats,
        sentimentScore: calculateSentimentScore(stats.positive, stats.negative, stats.total),
      }))
    }),
})
