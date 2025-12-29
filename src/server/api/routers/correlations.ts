/**
 * Correlations Router - Cross-Data Analysis Engine
 *
 * Analyzes relationships between weather, engagement, hashtags,
 * sentiment, and attribution data to generate actionable insights.
 */

import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import {
  calculatePearsonCorrelation,
  getCorrelationStrength,
  generateCorrelationInsight,
  type WeatherEngagementCorrelation,
  type HashtagPerformanceCorrelation,
  type SentimentGrowthCorrelation,
  type AttributionROICorrelation,
  type FullInsightsReport,
} from '@/lib/correlations'

export const correlationsRouter = createTRPCRouter({
  /**
   * Get weather-engagement correlation analysis
   */
  getWeatherEngagementCorrelation: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(90),
      })
    )
    .query(async ({ ctx, input }): Promise<WeatherEngagementCorrelation | null> => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      // Get weather data
      const weatherData = await ctx.db.factWeatherDaily.findMany({
        where: {
          date: { date: { gte: cutoffDate } },
        },
        include: {
          date: { select: { date: true } },
        },
        orderBy: { date: { date: 'asc' } },
      })

      // Get engagement data (account insights)
      const engagementData = await ctx.db.factAccountInsightsDaily.findMany({
        where: {
          date: { date: { gte: cutoffDate } },
        },
        include: {
          date: { select: { date: true } },
        },
        orderBy: { date: { date: 'asc' } },
      })

      if (weatherData.length < 7 || engagementData.length < 7) {
        return null
      }

      // Match data by date
      const dateMap = new Map<
        string,
        { temp: number; engagement: number; reach: number; rain: boolean }
      >()

      for (const w of weatherData) {
        const dateStr = w.date.date.toISOString().split('T')[0]!
        dateMap.set(dateStr, {
          temp: w.tempAvg ?? 15,
          engagement: 0,
          reach: 0,
          rain: (w.rain ?? 0) > 0,
        })
      }

      for (const e of engagementData) {
        const dateStr = e.date.date.toISOString().split('T')[0]!
        const existing = dateMap.get(dateStr)
        if (existing) {
          existing.engagement = e.pageEngagement ?? 0
          existing.reach = e.pageReach ?? 0
        }
      }

      // Filter to days with both weather and engagement data
      const matchedData = Array.from(dateMap.values()).filter(
        (d) => d.engagement > 0 || d.reach > 0
      )

      if (matchedData.length < 7) {
        return null
      }

      // Calculate correlations
      const temps = matchedData.map((d) => d.temp)
      const engagements = matchedData.map((d) => d.engagement)
      const reaches = matchedData.map((d) => d.reach)

      const tempEngagementCorr = calculatePearsonCorrelation(temps, engagements)
      const tempReachCorr = calculatePearsonCorrelation(temps, reaches)

      // Rain impact
      const sunnyDays = matchedData.filter((d) => !d.rain)
      const rainyDays = matchedData.filter((d) => d.rain)

      const sunnyEngagement =
        sunnyDays.length > 0
          ? sunnyDays.reduce((sum, d) => sum + d.engagement, 0) / sunnyDays.length
          : 0
      const rainyEngagement =
        rainyDays.length > 0
          ? rainyDays.reduce((sum, d) => sum + d.engagement, 0) / rainyDays.length
          : 0

      // Calculate rain correlation (binary)
      const rainValues = matchedData.map((d) => (d.rain ? 1 : 0))
      const rainEngagementCorr = calculatePearsonCorrelation(rainValues, engagements)

      const insights: string[] = []
      const recommendations: string[] = []

      // Generate insights
      if (tempEngagementCorr > 0.3) {
        insights.push(
          `Warmer weather correlates with higher engagement (r=${tempEngagementCorr.toFixed(2)})`
        )
        recommendations.push('Schedule more content during warm weather periods')
      }

      if (sunnyEngagement > rainyEngagement * 1.2) {
        const diff = (((sunnyEngagement - rainyEngagement) / rainyEngagement) * 100).toFixed(0)
        insights.push(`Sunny days show ${diff}% higher engagement than rainy days`)
        recommendations.push('Focus outdoor/visual content on sunny days')
      }

      if (rainyEngagement > sunnyEngagement) {
        insights.push('Rainy days show higher engagement - users may be on phones more')
        recommendations.push('Prepare engaging content for rainy forecasts')
      }

      return {
        period: {
          from: cutoffDate.toISOString().split('T')[0]!,
          to: new Date().toISOString().split('T')[0]!,
        },
        correlations: {
          temperatureVsEngagement: {
            coefficient: tempEngagementCorr,
            strength: getCorrelationStrength(tempEngagementCorr),
            sampleSize: matchedData.length,
            insight: generateCorrelationInsight('temperature', 'engagement', tempEngagementCorr),
          },
          temperatureVsReach: {
            coefficient: tempReachCorr,
            strength: getCorrelationStrength(tempReachCorr),
            sampleSize: matchedData.length,
            insight: generateCorrelationInsight('temperature', 'reach', tempReachCorr),
          },
          rainVsEngagement: {
            coefficient: rainEngagementCorr,
            strength: getCorrelationStrength(rainEngagementCorr),
            sampleSize: matchedData.length,
            insight: generateCorrelationInsight('rain', 'engagement', rainEngagementCorr),
          },
          sunnyDaysEngagement: sunnyEngagement,
          rainyDaysEngagement: rainyEngagement,
        },
        insights,
        recommendations,
      }
    }),

  /**
   * Get hashtag performance correlation analysis
   */
  getHashtagPerformanceCorrelation: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(90),
        minUsage: z.number().min(1).default(3),
      })
    )
    .query(async ({ ctx, input }): Promise<HashtagPerformanceCorrelation | null> => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      // Get hashtag usage with content performance
      const hashtagUsage = await ctx.db.factContentHashtag.findMany({
        where: {
          createdAt: { gte: cutoffDate },
        },
        include: {
          hashtag: true,
          content: {
            include: {
              contentInsights: {
                orderBy: { snapshotAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      })

      if (hashtagUsage.length === 0) {
        return null
      }

      // Aggregate by hashtag
      const hashtagStats: Record<
        string,
        {
          hashtag: string
          color: string | null
          totalEngagement: number
          totalReach: number
          count: number
        }
      > = {}

      for (const usage of hashtagUsage) {
        const tag = usage.hashtag.hashtag
        const insights = usage.content.contentInsights[0]

        if (!hashtagStats[tag]) {
          hashtagStats[tag] = {
            hashtag: tag,
            color: usage.hashtag.color,
            totalEngagement: 0,
            totalReach: 0,
            count: 0,
          }
        }

        if (insights) {
          const engagement = insights.likes + insights.comments + insights.shares + insights.saves
          hashtagStats[tag]!.totalEngagement += engagement
          hashtagStats[tag]!.totalReach += insights.reach
        }
        hashtagStats[tag]!.count++
      }

      // Filter by minimum usage and calculate averages
      const hashtags = Object.values(hashtagStats)
        .filter((h) => h.count >= input.minUsage)
        .map((h) => ({
          hashtag: h.hashtag,
          color: h.color,
          avgEngagementRate: h.totalReach > 0 ? (h.totalEngagement / h.totalReach) * 100 : 0,
          avgReach: h.totalReach / h.count,
          timesUsed: h.count,
        }))

      if (hashtags.length === 0) {
        return null
      }

      // Sort for top/worst performers
      const sortedByEngagement = [...hashtags].sort(
        (a, b) => b.avgEngagementRate - a.avgEngagementRate
      )

      // Color correlation
      const colorStats = {
        green: { totalEngagement: 0, count: 0 },
        blue: { totalEngagement: 0, count: 0 },
        red: { totalEngagement: 0, count: 0 },
      }

      for (const h of hashtags) {
        if (h.color === 'green') {
          colorStats.green.totalEngagement += h.avgEngagementRate
          colorStats.green.count++
        } else if (h.color === 'blue') {
          colorStats.blue.totalEngagement += h.avgEngagementRate
          colorStats.blue.count++
        } else if (h.color === 'red') {
          colorStats.red.totalEngagement += h.avgEngagementRate
          colorStats.red.count++
        }
      }

      const insights: string[] = []

      // Generate insights
      if (sortedByEngagement.length > 0) {
        const top = sortedByEngagement[0]!
        insights.push(
          `Top performing hashtag: ${top.hashtag} (${top.avgEngagementRate.toFixed(2)}% engagement)`
        )
      }

      const greenAvg =
        colorStats.green.count > 0 ? colorStats.green.totalEngagement / colorStats.green.count : 0
      const blueAvg =
        colorStats.blue.count > 0 ? colorStats.blue.totalEngagement / colorStats.blue.count : 0
      const redAvg =
        colorStats.red.count > 0 ? colorStats.red.totalEngagement / colorStats.red.count : 0

      if (greenAvg > blueAvg && greenAvg > redAvg) {
        insights.push('Green (trending) hashtags show the best engagement - continue using them')
      }

      if (redAvg > 0 && redAvg < greenAvg * 0.5) {
        insights.push(
          'Red (overused) hashtags perform significantly worse - consider avoiding them'
        )
      }

      return {
        period: {
          from: cutoffDate.toISOString().split('T')[0]!,
          to: new Date().toISOString().split('T')[0]!,
        },
        topPerformers: sortedByEngagement.slice(0, 10),
        worstPerformers: sortedByEngagement.slice(-10).reverse(),
        colorCorrelation: {
          green: { avgEngagement: greenAvg, count: colorStats.green.count },
          blue: { avgEngagement: blueAvg, count: colorStats.blue.count },
          red: { avgEngagement: redAvg, count: colorStats.red.count },
        },
        insights,
      }
    }),

  /**
   * Get sentiment-follower growth correlation
   */
  getSentimentGrowthCorrelation: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(90),
      })
    )
    .query(async ({ ctx, input }): Promise<SentimentGrowthCorrelation | null> => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      // Get daily sentiment
      const sentimentData = await ctx.db.aggSentimentDaily.findMany({
        where: {
          date: { date: { gte: cutoffDate } },
        },
        include: {
          date: { select: { date: true } },
        },
        orderBy: { date: { date: 'asc' } },
      })

      // Get follower data
      const followerData = await ctx.db.factAccountInsightsDaily.findMany({
        where: {
          date: { date: { gte: cutoffDate } },
        },
        include: {
          date: { select: { date: true } },
        },
        orderBy: { date: { date: 'asc' } },
      })

      if (sentimentData.length < 7 || followerData.length < 7) {
        return null
      }

      // Match by date and calculate follower growth
      const dateMap = new Map<string, { sentiment: number; followerGrowth: number }>()

      for (const s of sentimentData) {
        const dateStr = s.date.date.toISOString().split('T')[0]!
        dateMap.set(dateStr, {
          sentiment: s.avgSentimentScore,
          followerGrowth: 0,
        })
      }

      for (let i = 1; i < followerData.length; i++) {
        const current = followerData[i]!
        const previous = followerData[i - 1]!
        const dateStr = current.date.date.toISOString().split('T')[0]!

        const growth = (current.pageFollows ?? 0) - (previous.pageFollows ?? 0)
        const existing = dateMap.get(dateStr)
        if (existing) {
          existing.followerGrowth = growth
        }
      }

      const matchedData = Array.from(dateMap.values()).filter(
        (d) => d.sentiment !== 0 || d.followerGrowth !== 0
      )

      if (matchedData.length < 7) {
        return null
      }

      // Calculate correlation
      const sentiments = matchedData.map((d) => d.sentiment)
      const growths = matchedData.map((d) => d.followerGrowth)
      const correlation = calculatePearsonCorrelation(sentiments, growths)

      // Segment analysis
      const highPositive = matchedData.filter((d) => d.sentiment > 0.3)
      const highNegative = matchedData.filter((d) => d.sentiment < -0.3)
      const neutral = matchedData.filter((d) => d.sentiment >= -0.3 && d.sentiment <= 0.3)

      const avgGrowth = (data: typeof matchedData) =>
        data.length > 0 ? data.reduce((sum, d) => sum + d.followerGrowth, 0) / data.length : 0

      const insights: string[] = []

      if (correlation > 0.3) {
        insights.push('Positive sentiment correlates with follower growth')
      }

      const positiveGrowth = avgGrowth(highPositive)
      const negativeGrowth = avgGrowth(highNegative)

      if (positiveGrowth > negativeGrowth * 1.5) {
        insights.push(
          `High positive sentiment days see ${((positiveGrowth / Math.max(negativeGrowth, 1)) * 100 - 100).toFixed(0)}% more follower growth`
        )
      }

      return {
        period: {
          from: cutoffDate.toISOString().split('T')[0]!,
          to: new Date().toISOString().split('T')[0]!,
        },
        correlation: {
          coefficient: correlation,
          strength: getCorrelationStrength(correlation),
          sampleSize: matchedData.length,
          insight: generateCorrelationInsight('sentiment', 'follower growth', correlation),
        },
        sentimentImpact: {
          highPositiveDays: { avgFollowerGrowth: positiveGrowth, count: highPositive.length },
          highNegativeDays: { avgFollowerGrowth: negativeGrowth, count: highNegative.length },
          neutralDays: { avgFollowerGrowth: avgGrowth(neutral), count: neutral.length },
        },
        insights,
      }
    }),

  /**
   * Get attribution ROI analysis
   */
  getAttributionROI: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(90),
      })
    )
    .query(async ({ ctx, input }): Promise<AttributionROICorrelation | null> => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      // Get click data with link info
      const clicks = await ctx.db.factLinkClicks.findMany({
        where: {
          clickTimestamp: { gte: cutoffDate },
        },
        include: {
          link: {
            select: {
              utmSource: true,
              utmMedium: true,
            },
          },
        },
      })

      if (clicks.length === 0) {
        return null
      }

      // Aggregate by platform
      const byPlatform = {
        facebook: { clicks: 0, conversions: 0, value: 0 },
        instagram: { clicks: 0, conversions: 0, value: 0 },
      }

      const byMedium: Record<string, { clicks: number; conversions: number }> = {
        post: { clicks: 0, conversions: 0 },
        story: { clicks: 0, conversions: 0 },
        reel: { clicks: 0, conversions: 0 },
        ad: { clicks: 0, conversions: 0 },
      }

      for (const click of clicks) {
        const source = click.link.utmSource?.toLowerCase()
        const medium = click.link.utmMedium?.toLowerCase()

        if (source === 'facebook') {
          byPlatform.facebook.clicks++
          if (click.converted) {
            byPlatform.facebook.conversions++
            byPlatform.facebook.value += click.conversionValue ?? 0
          }
        } else if (source === 'instagram') {
          byPlatform.instagram.clicks++
          if (click.converted) {
            byPlatform.instagram.conversions++
            byPlatform.instagram.value += click.conversionValue ?? 0
          }
        }

        if (medium && byMedium[medium]) {
          byMedium[medium]!.clicks++
          if (click.converted) {
            byMedium[medium]!.conversions++
          }
        }
      }

      const calcRate = (conversions: number, clicks: number) =>
        clicks > 0 ? (conversions / clicks) * 100 : 0

      const insights: string[] = []

      // Generate insights
      const fbRate = calcRate(byPlatform.facebook.conversions, byPlatform.facebook.clicks)
      const igRate = calcRate(byPlatform.instagram.conversions, byPlatform.instagram.clicks)

      if (fbRate > igRate * 1.5) {
        insights.push(
          `Facebook has ${(fbRate / Math.max(igRate, 0.1) - 1) * 100}% higher conversion rate than Instagram`
        )
      } else if (igRate > fbRate * 1.5) {
        insights.push(
          `Instagram has ${(igRate / Math.max(fbRate, 0.1) - 1) * 100}% higher conversion rate than Facebook`
        )
      }

      // Find best performing medium
      const mediumRates = Object.entries(byMedium)
        .map(([medium, stats]) => ({
          medium,
          rate: calcRate(stats.conversions, stats.clicks),
          clicks: stats.clicks,
        }))
        .filter((m) => m.clicks >= 10)
        .sort((a, b) => b.rate - a.rate)

      if (mediumRates.length > 0 && mediumRates[0]!.rate > 0) {
        insights.push(
          `${mediumRates[0]!.medium} content has the highest conversion rate (${mediumRates[0]!.rate.toFixed(1)}%)`
        )
      }

      return {
        period: {
          from: cutoffDate.toISOString().split('T')[0]!,
          to: new Date().toISOString().split('T')[0]!,
        },
        byPlatform: {
          facebook: {
            clicks: byPlatform.facebook.clicks,
            conversions: byPlatform.facebook.conversions,
            rate: fbRate,
            value: byPlatform.facebook.value,
          },
          instagram: {
            clicks: byPlatform.instagram.clicks,
            conversions: byPlatform.instagram.conversions,
            rate: igRate,
            value: byPlatform.instagram.value,
          },
        },
        byMedium: {
          post: {
            ...byMedium.post!,
            rate: calcRate(byMedium.post!.conversions, byMedium.post!.clicks),
          },
          story: {
            ...byMedium.story!,
            rate: calcRate(byMedium.story!.conversions, byMedium.story!.clicks),
          },
          reel: {
            ...byMedium.reel!,
            rate: calcRate(byMedium.reel!.conversions, byMedium.reel!.clicks),
          },
          ad: { ...byMedium.ad!, rate: calcRate(byMedium.ad!.conversions, byMedium.ad!.clicks) },
        },
        topConverting: mediumRates.slice(0, 5).map((m) => ({
          contentType: m.medium,
          conversionRate: m.rate,
          avgValue: 0, // Would need more data to calculate
        })),
        insights,
      }
    }),

  /**
   * Get full insights report combining all correlations
   */
  getFullInsightsReport: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(90),
      })
    )
    .query(async ({ ctx, input }): Promise<FullInsightsReport> => {
      // Get all correlations in parallel
      const [weather, hashtags, sentiment, attribution] = await Promise.all([
        ctx.db.factWeatherDaily
          .count()
          .then((count) =>
            count > 0
              ? correlationsRouter
                  .createCaller(ctx)
                  .getWeatherEngagementCorrelation({ days: input.days })
              : null
          ),
        ctx.db.factContentHashtag
          .count()
          .then((count) =>
            count > 0
              ? correlationsRouter
                  .createCaller(ctx)
                  .getHashtagPerformanceCorrelation({ days: input.days })
              : null
          ),
        ctx.db.aggSentimentDaily
          .count()
          .then((count) =>
            count > 0
              ? correlationsRouter
                  .createCaller(ctx)
                  .getSentimentGrowthCorrelation({ days: input.days })
              : null
          ),
        ctx.db.factLinkClicks
          .count()
          .then((count) =>
            count > 0
              ? correlationsRouter.createCaller(ctx).getAttributionROI({ days: input.days })
              : null
          ),
      ])

      // Compile key insights
      const keyInsights: string[] = []
      const actionItems: Array<{
        priority: 'high' | 'medium' | 'low'
        action: string
        expectedImpact: string
      }> = []

      if (weather?.insights) {
        keyInsights.push(...weather.insights)
        for (const rec of weather.recommendations ?? []) {
          actionItems.push({
            priority: 'medium',
            action: rec,
            expectedImpact: 'Improved engagement during optimal weather',
          })
        }
      }

      if (hashtags?.insights) {
        keyInsights.push(...hashtags.insights)
        if (hashtags.topPerformers.length > 0) {
          actionItems.push({
            priority: 'high',
            action: `Continue using top hashtags: ${hashtags.topPerformers
              .slice(0, 3)
              .map((h) => h.hashtag)
              .join(', ')}`,
            expectedImpact: 'Maintain high engagement rates',
          })
        }
      }

      if (sentiment?.insights) {
        keyInsights.push(...sentiment.insights)
      }

      if (attribution?.insights) {
        keyInsights.push(...attribution.insights)
        if (attribution.byPlatform.facebook.rate > attribution.byPlatform.instagram.rate) {
          actionItems.push({
            priority: 'high',
            action: 'Increase Facebook content budget',
            expectedImpact: 'Higher conversion rate on Facebook',
          })
        }
      }

      // Add default action items if list is empty
      if (actionItems.length === 0) {
        actionItems.push({
          priority: 'medium',
          action: 'Continue collecting data for more accurate insights',
          expectedImpact: 'Better correlation analysis with more data points',
        })
      }

      return {
        period: {
          from: new Date(Date.now() - input.days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]!,
          to: new Date().toISOString().split('T')[0]!,
        },
        weather: weather ?? undefined,
        hashtags: hashtags ?? undefined,
        sentiment: sentiment ?? undefined,
        attribution: attribution ?? undefined,
        keyInsights,
        actionItems,
      }
    }),
})
