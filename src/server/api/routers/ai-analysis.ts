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
      const newFollowers = dailyInsights.reduce((sum, i) => sum + (i.pageFollowsNew ?? 0), 0)

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

      const insightsData: InsightsData = {
        platform: input.platform,
        days: input.days,
        metrics: {
          totalReach,
          totalEngagement,
          totalFollowers: dailyInsights[0]?.pageFollows ?? 0,
          newFollowers: dailyInsights.reduce((sum, i) => sum + (i.pageFollowsNew ?? 0), 0),
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

      const insightsData: InsightsData = {
        platform: input.platform,
        days: endDate.getDate(),
        metrics: {
          totalReach,
          totalEngagement,
          totalFollowers: dailyInsights[0]?.pageFollows ?? 0,
          newFollowers: dailyInsights.reduce((sum, i) => sum + (i.pageFollowsNew ?? 0), 0),
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

      const insightsData: InsightsData = {
        platform: input.platform,
        days: input.days,
        metrics: {
          totalReach: 0,
          totalEngagement: 0,
          totalFollowers: 0,
          newFollowers: 0,
          engagementRate: 0,
        },
        dailyData: [],
        topContent: sortedContent.slice(0, 10).map((c) => ({
          id: c.id,
          type: c.contentType,
          reach: c.contentInsights[0]?.reach ?? 0,
          engagement:
            (c.contentInsights[0]?.likes ?? 0) +
            (c.contentInsights[0]?.comments ?? 0) +
            (c.contentInsights[0]?.shares ?? 0),
        })),
        bottomContent: [],
      }

      return getPostingRecommendations(insightsData)
    }),
})
