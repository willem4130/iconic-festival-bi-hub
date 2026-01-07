/**
 * Meta Insights tRPC Router
 *
 * Handles Facebook/Instagram insights data fetching and storage.
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import {
  createMetaClientFromEnv,
  getPageInfo,
  getPageInsightsForDays,
  getInstagramAccountInfo,
  getInstagramInsightsForDays,
  getInstagramMedia,
  getPagePosts,
  getCampaigns,
} from '@/lib/meta-api'
import type { PageInsightMetric, InstagramInsightMetric } from '@/lib/meta-api'

// ===========================================
// Input Schemas
// ===========================================

const dateRangeSchema = z.object({
  since: z.string().or(z.date()),
  until: z.string().or(z.date()),
})

const syncOptionsSchema = z.object({
  days: z.number().min(1).max(90).default(30),
})

// ===========================================
// Router
// ===========================================

export const metaInsightsRouter = createTRPCRouter({
  /**
   * Get API connection status
   */
  getConnectionStatus: publicProcedure.query(async () => {
    const client = createMetaClientFromEnv()

    if (!client) {
      return {
        connected: false,
        error: 'Meta API credentials not configured',
        pageId: null,
        instagramAccountId: null,
        adAccountId: null,
      }
    }

    try {
      // Check token validity
      const tokenStatus = await client.isTokenExpiring()

      return {
        connected: true,
        error: null,
        pageId: client.pageId ?? null,
        instagramAccountId: client.instagramAccountId ?? null,
        adAccountId: client.adAccountId ?? null,
        tokenExpiring: tokenStatus.isExpiring,
        tokenExpiresAt: tokenStatus.expiresAt?.toISOString() ?? null,
        tokenDaysRemaining: tokenStatus.daysRemaining,
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Meta API',
        pageId: null,
        instagramAccountId: null,
        adAccountId: null,
      }
    }
  }),

  /**
   * Get Facebook Page info
   */
  getPageInfo: publicProcedure.query(async () => {
    const client = createMetaClientFromEnv()
    if (!client) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Meta API not configured',
      })
    }

    try {
      const pageInfo = await getPageInfo(client)
      return pageInfo
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch page info',
      })
    }
  }),

  /**
   * Get Instagram account info
   */
  getInstagramInfo: publicProcedure.query(async () => {
    const client = createMetaClientFromEnv()
    if (!client) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Meta API not configured',
      })
    }

    try {
      const accountInfo = await getInstagramAccountInfo(client)
      return accountInfo
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch Instagram info',
      })
    }
  }),

  /**
   * Sync Facebook Page insights to database
   */
  syncPageInsights: publicProcedure.input(syncOptionsSchema).mutation(async ({ ctx, input }) => {
    const client = createMetaClientFromEnv()
    if (!client) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Meta API not configured',
      })
    }

    try {
      // Get page info first
      const pageInfo = await getPageInfo(client)

      // Ensure platform exists
      const platform = await ctx.db.dimPlatform.upsert({
        where: { platform: 'FACEBOOK' },
        create: {
          platform: 'FACEBOOK',
          displayName: 'Facebook',
          apiVersion: client.apiVersion,
        },
        update: {
          apiVersion: client.apiVersion,
        },
      })

      // Ensure account exists
      const account = await ctx.db.dimAccount.upsert({
        where: {
          platformId_externalId: {
            platformId: platform.id,
            externalId: pageInfo.id,
          },
        },
        create: {
          externalId: pageInfo.id,
          platformId: platform.id,
          accountType: 'PAGE',
          name: pageInfo.name,
          username: pageInfo.username,
          profilePictureUrl: pageInfo.profilePictureUrl,
          linkedFacebookPageId: null,
          isActive: true,
        },
        update: {
          name: pageInfo.name,
          username: pageInfo.username,
          profilePictureUrl: pageInfo.profilePictureUrl,
          lastSyncAt: new Date(),
        },
      })

      // Fetch insights
      const insights = await getPageInsightsForDays(client, input.days)

      // Process and store insights
      const storedCount = await storePageInsights(ctx.db, account.id, insights)

      return {
        success: true,
        accountId: account.id,
        insightsStored: storedCount,
        syncedAt: new Date().toISOString(),
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to sync page insights',
      })
    }
  }),

  /**
   * Sync Instagram insights to database
   */
  syncInstagramInsights: publicProcedure
    .input(syncOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      const client = createMetaClientFromEnv()
      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Meta API not configured',
        })
      }

      try {
        // Get account info
        const accountInfo = await getInstagramAccountInfo(client)

        // Ensure platform exists
        const platform = await ctx.db.dimPlatform.upsert({
          where: { platform: 'INSTAGRAM' },
          create: {
            platform: 'INSTAGRAM',
            displayName: 'Instagram',
            apiVersion: client.apiVersion,
          },
          update: {
            apiVersion: client.apiVersion,
          },
        })

        // Ensure account exists
        const account = await ctx.db.dimAccount.upsert({
          where: {
            platformId_externalId: {
              platformId: platform.id,
              externalId: accountInfo.id,
            },
          },
          create: {
            externalId: accountInfo.id,
            platformId: platform.id,
            accountType: 'BUSINESS',
            name: accountInfo.name ?? accountInfo.username,
            username: accountInfo.username,
            profilePictureUrl: accountInfo.profilePictureUrl,
            linkedFacebookPageId: client.pageId,
            isActive: true,
          },
          update: {
            name: accountInfo.name ?? accountInfo.username,
            username: accountInfo.username,
            profilePictureUrl: accountInfo.profilePictureUrl,
            lastSyncAt: new Date(),
          },
        })

        // Fetch insights
        const insights = await getInstagramInsightsForDays(client, input.days)

        // Process and store insights
        const storedCount = await storeInstagramInsights(ctx.db, account.id, insights)

        return {
          success: true,
          accountId: account.id,
          insightsStored: storedCount,
          syncedAt: new Date().toISOString(),
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync Instagram insights',
        })
      }
    }),

  /**
   * Sync content (posts, media) to database
   */
  syncContent: publicProcedure
    .input(
      z.object({
        platform: z.enum(['FACEBOOK', 'INSTAGRAM']),
        limit: z.number().min(1).max(100).default(25),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = createMetaClientFromEnv()
      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Meta API not configured',
        })
      }

      try {
        if (input.platform === 'FACEBOOK') {
          const posts = await getPagePosts(client, { limit: input.limit })
          const storedCount = await storeFacebookPosts(ctx.db, client.pageId!, posts)
          return { success: true, contentStored: storedCount }
        } else {
          const media = await getInstagramMedia(client, { limit: input.limit })
          const storedCount = await storeInstagramMedia(ctx.db, client.instagramAccountId!, media)
          return { success: true, contentStored: storedCount }
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync content',
        })
      }
    }),

  /**
   * Get stored insights for a date range
   */
  getStoredInsights: publicProcedure
    .input(
      z.object({
        platform: z.enum(['FACEBOOK', 'INSTAGRAM']).optional(),
        dateRange: dateRangeSchema.optional(),
        limit: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}

      if (input.platform) {
        const platform = await ctx.db.dimPlatform.findUnique({
          where: { platform: input.platform },
        })
        if (platform) {
          where.account = { platformId: platform.id }
        }
      }

      const insights = await ctx.db.factAccountInsightsDaily.findMany({
        where,
        include: {
          account: {
            include: {
              platform: true,
            },
          },
          date: true,
        },
        orderBy: {
          date: {
            date: 'desc',
          },
        },
        take: input.limit,
      })

      return insights
    }),

  /**
   * Get stored content with insights
   */
  getStoredContent: publicProcedure
    .input(
      z.object({
        platform: z.enum(['FACEBOOK', 'INSTAGRAM']).optional(),
        contentType: z
          .enum(['POST', 'STORY', 'REEL', 'LIVE', 'PHOTO', 'VIDEO', 'LINK', 'STATUS', 'CAROUSEL'])
          .optional(),
        limit: z.number().min(1).max(100).default(25),
        orderBy: z.enum(['publishedAt', 'engagementRate', 'reach']).default('publishedAt'),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}

      if (input.contentType) {
        where.contentType = input.contentType
      }

      if (input.platform) {
        const platform = await ctx.db.dimPlatform.findUnique({
          where: { platform: input.platform },
        })
        if (platform) {
          where.account = { platformId: platform.id }
        }
      }

      const content = await ctx.db.dimContent.findMany({
        where,
        include: {
          account: {
            include: {
              platform: true,
            },
          },
          contentInsights: {
            orderBy: {
              snapshotAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy:
          input.orderBy === 'publishedAt'
            ? { publishedAt: 'desc' }
            : input.orderBy === 'engagementRate'
              ? { contentInsights: { _count: 'desc' } }
              : { contentInsights: { _count: 'desc' } },
        take: input.limit,
      })

      return content
    }),

  /**
   * Get content for calendar view
   */
  getContentCalendar: publicProcedure
    .input(
      z.object({
        year: z.number().min(2020).max(2030),
        month: z.number().min(1).max(12),
        platform: z.enum(['FACEBOOK', 'INSTAGRAM']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Calculate date range for the month
      const startDate = new Date(input.year, input.month - 1, 1)
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59)

      const where: Record<string, unknown> = {
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
      }

      if (input.platform) {
        const platform = await ctx.db.dimPlatform.findUnique({
          where: { platform: input.platform },
        })
        if (platform) {
          where.account = { platformId: platform.id }
        }
      }

      const content = await ctx.db.dimContent.findMany({
        where,
        include: {
          account: {
            include: {
              platform: true,
            },
          },
          contentInsights: {
            orderBy: {
              snapshotAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          publishedAt: 'asc',
        },
      })

      // Group content by day
      const contentByDay = new Map<
        string,
        Array<{
          id: string
          contentType: string
          message: string | null
          mediaUrl: string | null
          thumbnailUrl: string | null
          platform: string
          publishedAt: Date
          reach: number | null
          engagement: number
        }>
      >()

      for (const item of content) {
        const dateKey = item.publishedAt.toISOString().split('T')[0]!
        if (!contentByDay.has(dateKey)) {
          contentByDay.set(dateKey, [])
        }

        const insights = item.contentInsights[0]
        contentByDay.get(dateKey)!.push({
          id: item.id,
          contentType: item.contentType,
          message: item.message,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          platform: item.account.platform.platform,
          publishedAt: item.publishedAt,
          reach: insights?.reach ?? null,
          engagement: (insights?.likes ?? 0) + (insights?.comments ?? 0) + (insights?.shares ?? 0),
        })
      }

      // Convert to array format
      const calendar = Array.from(contentByDay.entries()).map(([date, items]) => ({
        date,
        items,
        count: items.length,
        totalEngagement: items.reduce((sum, i) => sum + i.engagement, 0),
      }))

      return {
        year: input.year,
        month: input.month,
        calendar,
        totalPosts: content.length,
        facebookPosts: content.filter((c) => c.account.platform.platform === 'FACEBOOK').length,
        instagramPosts: content.filter((c) => c.account.platform.platform === 'INSTAGRAM').length,
      }
    }),

  /**
   * Get platform comparison data (FB vs IG side-by-side)
   */
  getPlatformComparison: publicProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get both platforms
      const [facebookPlatform, instagramPlatform] = await Promise.all([
        ctx.db.dimPlatform.findUnique({ where: { platform: 'FACEBOOK' } }),
        ctx.db.dimPlatform.findUnique({ where: { platform: 'INSTAGRAM' } }),
      ])

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Fetch insights for each platform
      const [facebookInsights, instagramInsights] = await Promise.all([
        facebookPlatform
          ? ctx.db.factAccountInsightsDaily.findMany({
              where: {
                account: { platformId: facebookPlatform.id },
                date: {
                  date: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
              include: {
                account: true,
                date: true,
              },
              orderBy: { date: { date: 'asc' } },
            })
          : [],
        instagramPlatform
          ? ctx.db.factAccountInsightsDaily.findMany({
              where: {
                account: { platformId: instagramPlatform.id },
                date: {
                  date: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
              include: {
                account: true,
                date: true,
              },
              orderBy: { date: { date: 'asc' } },
            })
          : [],
      ])

      // Get content counts by platform
      const [facebookContent, instagramContent] = await Promise.all([
        facebookPlatform
          ? ctx.db.dimContent.count({
              where: {
                account: { platformId: facebookPlatform.id },
                publishedAt: { gte: startDate, lte: endDate },
              },
            })
          : 0,
        instagramPlatform
          ? ctx.db.dimContent.count({
              where: {
                account: { platformId: instagramPlatform.id },
                publishedAt: { gte: startDate, lte: endDate },
              },
            })
          : 0,
      ])

      // Calculate summary metrics for each platform
      const calculateSummary = (
        insights: typeof facebookInsights
      ): {
        totalReach: number
        totalEngagement: number
        totalImpressions: number
        avgFollowers: number
        latestFollowers: number
        newFollowers: number
        dailyData: Array<{
          date: string
          reach: number
          engagement: number
          impressions: number
          followers: number
        }>
      } => {
        if (!insights.length) {
          return {
            totalReach: 0,
            totalEngagement: 0,
            totalImpressions: 0,
            avgFollowers: 0,
            latestFollowers: 0,
            newFollowers: 0,
            dailyData: [],
          }
        }

        const totalReach = insights.reduce((sum, i) => sum + (i.pageReach ?? 0), 0)
        const totalEngagement = insights.reduce((sum, i) => sum + (i.pageEngagement ?? 0), 0)
        const totalImpressions = insights.reduce(
          (sum, i) => sum + (i.pageImpressions ?? i.pageViews ?? 0),
          0
        )
        const newFollowers = insights.reduce((sum, i) => sum + (i.pageFollowsNew ?? 0), 0)
        const latestFollowers = insights[insights.length - 1]?.pageFollows ?? 0
        const avgFollowers = Math.round(
          insights.reduce((sum, i) => sum + (i.pageFollows ?? 0), 0) / insights.length
        )

        const dailyData = insights.map((i) => ({
          date: new Date(i.date.date).toISOString().split('T')[0]!,
          reach: i.pageReach ?? 0,
          engagement: i.pageEngagement ?? 0,
          impressions: i.pageImpressions ?? i.pageViews ?? 0,
          followers: i.pageFollows ?? 0,
        }))

        return {
          totalReach,
          totalEngagement,
          totalImpressions,
          avgFollowers,
          latestFollowers,
          newFollowers,
          dailyData,
        }
      }

      return {
        facebook: {
          connected: !!facebookPlatform,
          summary: calculateSummary(facebookInsights),
          contentCount: facebookContent,
        },
        instagram: {
          connected: !!instagramPlatform,
          summary: calculateSummary(instagramInsights),
          contentCount: instagramContent,
        },
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: input.days,
        },
      }
    }),

  /**
   * Get ad campaigns overview
   */
  getAdCampaigns: publicProcedure
    .input(
      z.object({
        status: z.enum(['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']).optional(),
        limit: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}

      if (input.status) {
        where.status = input.status
      }

      const campaigns = await ctx.db.dimAdCampaign.findMany({
        where,
        include: {
          adSets: {
            include: {
              ads: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
      })

      return campaigns
    }),

  /**
   * Get weather correlation data
   */
  getWeatherCorrelation: publicProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(90),
      })
    )
    .query(async ({ ctx, input }) => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Get account insights with date
      const insights = await ctx.db.factAccountInsightsDaily.findMany({
        where: {
          date: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        include: {
          date: true,
        },
        orderBy: {
          date: { date: 'asc' },
        },
      })

      // Get weather data for the same period
      const weatherData = await ctx.db.factWeatherDaily.findMany({
        where: {
          date: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        include: {
          date: true,
        },
        orderBy: {
          date: { date: 'asc' },
        },
      })

      // Create maps for lookup
      const insightsByDate = new Map<
        string,
        { engagement: number; reach: number; followers: number }
      >()
      for (const insight of insights) {
        const dateKey = insight.date.date.toISOString().split('T')[0]!
        const existing = insightsByDate.get(dateKey) ?? { engagement: 0, reach: 0, followers: 0 }
        existing.engagement += insight.pageEngagement ?? 0
        existing.reach += insight.pageReach ?? 0
        existing.followers = Math.max(existing.followers, insight.pageFollows ?? 0)
        insightsByDate.set(dateKey, existing)
      }

      // Correlate weather with engagement
      const correlationData: Array<{
        date: string
        weatherMain: string
        temperature: number
        engagement: number
        reach: number
        rain: number
      }> = []

      // Group by weather type
      const weatherGroups = new Map<
        string,
        { totalEngagement: number; totalReach: number; count: number; avgTemp: number }
      >()

      // Temperature range buckets
      const tempBuckets = new Map<string, { totalEngagement: number; count: number }>()

      for (const weather of weatherData) {
        const dateKey = weather.date.date.toISOString().split('T')[0]!
        const insight = insightsByDate.get(dateKey)

        if (insight && weather.weatherMain) {
          correlationData.push({
            date: dateKey,
            weatherMain: weather.weatherMain,
            temperature: weather.tempAvg ?? 0,
            engagement: insight.engagement,
            reach: insight.reach,
            rain: weather.rain ?? 0,
          })

          // Update weather groups
          const group = weatherGroups.get(weather.weatherMain) ?? {
            totalEngagement: 0,
            totalReach: 0,
            count: 0,
            avgTemp: 0,
          }
          group.totalEngagement += insight.engagement
          group.totalReach += insight.reach
          group.count += 1
          group.avgTemp += weather.tempAvg ?? 0
          weatherGroups.set(weather.weatherMain, group)

          // Update temperature buckets
          const temp = weather.tempAvg ?? 0
          let bucket: string
          if (temp < 0) bucket = 'Below 0°C'
          else if (temp < 10) bucket = '0-10°C'
          else if (temp < 15) bucket = '10-15°C'
          else if (temp < 20) bucket = '15-20°C'
          else if (temp < 25) bucket = '20-25°C'
          else bucket = 'Above 25°C'

          const tempGroup = tempBuckets.get(bucket) ?? { totalEngagement: 0, count: 0 }
          tempGroup.totalEngagement += insight.engagement
          tempGroup.count += 1
          tempBuckets.set(bucket, tempGroup)
        }
      }

      // Calculate averages
      const weatherSummary = Array.from(weatherGroups.entries()).map(([weather, data]) => ({
        weather,
        avgEngagement: Math.round(data.totalEngagement / data.count),
        avgReach: Math.round(data.totalReach / data.count),
        avgTemp: Math.round((data.avgTemp / data.count) * 10) / 10,
        days: data.count,
      }))

      const temperatureSummary = Array.from(tempBuckets.entries())
        .map(([range, data]) => ({
          range,
          avgEngagement: Math.round(data.totalEngagement / data.count),
          days: data.count,
        }))
        .sort((a, b) => {
          const order = ['Below 0°C', '0-10°C', '10-15°C', '15-20°C', '20-25°C', 'Above 25°C']
          return order.indexOf(a.range) - order.indexOf(b.range)
        })

      // Calculate rain impact
      const rainyDays = correlationData.filter((d) => d.rain > 0)
      const dryDays = correlationData.filter((d) => d.rain === 0)
      const rainImpact = {
        rainyDaysCount: rainyDays.length,
        dryDaysCount: dryDays.length,
        rainyDaysAvgEngagement:
          rainyDays.length > 0
            ? Math.round(rainyDays.reduce((sum, d) => sum + d.engagement, 0) / rainyDays.length)
            : 0,
        dryDaysAvgEngagement:
          dryDays.length > 0
            ? Math.round(dryDays.reduce((sum, d) => sum + d.engagement, 0) / dryDays.length)
            : 0,
      }

      return {
        correlationData,
        weatherSummary: weatherSummary.sort((a, b) => b.avgEngagement - a.avgEngagement),
        temperatureSummary,
        rainImpact,
        hasData: correlationData.length > 0,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: input.days,
        },
      }
    }),

  /**
   * Get ad performance dashboard data
   */
  getAdPerformance: publicProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
        campaignId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Get campaigns with their ads and insights
      const campaigns = await ctx.db.dimAdCampaign.findMany({
        where: input.campaignId ? { id: input.campaignId } : undefined,
        include: {
          adSets: {
            include: {
              ads: {
                include: {
                  adInsights: {
                    where: {
                      date: {
                        date: {
                          gte: startDate,
                          lte: endDate,
                        },
                      },
                    },
                    include: {
                      date: true,
                    },
                    orderBy: {
                      date: { date: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      })

      // Aggregate metrics
      let totalSpend = 0
      let totalImpressions = 0
      let totalReach = 0
      let totalClicks = 0
      let totalConversions = 0
      let totalConversionValue = 0

      const dailyData = new Map<
        string,
        {
          date: string
          spend: number
          impressions: number
          reach: number
          clicks: number
          conversions: number
          conversionValue: number
        }
      >()

      const campaignPerformance: Array<{
        id: string
        name: string
        objective: string
        status: string
        spend: number
        impressions: number
        reach: number
        clicks: number
        conversions: number
        ctr: number
        cpc: number
        roas: number
      }> = []

      for (const campaign of campaigns) {
        let campaignSpend = 0
        let campaignImpressions = 0
        let campaignReach = 0
        let campaignClicks = 0
        let campaignConversions = 0
        let campaignConversionValue = 0

        for (const adSet of campaign.adSets) {
          for (const ad of adSet.ads) {
            for (const insight of ad.adInsights) {
              const dateStr = insight.date.date.toISOString().split('T')[0]!

              // Update daily aggregates
              if (!dailyData.has(dateStr)) {
                dailyData.set(dateStr, {
                  date: dateStr,
                  spend: 0,
                  impressions: 0,
                  reach: 0,
                  clicks: 0,
                  conversions: 0,
                  conversionValue: 0,
                })
              }
              const day = dailyData.get(dateStr)!
              day.spend += insight.spend
              day.impressions += insight.impressions
              day.reach += insight.reach
              day.clicks += insight.clicks
              day.conversions += insight.conversions
              day.conversionValue += insight.conversionValue

              // Update campaign aggregates
              campaignSpend += insight.spend
              campaignImpressions += insight.impressions
              campaignReach += insight.reach
              campaignClicks += insight.clicks
              campaignConversions += insight.conversions
              campaignConversionValue += insight.conversionValue
            }
          }
        }

        totalSpend += campaignSpend
        totalImpressions += campaignImpressions
        totalReach += campaignReach
        totalClicks += campaignClicks
        totalConversions += campaignConversions
        totalConversionValue += campaignConversionValue

        campaignPerformance.push({
          id: campaign.id,
          name: campaign.name,
          objective: campaign.objective,
          status: campaign.status,
          spend: campaignSpend,
          impressions: campaignImpressions,
          reach: campaignReach,
          clicks: campaignClicks,
          conversions: campaignConversions,
          ctr: campaignImpressions > 0 ? (campaignClicks / campaignImpressions) * 100 : 0,
          cpc: campaignClicks > 0 ? campaignSpend / campaignClicks : 0,
          roas: campaignSpend > 0 ? campaignConversionValue / campaignSpend : 0,
        })
      }

      // Sort daily data by date
      const sortedDailyData = Array.from(dailyData.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      return {
        summary: {
          totalSpend: totalSpend / 100, // Convert cents to currency
          totalImpressions,
          totalReach,
          totalClicks,
          totalConversions,
          totalConversionValue: totalConversionValue / 100,
          avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          avgCpc: totalClicks > 0 ? totalSpend / 100 / totalClicks : 0,
          avgCpm: totalImpressions > 0 ? (totalSpend / 100 / totalImpressions) * 1000 : 0,
          roas: totalSpend > 0 ? totalConversionValue / totalSpend : 0,
        },
        dailyData: sortedDailyData.map((d) => ({
          ...d,
          spend: d.spend / 100,
          conversionValue: d.conversionValue / 100,
        })),
        campaigns: campaignPerformance.map((c) => ({
          ...c,
          spend: c.spend / 100,
          cpc: c.cpc / 100,
        })),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: input.days,
        },
      }
    }),

  /**
   * Sync ad campaigns from Meta
   */
  syncAdCampaigns: publicProcedure.mutation(async ({ ctx }) => {
    const client = createMetaClientFromEnv()
    if (!client || !client.adAccountId) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Meta Ads API not configured',
      })
    }

    try {
      const campaigns = await getCampaigns(client)

      // Get or create account for ads
      const platform = await ctx.db.dimPlatform.upsert({
        where: { platform: 'FACEBOOK' },
        create: {
          platform: 'FACEBOOK',
          displayName: 'Facebook',
          apiVersion: client.apiVersion,
        },
        update: {},
      })

      const pageInfo = await getPageInfo(client)

      const account = await ctx.db.dimAccount.upsert({
        where: {
          platformId_externalId: {
            platformId: platform.id,
            externalId: pageInfo.id,
          },
        },
        create: {
          externalId: pageInfo.id,
          platformId: platform.id,
          accountType: 'PAGE',
          name: pageInfo.name,
          isActive: true,
        },
        update: {},
      })

      let storedCount = 0

      for (const campaign of campaigns) {
        await ctx.db.dimAdCampaign.upsert({
          where: {
            accountId_externalId: {
              accountId: account.id,
              externalId: campaign.id,
            },
          },
          create: {
            externalId: campaign.id,
            accountId: account.id,
            name: campaign.name,
            objective: mapObjective(campaign.objective),
            status: mapAdStatus(campaign.status),
            dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
            lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null,
            startTime: campaign.start_time ? new Date(campaign.start_time) : null,
            stopTime: campaign.stop_time ? new Date(campaign.stop_time) : null,
          },
          update: {
            name: campaign.name,
            status: mapAdStatus(campaign.status),
            dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
            lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null,
            stopTime: campaign.stop_time ? new Date(campaign.stop_time) : null,
          },
        })
        storedCount++
      }

      return {
        success: true,
        campaignsStored: storedCount,
        syncedAt: new Date().toISOString(),
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to sync ad campaigns',
      })
    }
  }),
})

// ===========================================
// Helper Functions
// ===========================================

import type { PrismaClient, Prisma } from '@prisma/client'

type DbClient = PrismaClient

async function storePageInsights(
  db: DbClient,
  accountId: string,
  insights: PageInsightMetric[]
): Promise<number> {
  let count = 0

  // Group by date
  const insightsByDate = new Map<string, Map<string, number>>()

  for (const metric of insights) {
    for (const value of metric.values) {
      const dateStr = value.end_time.split('T')[0] ?? value.end_time
      if (!insightsByDate.has(dateStr)) {
        insightsByDate.set(dateStr, new Map())
      }
      insightsByDate.get(dateStr)!.set(metric.name, value.value)
    }
  }

  // Store each day's insights
  for (const [dateStr, metrics] of insightsByDate) {
    const date = new Date(dateStr)

    // Ensure date dimension exists
    const dimDate = await db.dimDate.upsert({
      where: { date },
      create: createDateDimension(date),
      update: {},
    })

    // Store insights
    await db.factAccountInsightsDaily.upsert({
      where: {
        accountId_dateId: {
          accountId,
          dateId: dimDate.id,
        },
      },
      create: {
        accountId,
        dateId: dimDate.id,
        pageViews: metrics.get('page_impressions') ?? null,
        pageFollows: metrics.get('page_fans') ?? null,
        pageFollowsNew: metrics.get('page_fan_adds') ?? null,
        pageUnfollows: metrics.get('page_fan_removes') ?? null,
        pageEngagement: metrics.get('page_post_engagements') ?? null,
        pageReach: metrics.get('page_impressions_unique') ?? null,
        videoViews: metrics.get('page_video_views') ?? null,
      },
      update: {
        pageViews: metrics.get('page_impressions') ?? null,
        pageFollows: metrics.get('page_fans') ?? null,
        pageFollowsNew: metrics.get('page_fan_adds') ?? null,
        pageUnfollows: metrics.get('page_fan_removes') ?? null,
        pageEngagement: metrics.get('page_post_engagements') ?? null,
        pageReach: metrics.get('page_impressions_unique') ?? null,
        videoViews: metrics.get('page_video_views') ?? null,
      },
    })

    count++
  }

  return count
}

async function storeInstagramInsights(
  db: DbClient,
  accountId: string,
  insights: InstagramInsightMetric[]
): Promise<number> {
  let count = 0

  // Group by date
  const insightsByDate = new Map<string, Map<string, number>>()

  for (const metric of insights) {
    for (const value of metric.values) {
      if (!value.end_time || typeof value.value !== 'number') continue
      const dateStr = value.end_time.split('T')[0] ?? value.end_time
      if (!insightsByDate.has(dateStr)) {
        insightsByDate.set(dateStr, new Map())
      }
      insightsByDate.get(dateStr)!.set(metric.name, value.value)
    }
  }

  // Store each day's insights
  for (const [dateStr, metrics] of insightsByDate) {
    const date = new Date(dateStr)

    // Ensure date dimension exists
    const dimDate = await db.dimDate.upsert({
      where: { date },
      create: createDateDimension(date),
      update: {},
    })

    // Store insights
    await db.factAccountInsightsDaily.upsert({
      where: {
        accountId_dateId: {
          accountId,
          dateId: dimDate.id,
        },
      },
      create: {
        accountId,
        dateId: dimDate.id,
        pageImpressions: metrics.get('impressions') ?? null,
        pageReach: metrics.get('reach') ?? null,
        profileViews: metrics.get('profile_views') ?? null,
        pageFollows: metrics.get('follower_count') ?? null,
        websiteClicks: metrics.get('website_clicks') ?? null,
      },
      update: {
        pageImpressions: metrics.get('impressions') ?? null,
        pageReach: metrics.get('reach') ?? null,
        profileViews: metrics.get('profile_views') ?? null,
        pageFollows: metrics.get('follower_count') ?? null,
        websiteClicks: metrics.get('website_clicks') ?? null,
      },
    })

    count++
  }

  return count
}

import type { MetaPost, InstagramMedia } from '@/lib/meta-api'

async function storeFacebookPosts(
  db: DbClient,
  pageId: string,
  posts: MetaPost[]
): Promise<number> {
  const account = await db.dimAccount.findFirst({
    where: { externalId: pageId },
  })

  if (!account) return 0

  let count = 0

  for (const post of posts) {
    const contentType = mapFacebookPostType(post.type)

    await db.dimContent.upsert({
      where: {
        accountId_externalId: {
          accountId: account.id,
          externalId: post.id,
        },
      },
      create: {
        externalId: post.id,
        accountId: account.id,
        contentType,
        message: post.message ?? post.story,
        permalinkUrl: post.permalink_url,
        mediaUrl: post.full_picture,
        publishedAt: new Date(post.created_time),
        hashtags: extractHashtags(post.message ?? ''),
        mentions: extractMentions(post.message ?? ''),
      },
      update: {
        message: post.message ?? post.story,
        permalinkUrl: post.permalink_url,
        mediaUrl: post.full_picture,
      },
    })

    count++
  }

  return count
}

async function storeInstagramMedia(
  db: DbClient,
  accountId: string,
  media: InstagramMedia[]
): Promise<number> {
  const account = await db.dimAccount.findFirst({
    where: { externalId: accountId },
  })

  if (!account) return 0

  let count = 0

  for (const item of media) {
    const contentType = mapInstagramMediaType(item.media_type)

    await db.dimContent.upsert({
      where: {
        accountId_externalId: {
          accountId: account.id,
          externalId: item.id,
        },
      },
      create: {
        externalId: item.id,
        accountId: account.id,
        contentType,
        message: item.caption,
        permalinkUrl: item.permalink,
        mediaUrl: item.media_url,
        thumbnailUrl: item.thumbnail_url,
        mediaType: item.media_type,
        publishedAt: new Date(item.timestamp),
        hashtags: extractHashtags(item.caption ?? ''),
        mentions: extractMentions(item.caption ?? ''),
      },
      update: {
        message: item.caption,
        mediaUrl: item.media_url,
        thumbnailUrl: item.thumbnail_url,
      },
    })

    count++
  }

  return count
}

function createDateDimension(date: Date): Prisma.DimDateCreateInput {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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

  const dayOfWeek = date.getDay()

  return {
    date,
    year: date.getFullYear(),
    quarter: Math.floor(date.getMonth() / 3) + 1,
    month: date.getMonth() + 1,
    week: getISOWeek(date),
    dayOfMonth: date.getDate(),
    dayOfWeek,
    dayOfYear: getDayOfYear(date),
    monthName: monthNames[date.getMonth()] ?? 'Unknown',
    dayName: dayNames[dayOfWeek] ?? 'Unknown',
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isHoliday: false,
    isFestivalDay: false,
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function mapFacebookPostType(
  type: string
): 'POST' | 'PHOTO' | 'VIDEO' | 'LINK' | 'STATUS' | 'CAROUSEL' {
  switch (type) {
    case 'photo':
      return 'PHOTO'
    case 'video':
      return 'VIDEO'
    case 'link':
      return 'LINK'
    case 'status':
      return 'STATUS'
    default:
      return 'POST'
  }
}

function mapInstagramMediaType(
  mediaType: string
): 'POST' | 'PHOTO' | 'VIDEO' | 'CAROUSEL' | 'REEL' {
  switch (mediaType) {
    case 'IMAGE':
      return 'PHOTO'
    case 'VIDEO':
      return 'VIDEO'
    case 'CAROUSEL_ALBUM':
      return 'CAROUSEL'
    default:
      return 'POST'
  }
}

function mapObjective(
  objective: string
): 'AWARENESS' | 'TRAFFIC' | 'ENGAGEMENT' | 'LEADS' | 'APP_PROMOTION' | 'SALES' | 'CONVERSIONS' {
  const mapping: Record<
    string,
    'AWARENESS' | 'TRAFFIC' | 'ENGAGEMENT' | 'LEADS' | 'APP_PROMOTION' | 'SALES' | 'CONVERSIONS'
  > = {
    OUTCOME_AWARENESS: 'AWARENESS',
    OUTCOME_TRAFFIC: 'TRAFFIC',
    OUTCOME_ENGAGEMENT: 'ENGAGEMENT',
    OUTCOME_LEADS: 'LEADS',
    OUTCOME_APP_PROMOTION: 'APP_PROMOTION',
    OUTCOME_SALES: 'SALES',
    CONVERSIONS: 'CONVERSIONS',
    LINK_CLICKS: 'TRAFFIC',
    REACH: 'AWARENESS',
    BRAND_AWARENESS: 'AWARENESS',
    POST_ENGAGEMENT: 'ENGAGEMENT',
  }
  return mapping[objective] ?? 'AWARENESS'
}

function mapAdStatus(
  status: string
): 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_REVIEW' | 'DISAPPROVED' {
  const mapping: Record<
    string,
    'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_REVIEW' | 'DISAPPROVED'
  > = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    DELETED: 'DELETED',
    ARCHIVED: 'ARCHIVED',
  }
  return mapping[status] ?? 'PAUSED'
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g)
  return matches ?? []
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@\w+/g)
  return matches ?? []
}
