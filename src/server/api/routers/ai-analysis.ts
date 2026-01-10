// AI Analysis tRPC Router

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import {
  getQuickInsights,
  analyzeContent,
  compareContent,
  getStrategicAdvice,
  generateNarrativeReport,
  getPostingRecommendations,
  type InsightsData,
  type ContentData,
} from '@/lib/ai'

export const aiAnalysisRouter = createTRPCRouter({
  // Get quick insights for Overview page (3-5 bullet points)
  getQuickInsights: publicProcedure
    .input(
      z.object({
        platform: z.enum(['facebook', 'instagram', 'all']).default('all'),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch insights data from database
      const platformFilter =
        input.platform === 'all'
          ? undefined
          : input.platform === 'facebook'
            ? 'FACEBOOK'
            : 'INSTAGRAM'

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Get daily insights
      const dailyInsights = await ctx.db.factAccountInsightsDaily.findMany({
        where: {
          date: {
            date: { gte: startDate },
          },
          ...(platformFilter && {
            account: {
              platform: { platform: platformFilter },
            },
          }),
        },
        include: {
          account: { include: { platform: true } },
          date: true,
        },
        orderBy: { date: { date: 'desc' } },
      })

      // Get top/bottom content
      const content = await ctx.db.dimContent.findMany({
        where: {
          publishedAt: { gte: startDate },
          ...(platformFilter && {
            account: {
              platform: { platform: platformFilter },
            },
          }),
        },
        include: {
          contentInsights: { take: 1, orderBy: { createdAt: 'desc' } },
          account: { include: { platform: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      })

      // Sort content by engagement
      const sortedContent = content.sort((a, b) => {
        const aEng =
          (a.contentInsights[0]?.likes ?? 0) +
          (a.contentInsights[0]?.comments ?? 0) +
          (a.contentInsights[0]?.shares ?? 0)
        const bEng =
          (b.contentInsights[0]?.likes ?? 0) +
          (b.contentInsights[0]?.comments ?? 0) +
          (b.contentInsights[0]?.shares ?? 0)
        return bEng - aEng
      })

      // Calculate metrics
      const totalReach = dailyInsights.reduce((sum, i) => sum + (i.pageReach ?? 0), 0)
      const totalEngagement = dailyInsights.reduce((sum, i) => sum + (i.pageEngagement ?? 0), 0)
      const latestFollowers = dailyInsights[0]?.pageFollows ?? 0

      // Calculate newFollowers from daily pageFollows delta (since pageFollowsNew is not populated)
      // Sort by date to get oldest and newest follower counts
      const sortedByDate = [...dailyInsights].sort(
        (a, b) => a.date.date.getTime() - b.date.date.getTime()
      )
      const oldestFollowers = sortedByDate.find((i) => i.pageFollows !== null)?.pageFollows ?? 0
      const newestFollowers =
        sortedByDate.reverse().find((i) => i.pageFollows !== null)?.pageFollows ?? 0
      const newFollowers = Math.max(0, newestFollowers - oldestFollowers)

      // Build insights data
      const insightsData: InsightsData = {
        platform: input.platform,
        days: input.days,
        metrics: {
          totalReach,
          totalEngagement,
          totalFollowers: latestFollowers,
          newFollowers,
          engagementRate: totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0,
        },
        dailyData: dailyInsights.map((i) => ({
          date: i.date.date.toISOString(),
          reach: i.pageReach ?? 0,
          engagement: i.pageEngagement ?? 0,
          followers: i.pageFollows ?? 0,
        })),
        topContent: sortedContent.slice(0, 5).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
          caption: c.message ?? undefined,
        })),
        bottomContent: sortedContent.slice(-5).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
          caption: c.message ?? undefined,
        })),
      }

      return getQuickInsights(insightsData)
    }),

  // Analyze a single piece of content
  analyzeContent: publicProcedure
    .input(z.object({ contentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const content = await ctx.db.dimContent.findUnique({
        where: { id: input.contentId },
        include: {
          contentInsights: { take: 1, orderBy: { createdAt: 'desc' } },
          account: { include: { platform: true } },
        },
      })

      if (!content) {
        throw new Error('Content not found')
      }

      const contentData: ContentData = {
        id: content.id,
        platform: content.account.platform.platform as 'FACEBOOK' | 'INSTAGRAM',
        contentType: content.contentType,
        caption: content.message ?? undefined,
        publishedAt: content.publishedAt.toISOString(),
        metrics: {
          likes: content.contentInsights[0]?.likes ?? 0,
          comments: content.contentInsights[0]?.comments ?? 0,
          shares: content.contentInsights[0]?.shares ?? 0,
          reach: content.contentInsights[0]?.reach ?? 0,
          impressions: content.contentInsights[0]?.impressions ?? 0,
        },
        hashtags: content.hashtags,
      }

      return analyzeContent(contentData)
    }),

  // Compare two pieces of content
  compareContent: publicProcedure
    .input(
      z.object({
        contentIds: z.array(z.string()).length(2),
      })
    )
    .query(async ({ ctx, input }) => {
      const contents = await ctx.db.dimContent.findMany({
        where: { id: { in: input.contentIds } },
        include: {
          contentInsights: { take: 1, orderBy: { createdAt: 'desc' } },
          account: { include: { platform: true } },
        },
      })

      if (contents.length !== 2) {
        throw new Error('Both content pieces must exist')
      }

      const toContentData = (c: (typeof contents)[0]): ContentData => ({
        id: c.id,
        platform: c.account.platform.platform as 'FACEBOOK' | 'INSTAGRAM',
        contentType: c.contentType,
        caption: c.message ?? undefined,
        publishedAt: c.publishedAt.toISOString(),
        metrics: {
          likes: c.contentInsights[0]?.likes ?? 0,
          comments: c.contentInsights[0]?.comments ?? 0,
          shares: c.contentInsights[0]?.shares ?? 0,
          reach: c.contentInsights[0]?.reach ?? 0,
          impressions: c.contentInsights[0]?.impressions ?? 0,
        },
        hashtags: c.hashtags,
      })

      return compareContent(toContentData(contents[0]!), toContentData(contents[1]!))
    }),

  // Get strategic advice
  getStrategicAdvice: publicProcedure
    .input(
      z.object({
        focus: z.enum(['growth', 'engagement', 'reach']).default('engagement'),
        platform: z.enum(['facebook', 'instagram', 'all']).default('all'),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      // Similar data fetching as getQuickInsights
      const platformFilter =
        input.platform === 'all'
          ? undefined
          : input.platform === 'facebook'
            ? 'FACEBOOK'
            : 'INSTAGRAM'

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      const dailyInsights = await ctx.db.factAccountInsightsDaily.findMany({
        where: {
          date: { date: { gte: startDate } },
          ...(platformFilter && {
            account: { platform: { platform: platformFilter } },
          }),
        },
        include: { account: { include: { platform: true } }, date: true },
        orderBy: { date: { date: 'desc' } },
      })

      const content = await ctx.db.dimContent.findMany({
        where: {
          publishedAt: { gte: startDate },
          ...(platformFilter && {
            account: { platform: { platform: platformFilter } },
          }),
        },
        include: {
          contentInsights: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      })

      const sortedContent = content.sort((a, b) => {
        const aEng =
          (a.contentInsights[0]?.likes ?? 0) +
          (a.contentInsights[0]?.comments ?? 0) +
          (a.contentInsights[0]?.shares ?? 0)
        const bEng =
          (b.contentInsights[0]?.likes ?? 0) +
          (b.contentInsights[0]?.comments ?? 0) +
          (b.contentInsights[0]?.shares ?? 0)
        return bEng - aEng
      })

      const totalReach = dailyInsights.reduce((sum, i) => sum + (i.pageReach ?? 0), 0)
      const totalEngagement = dailyInsights.reduce((sum, i) => sum + (i.pageEngagement ?? 0), 0)

      // Calculate newFollowers from daily pageFollows delta
      const sortedByDateForFollowers = [...dailyInsights].sort(
        (a, b) => a.date.date.getTime() - b.date.date.getTime()
      )
      const oldestFollowersStrategic =
        sortedByDateForFollowers.find((i) => i.pageFollows !== null)?.pageFollows ?? 0
      const newestFollowersStrategic =
        [...sortedByDateForFollowers].reverse().find((i) => i.pageFollows !== null)?.pageFollows ??
        0
      const newFollowersStrategic = Math.max(0, newestFollowersStrategic - oldestFollowersStrategic)

      const insightsData: InsightsData = {
        platform: input.platform,
        days: input.days,
        metrics: {
          totalReach,
          totalEngagement,
          totalFollowers: dailyInsights[0]?.pageFollows ?? 0,
          newFollowers: newFollowersStrategic,
          engagementRate: totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0,
        },
        dailyData: dailyInsights.map((i) => ({
          date: i.date.date.toISOString(),
          reach: i.pageReach ?? 0,
          engagement: i.pageEngagement ?? 0,
          followers: i.pageFollows ?? 0,
        })),
        topContent: sortedContent.slice(0, 5).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
        })),
        bottomContent: sortedContent.slice(-5).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
        })),
      }

      return getStrategicAdvice(insightsData, input.focus)
    }),

  // Generate narrative report
  generateNarrativeReport: publicProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2030),
        platform: z.enum(['facebook', 'instagram', 'all']).default('all'),
      })
    )
    .query(async ({ ctx, input }) => {
      const platformFilter =
        input.platform === 'all'
          ? undefined
          : input.platform === 'facebook'
            ? 'FACEBOOK'
            : 'INSTAGRAM'

      const startDate = new Date(input.year, input.month - 1, 1)
      const endDate = new Date(input.year, input.month, 0)

      const dailyInsights = await ctx.db.factAccountInsightsDaily.findMany({
        where: {
          date: { date: { gte: startDate, lte: endDate } },
          ...(platformFilter && {
            account: { platform: { platform: platformFilter } },
          }),
        },
        include: { account: { include: { platform: true } }, date: true },
        orderBy: { date: { date: 'desc' } },
      })

      const content = await ctx.db.dimContent.findMany({
        where: {
          publishedAt: { gte: startDate, lte: endDate },
          ...(platformFilter && {
            account: { platform: { platform: platformFilter } },
          }),
        },
        include: {
          contentInsights: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { publishedAt: 'desc' },
      })

      const sortedContent = content.sort((a, b) => {
        const aEng =
          (a.contentInsights[0]?.likes ?? 0) +
          (a.contentInsights[0]?.comments ?? 0) +
          (a.contentInsights[0]?.shares ?? 0)
        const bEng =
          (b.contentInsights[0]?.likes ?? 0) +
          (b.contentInsights[0]?.comments ?? 0) +
          (b.contentInsights[0]?.shares ?? 0)
        return bEng - aEng
      })

      const totalReach = dailyInsights.reduce((sum, i) => sum + (i.pageReach ?? 0), 0)
      const totalEngagement = dailyInsights.reduce((sum, i) => sum + (i.pageEngagement ?? 0), 0)

      // Calculate newFollowers from daily pageFollows delta
      const sortedByDateForReport = [...dailyInsights].sort(
        (a, b) => a.date.date.getTime() - b.date.date.getTime()
      )
      const oldestFollowersReport =
        sortedByDateForReport.find((i) => i.pageFollows !== null)?.pageFollows ?? 0
      const newestFollowersReport =
        [...sortedByDateForReport].reverse().find((i) => i.pageFollows !== null)?.pageFollows ?? 0
      const newFollowersReport = Math.max(0, newestFollowersReport - oldestFollowersReport)

      const insightsData: InsightsData = {
        platform: input.platform,
        days: endDate.getDate(),
        metrics: {
          totalReach,
          totalEngagement,
          totalFollowers: dailyInsights[0]?.pageFollows ?? 0,
          newFollowers: newFollowersReport,
          engagementRate: totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0,
        },
        dailyData: dailyInsights.map((i) => ({
          date: i.date.date.toISOString(),
          reach: i.pageReach ?? 0,
          engagement: i.pageEngagement ?? 0,
          followers: i.pageFollows ?? 0,
        })),
        topContent: sortedContent.slice(0, 5).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
        })),
        bottomContent: sortedContent.slice(-5).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
        })),
      }

      return generateNarrativeReport(insightsData, input.month, input.year)
    }),

  // Get optimal posting time recommendations
  getPostingRecommendations: publicProcedure
    .input(
      z.object({
        platform: z.enum(['facebook', 'instagram', 'all']).default('all'),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const platformFilter =
        input.platform === 'all'
          ? undefined
          : input.platform === 'facebook'
            ? 'FACEBOOK'
            : 'INSTAGRAM'

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Get daily insights for overall metrics
      const dailyInsights = await ctx.db.factAccountInsightsDaily.findMany({
        where: {
          date: { date: { gte: startDate } },
          ...(platformFilter && {
            account: { platform: { platform: platformFilter } },
          }),
        },
        include: { account: { include: { platform: true } }, date: true },
        orderBy: { date: { date: 'desc' } },
      })

      // Get content with more details
      const content = await ctx.db.dimContent.findMany({
        where: {
          publishedAt: { gte: startDate },
          ...(platformFilter && {
            account: { platform: { platform: platformFilter } },
          }),
        },
        include: {
          contentInsights: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      })

      const sortedContent = content.sort((a, b) => {
        const aEng =
          (a.contentInsights[0]?.likes ?? 0) +
          (a.contentInsights[0]?.comments ?? 0) +
          (a.contentInsights[0]?.shares ?? 0)
        const bEng =
          (b.contentInsights[0]?.likes ?? 0) +
          (b.contentInsights[0]?.comments ?? 0) +
          (b.contentInsights[0]?.shares ?? 0)
        return bEng - aEng
      })

      // Calculate overall metrics
      const totalReach = dailyInsights.reduce((sum, i) => sum + (i.pageReach ?? 0), 0)
      const totalEngagement = dailyInsights.reduce((sum, i) => sum + (i.pageEngagement ?? 0), 0)
      const latestFollowers = dailyInsights[0]?.pageFollows ?? 0

      // Calculate newFollowers from daily pageFollows delta
      const sortedByDateForRecommendations = [...dailyInsights].sort(
        (a, b) => a.date.date.getTime() - b.date.date.getTime()
      )
      const oldestFollowersRecommendations =
        sortedByDateForRecommendations.find((i) => i.pageFollows !== null)?.pageFollows ?? 0
      const newestFollowersRecommendations =
        [...sortedByDateForRecommendations].reverse().find((i) => i.pageFollows !== null)
          ?.pageFollows ?? 0
      const newFollowersRecommendations = Math.max(
        0,
        newestFollowersRecommendations - oldestFollowersRecommendations
      )

      const insightsData: InsightsData = {
        platform: input.platform,
        days: input.days,
        metrics: {
          totalReach,
          totalEngagement,
          totalFollowers: latestFollowers,
          newFollowers: newFollowersRecommendations,
          engagementRate: totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0,
        },
        dailyData: dailyInsights.map((i) => ({
          date: i.date.date.toISOString(),
          reach: i.pageReach ?? 0,
          engagement: i.pageEngagement ?? 0,
          followers: i.pageFollows ?? 0,
        })),
        topContent: sortedContent.slice(0, 10).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
          caption: c.message ?? undefined,
        })),
        bottomContent: sortedContent.slice(-10).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
          caption: c.message ?? undefined,
        })),
      }

      return getPostingRecommendations(insightsData)
    }),

  // ==========================================
  // SAVED REPORTS ENDPOINTS
  // ==========================================

  // Save an AI report
  saveReport: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        reportType: z.enum(['strategic', 'report', 'recommendations']),
        platform: z.enum(['facebook', 'instagram', 'all']),
        focusArea: z.enum(['growth', 'engagement', 'reach']).optional(),
        month: z.number().min(1).max(12).optional(),
        year: z.number().min(2020).max(2030).optional(),
        days: z.number().min(7).max(90).optional(),
        content: z.any(), // The AI response as JSON (Prisma Json type)
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null

      return ctx.db.savedAiReport.create({
        data: {
          title: input.title,
          reportType: input.reportType,
          platform: input.platform,
          focusArea: input.focusArea,
          month: input.month,
          year: input.year,
          days: input.days,
          content: input.content,
          notes: input.notes,
          createdByUserId: userId,
        },
      })
    }),

  // List saved reports with pagination
  listSavedReports: publicProcedure
    .input(
      z.object({
        reportType: z.enum(['strategic', 'report', 'recommendations']).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const [reports, total] = await Promise.all([
        ctx.db.savedAiReport.findMany({
          where: input.reportType ? { reportType: input.reportType } : undefined,
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
          select: {
            id: true,
            title: true,
            reportType: true,
            platform: true,
            focusArea: true,
            month: true,
            year: true,
            days: true,
            notes: true,
            content: true, // Include for PDF export
            createdAt: true,
            createdBy: { select: { name: true } },
          },
        }),
        ctx.db.savedAiReport.count({
          where: input.reportType ? { reportType: input.reportType } : undefined,
        }),
      ])

      return { reports, total }
    }),

  // Get a single saved report by ID
  getSavedReport: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.savedAiReport.findUnique({
        where: { id: input.id },
        include: { createdBy: { select: { name: true } } },
      })

      if (!report) {
        throw new Error('Report not found')
      }

      return report
    }),

  // Delete a saved report
  deleteSavedReport: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.savedAiReport.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})
