/**
 * Sentiment Router - AWS Comprehend Integration
 *
 * Provides sentiment analysis for social media comments.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import {
  createSentimentClientFromEnv,
  determineTrend,
  type SentimentLabel,
} from '@/lib/sentiment-api'
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

export const sentimentRouter = createTRPCRouter({
  /**
   * Get connection status for AWS Comprehend
   */
  getConnectionStatus: protectedProcedure.query(async () => {
    const client = createSentimentClientFromEnv()

    if (!client) {
      return {
        connected: false,
        error: 'AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not configured',
        region: process.env.AWS_REGION ?? 'not set',
      }
    }

    try {
      const isValid = await client.validateCredentials()
      return {
        connected: isValid,
        error: isValid ? null : 'Invalid AWS credentials',
        region: process.env.AWS_REGION ?? 'eu-west-1',
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        region: process.env.AWS_REGION ?? 'eu-west-1',
      }
    }
  }),

  /**
   * Analyze sentiment of a single text
   */
  analyzeText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        language: z.string().default('en'),
      })
    )
    .mutation(async ({ input }) => {
      const client = createSentimentClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Sentiment API not configured',
        })
      }

      try {
        const result = await client.detectSentiment(input.text, input.language)

        return {
          sentiment: result.sentiment,
          confidence: result.confidence,
          scores: result.scores,
          keyPhrases: result.keyPhrases,
          entities: result.entities,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze sentiment',
        })
      }
    }),

  /**
   * Analyze comments for a specific content
   */
  analyzeContentComments: protectedProcedure
    .input(
      z.object({
        contentId: z.string(),
        comments: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            authorName: z.string().optional(),
            commentedAt: z.date(),
          })
        ),
        language: z.string().default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = createSentimentClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Sentiment API not configured',
        })
      }

      let analyzed = 0
      let requiresResponseCount = 0

      for (const comment of input.comments) {
        try {
          // Check if already analyzed
          const existing = await ctx.db.factCommentSentiment.findUnique({
            where: { commentId: comment.id },
          })

          if (existing) {
            analyzed++
            continue
          }

          const result = await client.detectSentiment(comment.text, input.language)

          const needsResponse = result.sentiment === 'NEGATIVE' && result.confidence >= 0.7

          await ctx.db.factCommentSentiment.create({
            data: {
              contentId: input.contentId,
              commentId: comment.id,
              commentText: comment.text,
              commentAuthor: comment.authorName,
              commentedAt: comment.commentedAt,
              sentimentLabel: result.sentiment,
              sentimentScore: result.confidence,
              positiveScore: result.scores.positive,
              negativeScore: result.scores.negative,
              neutralScore: result.scores.neutral,
              mixedScore: result.scores.mixed,
              keyPhrases: result.keyPhrases,
              entities: result.entities,
              language: input.language,
              requiresResponse: needsResponse,
            },
          })

          analyzed++
          if (needsResponse) requiresResponseCount++
        } catch (error) {
          console.error(`Failed to analyze comment ${comment.id}:`, error)
        }
      }

      return {
        analyzed,
        total: input.comments.length,
        requiresResponse: requiresResponseCount,
      }
    }),

  /**
   * Get sentiment for a specific content
   */
  getContentSentiment: protectedProcedure
    .input(z.object({ contentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const comments = await ctx.db.factCommentSentiment.findMany({
        where: { contentId: input.contentId },
        orderBy: { commentedAt: 'desc' },
      })

      if (comments.length === 0) {
        return null
      }

      // Calculate aggregates
      const sentimentCounts = {
        POSITIVE: 0,
        NEGATIVE: 0,
        NEUTRAL: 0,
        MIXED: 0,
      }

      let totalScore = 0
      const allPhrases: string[] = []

      for (const c of comments) {
        sentimentCounts[c.sentimentLabel as SentimentLabel]++
        totalScore += (c.positiveScore ?? 0) - (c.negativeScore ?? 0)
        allPhrases.push(...c.keyPhrases)
      }

      // Get top phrases
      const phraseCount: Record<string, number> = {}
      for (const phrase of allPhrases) {
        phraseCount[phrase] = (phraseCount[phrase] ?? 0) + 1
      }
      const topPhrases = Object.entries(phraseCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([phrase]) => phrase)

      return {
        totalComments: comments.length,
        sentimentBreakdown: sentimentCounts,
        avgSentimentScore: totalScore / comments.length,
        topPhrases,
        requiresResponse: comments.filter((c) => c.requiresResponse).length,
        comments: comments.slice(0, 20).map((c) => ({
          id: c.id,
          text: c.commentText,
          sentiment: c.sentimentLabel,
          confidence: c.sentimentScore,
          keyPhrases: c.keyPhrases,
          requiresResponse: c.requiresResponse,
          responded: c.responded,
        })),
      }
    }),

  /**
   * Get daily sentiment trends
   */
  getSentimentTrends: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const dailySentiment = await ctx.db.aggSentimentDaily.findMany({
        where: {
          date: {
            date: { gte: cutoffDate },
          },
        },
        include: {
          date: {
            select: { date: true, dayName: true },
          },
        },
        orderBy: {
          date: { date: 'asc' },
        },
      })

      return dailySentiment.map((d) => ({
        date: d.date.date.toISOString().split('T')[0],
        dayName: d.date.dayName,
        totalComments: d.totalComments,
        positiveCount: d.positiveCount,
        negativeCount: d.negativeCount,
        neutralCount: d.neutralCount,
        mixedCount: d.mixedCount,
        avgSentimentScore: d.avgSentimentScore,
        trend: d.sentimentTrend,
      }))
    }),

  /**
   * Get comments requiring response
   */
  getAlertsRequiringResponse: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
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

      const comments = await ctx.db.factCommentSentiment.findMany({
        where,
        include: {
          content: {
            select: {
              id: true,
              message: true,
              permalinkUrl: true,
            },
          },
        },
        orderBy: { commentedAt: 'desc' },
        take: input.limit,
      })

      return comments.map((c) => ({
        id: c.id,
        commentId: c.commentId,
        text: c.commentText,
        author: c.commentAuthor,
        commentedAt: c.commentedAt,
        sentiment: c.sentimentLabel,
        confidence: c.sentimentScore,
        keyPhrases: c.keyPhrases,
        responded: c.responded,
        content: c.content,
      }))
    }),

  /**
   * Mark comment as responded
   */
  markAsResponded: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.factCommentSentiment.update({
        where: { commentId: input.commentId },
        data: { responded: true },
      })

      return { success: true }
    }),

  /**
   * Aggregate daily sentiment (run as scheduled job)
   */
  aggregateDailySentiment: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = input.date ?? new Date().toISOString().split('T')[0]!
      const dateId = await ensureDimDate(ctx.db, targetDate)

      const startOfDay = new Date(targetDate)
      const endOfDay = new Date(targetDate)
      endOfDay.setDate(endOfDay.getDate() + 1)

      // Get all comments for the day
      const comments = await ctx.db.factCommentSentiment.findMany({
        where: {
          commentedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      })

      if (comments.length === 0) {
        return { date: targetDate, aggregated: false, reason: 'No comments' }
      }

      // Calculate aggregates
      let positiveCount = 0
      let negativeCount = 0
      let neutralCount = 0
      let mixedCount = 0
      let totalScore = 0

      const positivePhrases: string[] = []
      const negativePhrases: string[] = []

      for (const c of comments) {
        switch (c.sentimentLabel) {
          case 'POSITIVE':
            positiveCount++
            positivePhrases.push(...c.keyPhrases)
            break
          case 'NEGATIVE':
            negativeCount++
            negativePhrases.push(...c.keyPhrases)
            break
          case 'NEUTRAL':
            neutralCount++
            break
          case 'MIXED':
            mixedCount++
            break
        }
        totalScore += (c.positiveScore ?? 0) - (c.negativeScore ?? 0)
      }

      const avgScore = totalScore / comments.length

      // Get previous day's score for trend
      const previousDay = new Date(targetDate)
      previousDay.setDate(previousDay.getDate() - 1)
      const previousAgg = await ctx.db.aggSentimentDaily.findFirst({
        where: {
          date: {
            date: previousDay,
          },
        },
      })

      const trend = previousAgg ? determineTrend(previousAgg.avgSentimentScore, avgScore) : 'stable'

      // Get top phrases
      const getTopPhrases = (phrases: string[], limit: number = 5) => {
        const counts: Record<string, number> = {}
        for (const p of phrases) {
          counts[p] = (counts[p] ?? 0) + 1
        }
        return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([phrase]) => phrase)
      }

      await ctx.db.aggSentimentDaily.upsert({
        where: { dateId },
        create: {
          dateId,
          totalComments: comments.length,
          positiveCount,
          negativeCount,
          neutralCount,
          mixedCount,
          avgSentimentScore: avgScore,
          sentimentTrend: trend,
          trendDelta: previousAgg ? avgScore - previousAgg.avgSentimentScore : null,
          topPositivePhrases: getTopPhrases(positivePhrases),
          topNegativePhrases: getTopPhrases(negativePhrases),
        },
        update: {
          totalComments: comments.length,
          positiveCount,
          negativeCount,
          neutralCount,
          mixedCount,
          avgSentimentScore: avgScore,
          sentimentTrend: trend,
          trendDelta: previousAgg ? avgScore - previousAgg.avgSentimentScore : null,
          topPositivePhrases: getTopPhrases(positivePhrases),
          topNegativePhrases: getTopPhrases(negativePhrases),
        },
      })

      return {
        date: targetDate,
        aggregated: true,
        totalComments: comments.length,
        avgScore,
        trend,
      }
    }),

  /**
   * Get sentiment summary statistics
   */
  getSentimentStats: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const comments = await ctx.db.factCommentSentiment.findMany({
        where: {
          commentedAt: { gte: cutoffDate },
        },
        select: {
          sentimentLabel: true,
          sentimentScore: true,
          positiveScore: true,
          negativeScore: true,
          requiresResponse: true,
          responded: true,
        },
      })

      if (comments.length === 0) {
        return null
      }

      const sentimentCounts = {
        POSITIVE: 0,
        NEGATIVE: 0,
        NEUTRAL: 0,
        MIXED: 0,
      }

      let totalScore = 0
      let requiresResponseCount = 0
      let respondedCount = 0

      for (const c of comments) {
        sentimentCounts[c.sentimentLabel as SentimentLabel]++
        totalScore += (c.positiveScore ?? 0) - (c.negativeScore ?? 0)
        if (c.requiresResponse) requiresResponseCount++
        if (c.responded) respondedCount++
      }

      return {
        totalComments: comments.length,
        sentimentBreakdown: sentimentCounts,
        avgSentimentScore: totalScore / comments.length,
        positiveRate: (sentimentCounts.POSITIVE / comments.length) * 100,
        negativeRate: (sentimentCounts.NEGATIVE / comments.length) * 100,
        alertsCount: requiresResponseCount,
        responseRate:
          requiresResponseCount > 0 ? (respondedCount / requiresResponseCount) * 100 : 100,
      }
    }),
})
