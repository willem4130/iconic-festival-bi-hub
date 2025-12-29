/**
 * Hashtags Router - RiteTag API Integration
 *
 * Provides hashtag analytics, trending detection, and recommendations.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import {
  createHashtagClientFromEnv,
  extractHashtags,
  normalizeHashtag,
  getHashtagRecommendation,
  type RiteTagColor,
} from '@/lib/hashtag-api'
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

export const hashtagsRouter = createTRPCRouter({
  /**
   * Get connection status for RiteTag API
   */
  getConnectionStatus: protectedProcedure.query(async () => {
    const client = createHashtagClientFromEnv()

    if (!client) {
      return {
        connected: false,
        error: 'RITETAG_API_KEY not configured',
      }
    }

    try {
      const isValid = await client.validateApiKey()
      return {
        connected: isValid,
        error: isValid ? null : 'Invalid API key',
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }),

  /**
   * Analyze hashtags and get trending status
   */
  analyzeHashtags: protectedProcedure
    .input(
      z.object({
        hashtags: z.array(z.string()).min(1).max(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = createHashtagClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Hashtag API not configured',
        })
      }

      try {
        const stats = await client.analyzeHashtags(input.hashtags)

        // Store/update hashtags in database
        for (const stat of stats) {
          const hashtag = normalizeHashtag(stat.tag)
          const hashtagClean = stat.tag.toLowerCase()

          await ctx.db.dimHashtag.upsert({
            where: { hashtag },
            create: {
              hashtag,
              hashtagClean,
              exposure: stat.exposure,
              retweets: stat.retweets,
              images: stat.images,
              links: stat.links,
              mentions: stat.mentions,
              color: stat.color,
            },
            update: {
              exposure: stat.exposure,
              retweets: stat.retweets,
              images: stat.images,
              links: stat.links,
              mentions: stat.mentions,
              color: stat.color,
            },
          })
        }

        return stats.map((stat) => ({
          hashtag: `#${stat.tag}`,
          exposure: stat.exposure,
          retweets: stat.retweets,
          color: stat.color,
          recommendation: stat.recommendation,
        }))
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze hashtags',
        })
      }
    }),

  /**
   * Get hashtag suggestions for text/caption
   */
  getSuggestions: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        maxSuggestions: z.number().min(1).max(30).default(10),
      })
    )
    .query(async ({ input }) => {
      const client = createHashtagClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Hashtag API not configured',
        })
      }

      try {
        const suggestions = await client.getSuggestionsForText(input.text)

        return suggestions.slice(0, input.maxSuggestions).map((s) => ({
          hashtag: `#${s.tag}`,
          exposure: s.exposure,
          retweets: s.retweets,
          color: s.color,
        }))
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get suggestions',
        })
      }
    }),

  /**
   * Check if hashtag is banned on Instagram
   */
  checkBanned: protectedProcedure
    .input(z.object({ hashtag: z.string() }))
    .query(async ({ input }) => {
      const client = createHashtagClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Hashtag API not configured',
        })
      }

      try {
        const isBanned = await client.isHashtagBanned(input.hashtag)
        return {
          hashtag: normalizeHashtag(input.hashtag),
          banned: isBanned,
          message: isBanned
            ? 'This hashtag is banned on Instagram - avoid using it'
            : 'This hashtag is safe to use',
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check hashtag',
        })
      }
    }),

  /**
   * Get trending hashtags from database (our usage data)
   */
  getTrendingHashtags: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        color: z.enum(['green', 'blue', 'red', 'grey']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}

      if (input.color) {
        where.color = input.color
      }

      const hashtags = await ctx.db.dimHashtag.findMany({
        where,
        orderBy: [{ exposure: 'desc' }, { timesUsed: 'desc' }],
        take: input.limit,
      })

      return hashtags.map((h) => ({
        id: h.id,
        hashtag: h.hashtag,
        exposure: h.exposure,
        color: h.color as RiteTagColor | null,
        timesUsed: h.timesUsed,
        avgEngagementRate: h.avgEngagementRate,
        recommendation: getHashtagRecommendation(
          h.color as RiteTagColor | null,
          h.avgEngagementRate
        ),
      }))
    }),

  /**
   * Get best performing hashtags based on our content data
   */
  getBestPerforming: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        minUsage: z.number().min(1).default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      const hashtags = await ctx.db.dimHashtag.findMany({
        where: {
          timesUsed: { gte: input.minUsage },
          avgEngagementRate: { not: null },
        },
        orderBy: {
          avgEngagementRate: 'desc',
        },
        take: input.limit,
      })

      return hashtags.map((h) => ({
        hashtag: h.hashtag,
        timesUsed: h.timesUsed,
        avgEngagementRate: h.avgEngagementRate,
        avgReach: h.avgReach,
        color: h.color,
        recommendation: getHashtagRecommendation(
          h.color as RiteTagColor | null,
          h.avgEngagementRate
        ),
      }))
    }),

  /**
   * Extract and analyze hashtags from caption
   */
  analyzeCaption: protectedProcedure
    .input(z.object({ caption: z.string() }))
    .query(async ({ input }) => {
      const client = createHashtagClientFromEnv()

      // Extract hashtags from caption
      const hashtags = extractHashtags(input.caption)

      if (hashtags.length === 0) {
        return {
          extractedHashtags: [],
          analysis: [],
          suggestions: [],
          warnings: [],
        }
      }

      const warnings: string[] = []

      // If client available, get stats
      let analysis: Array<{
        hashtag: string
        color: RiteTagColor | null
        exposure: number
        recommendation: string
      }> = []

      let suggestions: Array<{
        hashtag: string
        color: RiteTagColor
        exposure: number
      }> = []

      if (client) {
        try {
          // Check for banned hashtags
          for (const tag of hashtags) {
            const isBanned = await client.isHashtagBanned(tag)
            if (isBanned) {
              warnings.push(`${tag} is banned on Instagram - remove it!`)
            }
          }

          // Get stats for existing hashtags
          const stats = await client.analyzeHashtags(hashtags.map((h) => h.replace('#', '')))

          analysis = stats.map((s) => ({
            hashtag: `#${s.tag}`,
            color: s.color,
            exposure: s.exposure,
            recommendation: s.recommendation,
          }))

          // Get additional suggestions
          const captionWithoutHashtags = input.caption.replace(/#[a-zA-Z0-9_]+/g, '').trim()

          if (captionWithoutHashtags.length > 10) {
            const suggestedTags = await client.getSuggestionsForText(captionWithoutHashtags)
            suggestions = suggestedTags
              .filter((s) => !hashtags.includes(`#${s.tag.toLowerCase()}`))
              .slice(0, 5)
              .map((s) => ({
                hashtag: `#${s.tag}`,
                color: s.color,
                exposure: s.exposure,
              }))
          }
        } catch {
          // API failed, return what we can
        }
      }

      // Count overused hashtags
      const overusedCount = analysis.filter((a) => a.color === 'red').length
      if (overusedCount > 0) {
        warnings.push(`${overusedCount} overused hashtag(s) detected - consider replacing`)
      }

      // Warn if too many hashtags
      if (hashtags.length > 30) {
        warnings.push('Too many hashtags! Instagram allows max 30')
      } else if (hashtags.length > 15) {
        warnings.push('Consider using fewer hashtags (10-15 is optimal)')
      }

      return {
        extractedHashtags: hashtags,
        analysis,
        suggestions,
        warnings,
      }
    }),

  /**
   * Sync hashtag trends to database
   */
  syncHashtagTrends: protectedProcedure
    .input(
      z.object({
        hashtags: z.array(z.string()).min(1).max(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = createHashtagClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Hashtag API not configured',
        })
      }

      const today = new Date().toISOString().split('T')[0]!
      const dateId = await ensureDimDate(ctx.db, today)

      try {
        const stats = await client.getHashtagStats(input.hashtags)
        let synced = 0

        for (const stat of stats) {
          const hashtag = normalizeHashtag(stat.tag)

          // Ensure hashtag exists
          const dbHashtag = await ctx.db.dimHashtag.upsert({
            where: { hashtag },
            create: {
              hashtag,
              hashtagClean: stat.tag.toLowerCase(),
              exposure: stat.exposure,
              retweets: stat.retweets,
              images: stat.images,
              links: stat.links,
              mentions: stat.mentions,
              color: stat.color,
            },
            update: {
              exposure: stat.exposure,
              retweets: stat.retweets,
              images: stat.images,
              links: stat.links,
              mentions: stat.mentions,
              color: stat.color,
            },
          })

          // Store trend snapshot
          await ctx.db.factHashtagTrends.upsert({
            where: {
              hashtagId_dateId: {
                hashtagId: dbHashtag.id,
                dateId,
              },
            },
            create: {
              hashtagId: dbHashtag.id,
              dateId,
              exposure: stat.exposure,
              retweets: stat.retweets,
              links: stat.links,
              images: stat.images,
              mentions: stat.mentions,
              color: stat.color,
            },
            update: {
              exposure: stat.exposure,
              retweets: stat.retweets,
              links: stat.links,
              images: stat.images,
              mentions: stat.mentions,
              color: stat.color,
            },
          })

          synced++
        }

        return {
          synced,
          date: today,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync trends',
        })
      }
    }),

  /**
   * Link hashtags to content (after Meta sync)
   */
  linkHashtagsToContent: protectedProcedure
    .input(
      z.object({
        contentId: z.string(),
        hashtags: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let linked = 0

      for (let i = 0; i < input.hashtags.length; i++) {
        const tag = input.hashtags[i]!
        const hashtag = normalizeHashtag(tag)

        // Ensure hashtag exists
        const dbHashtag = await ctx.db.dimHashtag.upsert({
          where: { hashtag },
          create: {
            hashtag,
            hashtagClean: tag.replace(/^#/, '').toLowerCase(),
          },
          update: {
            timesUsed: { increment: 1 },
            lastUsedAt: new Date(),
          },
        })

        // Link to content
        await ctx.db.factContentHashtag.upsert({
          where: {
            contentId_hashtagId: {
              contentId: input.contentId,
              hashtagId: dbHashtag.id,
            },
          },
          create: {
            contentId: input.contentId,
            hashtagId: dbHashtag.id,
            position: i,
          },
          update: {
            position: i,
          },
        })

        linked++
      }

      return { linked }
    }),
})
