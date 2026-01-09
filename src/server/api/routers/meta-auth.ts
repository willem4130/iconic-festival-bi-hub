/**
 * Meta OAuth tRPC Router
 *
 * Handles Meta OAuth connection management:
 * - Connection status
 * - Account discovery and selection
 * - Connect/disconnect accounts
 * - Token refresh
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { cookies } from 'next/headers'
import {
  createOAuthConfigFromEnv,
  debugToken,
  refreshLongLivedToken,
  revokeToken,
} from '@/lib/meta-api/oauth'
import {
  discoverFacebookPages,
  getInstagramAccountInfo,
  type DiscoveredInstagramAccount,
} from '@/lib/meta-api/account-discovery'
import {
  MetaApiClient,
  getPageInfo,
  getPageInsightsForDays,
  getInstagramInsightsForDays,
} from '@/lib/meta-api'
import type { PageInsightMetric, InstagramInsightMetric } from '@/lib/meta-api'

// ===========================================
// Input Schemas
// ===========================================

const connectAccountsSchema = z.object({
  connectionId: z.string(),
  accountIds: z.array(z.string()).min(1),
})

const disconnectAccountSchema = z.object({
  accountId: z.string(),
})

const syncOptionsSchema = z.object({
  accountId: z.string(),
  days: z.number().min(1).max(90).default(30),
})

// ===========================================
// Router
// ===========================================

export const metaAuthRouter = createTRPCRouter({
  /**
   * Get OAuth connection status for current user
   */
  getConnectionStatus: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id ?? 'dev-user'

    // Check for active Meta connection
    const connection = await ctx.db.metaConnection.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        connectedAccounts: {
          include: {
            platform: true,
          },
        },
      },
    })

    if (!connection) {
      return {
        connected: false,
        connection: null,
        accounts: [],
      }
    }

    // Check token validity
    const config = createOAuthConfigFromEnv()
    let tokenValid = true
    let daysRemaining: number | null = null

    if (config) {
      try {
        const tokenInfo = await debugToken(config, connection.accessToken)
        tokenValid = tokenInfo.is_valid

        if (tokenInfo.expires_at > 0) {
          const expiresAt = new Date(tokenInfo.expires_at * 1000)
          daysRemaining = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }
      } catch {
        tokenValid = false
      }
    }

    return {
      connected: true,
      connection: {
        id: connection.id,
        metaUserId: connection.metaUserId,
        metaUserName: connection.metaUserName,
        status: connection.status,
        tokenExpiresAt: connection.tokenExpiresAt.toISOString(),
        tokenValid,
        daysRemaining,
        scopes: connection.scopes,
        createdAt: connection.createdAt.toISOString(),
      },
      accounts: connection.connectedAccounts.map((account) => ({
        id: account.id,
        externalId: account.externalId,
        platform: account.platform.platform,
        accountType: account.accountType,
        name: account.name,
        username: account.username,
        profilePictureUrl: account.profilePictureUrl,
        isActive: account.isActive,
        lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
      })),
    }
  }),

  /**
   * Get discovered accounts from OAuth callback (stored in cookie)
   */
  getDiscoveredAccounts: publicProcedure.query(async () => {
    const cookieStore = await cookies()
    const accountsData = cookieStore.get('meta_discovered_accounts')?.value

    if (!accountsData) {
      return {
        connectionId: null,
        facebookPages: [],
        instagramAccounts: [],
      }
    }

    try {
      const parsed = JSON.parse(accountsData) as {
        connectionId: string
        facebookPages: Array<{
          id: string
          name: string
          username?: string
          category?: string
          profilePictureUrl?: string
          followersCount?: number
          hasInstagram: boolean
        }>
        instagramAccounts: Array<{
          id: string
          username: string
          name?: string
          profilePictureUrl?: string
          followersCount?: number
          linkedFacebookPageId: string
          linkedFacebookPageName: string
        }>
      }

      return parsed
    } catch {
      return {
        connectionId: null,
        facebookPages: [],
        instagramAccounts: [],
      }
    }
  }),

  /**
   * Re-discover accounts from Meta API (refresh available accounts)
   */
  refreshDiscoveredAccounts: publicProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id ?? 'dev-user'

    const connection = await ctx.db.metaConnection.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    })

    if (!connection) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active Meta connection found',
      })
    }

    try {
      // Discover Facebook Pages
      const facebookPages = await discoverFacebookPages(connection.accessToken)

      // Discover Instagram accounts linked to pages
      const instagramAccounts: DiscoveredInstagramAccount[] = []

      for (const page of facebookPages) {
        if (page.instagramBusinessAccount?.id) {
          try {
            const igInfo = await getInstagramAccountInfo(
              page.instagramBusinessAccount.id,
              page.accessToken
            )

            instagramAccounts.push({
              id: igInfo.id,
              username: igInfo.username,
              name: igInfo.name,
              profilePictureUrl: igInfo.profile_picture_url,
              followersCount: igInfo.followers_count,
              followsCount: igInfo.follows_count,
              mediaCount: igInfo.media_count,
              biography: igInfo.biography,
              linkedFacebookPageId: page.id,
              linkedFacebookPageName: page.name,
            })
          } catch {
            // Continue if we can't get IG info for one page
          }
        }
      }

      return {
        connectionId: connection.id,
        facebookPages: facebookPages.map((p) => ({
          id: p.id,
          name: p.name,
          username: p.username,
          category: p.category,
          profilePictureUrl: p.profilePictureUrl,
          followersCount: p.followersCount,
          hasInstagram: !!p.instagramBusinessAccount,
        })),
        instagramAccounts: instagramAccounts.map((a) => ({
          id: a.id,
          username: a.username,
          name: a.name,
          profilePictureUrl: a.profilePictureUrl,
          followersCount: a.followersCount,
          linkedFacebookPageId: a.linkedFacebookPageId,
          linkedFacebookPageName: a.linkedFacebookPageName,
        })),
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to discover accounts',
      })
    }
  }),

  /**
   * Connect selected accounts (create DimAccount records)
   */
  connectAccounts: publicProcedure.input(connectAccountsSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id ?? 'dev-user'

    // Verify connection belongs to user
    const connection = await ctx.db.metaConnection.findFirst({
      where: {
        id: input.connectionId,
        userId,
      },
    })

    if (!connection) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Meta connection not found',
      })
    }

    // Discover pages again to get fresh access tokens
    const pages = await discoverFacebookPages(connection.accessToken)
    const pageMap = new Map(pages.map((p) => [p.id, p]))

    // Get or create platform dimensions
    const [facebookPlatform, instagramPlatform] = await Promise.all([
      ctx.db.dimPlatform.upsert({
        where: { platform: 'FACEBOOK' },
        create: { platform: 'FACEBOOK', displayName: 'Facebook', apiVersion: 'v21.0' },
        update: {},
      }),
      ctx.db.dimPlatform.upsert({
        where: { platform: 'INSTAGRAM' },
        create: { platform: 'INSTAGRAM', displayName: 'Instagram', apiVersion: 'v21.0' },
        update: {},
      }),
    ])

    const connectedAccounts: Array<{ id: string; platform: string; name: string }> = []

    for (const accountId of input.accountIds) {
      // Check if this is a Facebook Page
      const page = pageMap.get(accountId)

      if (page) {
        // Create/update Facebook Page account
        const account = await ctx.db.dimAccount.upsert({
          where: {
            platformId_externalId: {
              platformId: facebookPlatform.id,
              externalId: page.id,
            },
          },
          create: {
            platformId: facebookPlatform.id,
            externalId: page.id,
            metaConnectionId: connection.id,
            accountType: 'PAGE',
            name: page.name,
            username: page.username,
            profilePictureUrl: page.profilePictureUrl,
            pageAccessToken: page.accessToken,
            pageTokenObtainedAt: new Date(),
            isActive: true,
          },
          update: {
            metaConnectionId: connection.id,
            name: page.name,
            username: page.username,
            profilePictureUrl: page.profilePictureUrl,
            pageAccessToken: page.accessToken,
            pageTokenObtainedAt: new Date(),
            isActive: true,
          },
        })

        connectedAccounts.push({
          id: account.id,
          platform: 'FACEBOOK',
          name: page.name,
        })

        // Also create Instagram account if linked
        if (page.instagramBusinessAccount?.id) {
          try {
            const igInfo = await getInstagramAccountInfo(
              page.instagramBusinessAccount.id,
              page.accessToken
            )

            const igAccount = await ctx.db.dimAccount.upsert({
              where: {
                platformId_externalId: {
                  platformId: instagramPlatform.id,
                  externalId: igInfo.id,
                },
              },
              create: {
                platformId: instagramPlatform.id,
                externalId: igInfo.id,
                metaConnectionId: connection.id,
                accountType: 'BUSINESS',
                name: igInfo.name ?? igInfo.username,
                username: igInfo.username,
                profilePictureUrl: igInfo.profile_picture_url,
                linkedFacebookPageId: page.id,
                pageAccessToken: page.accessToken, // IG uses the page's access token
                pageTokenObtainedAt: new Date(),
                isActive: true,
              },
              update: {
                metaConnectionId: connection.id,
                name: igInfo.name ?? igInfo.username,
                username: igInfo.username,
                profilePictureUrl: igInfo.profile_picture_url,
                pageAccessToken: page.accessToken,
                pageTokenObtainedAt: new Date(),
                isActive: true,
              },
            })

            connectedAccounts.push({
              id: igAccount.id,
              platform: 'INSTAGRAM',
              name: igInfo.username,
            })
          } catch {
            // Continue if IG connection fails
          }
        }
      }
    }

    // Clear the discovered accounts cookie
    const cookieStore = await cookies()
    cookieStore.delete('meta_discovered_accounts')

    return {
      success: true,
      connectedAccounts,
    }
  }),

  /**
   * Disconnect a specific account
   */
  disconnectAccount: publicProcedure
    .input(disconnectAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? 'dev-user'

      // Find the account and verify it belongs to user's connection
      const account = await ctx.db.dimAccount.findFirst({
        where: {
          id: input.accountId,
          metaConnection: {
            userId,
          },
        },
      })

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found or not authorized',
        })
      }

      // Mark as inactive and clear connection
      await ctx.db.dimAccount.update({
        where: { id: input.accountId },
        data: {
          isActive: false,
          metaConnectionId: null,
          pageAccessToken: null,
        },
      })

      return { success: true }
    }),

  /**
   * Disconnect all accounts and revoke Meta connection
   */
  disconnectAll: publicProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id ?? 'dev-user'

    const connection = await ctx.db.metaConnection.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    })

    if (!connection) {
      return { success: true }
    }

    // Try to revoke the token on Meta's side
    try {
      await revokeToken(connection.accessToken)
    } catch {
      // Continue even if revoke fails (token might already be invalid)
    }

    // Disconnect all accounts linked to this connection
    await ctx.db.dimAccount.updateMany({
      where: { metaConnectionId: connection.id },
      data: {
        isActive: false,
        metaConnectionId: null,
        pageAccessToken: null,
      },
    })

    // Update connection status
    await ctx.db.metaConnection.update({
      where: { id: connection.id },
      data: { status: 'DISCONNECTED' },
    })

    return { success: true }
  }),

  /**
   * Manually refresh the Meta connection token
   */
  refreshToken: publicProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id ?? 'dev-user'

    const connection = await ctx.db.metaConnection.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    })

    if (!connection) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active Meta connection found',
      })
    }

    const config = createOAuthConfigFromEnv()

    if (!config) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Meta OAuth not configured',
      })
    }

    try {
      const newToken = await refreshLongLivedToken(config, connection.accessToken)

      const tokenExpiresAt = new Date(Date.now() + newToken.expires_in * 1000)

      await ctx.db.metaConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: newToken.access_token,
          tokenExpiresAt,
          tokenRefreshedAt: new Date(),
          status: 'ACTIVE',
          lastErrorMessage: null,
          lastErrorAt: null,
        },
      })

      // Also update page tokens for connected accounts
      const pages = await discoverFacebookPages(newToken.access_token)
      const pageMap = new Map(pages.map((p) => [p.id, p]))

      const connectedAccounts = await ctx.db.dimAccount.findMany({
        where: { metaConnectionId: connection.id },
      })

      for (const account of connectedAccounts) {
        const page = pageMap.get(account.externalId)
        if (page) {
          await ctx.db.dimAccount.update({
            where: { id: account.id },
            data: {
              pageAccessToken: page.accessToken,
              pageTokenObtainedAt: new Date(),
            },
          })
        }
      }

      return {
        success: true,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
      }
    } catch (error) {
      await ctx.db.metaConnection.update({
        where: { id: connection.id },
        data: {
          status: 'ERROR',
          lastErrorMessage: error instanceof Error ? error.message : 'Token refresh failed',
          lastErrorAt: new Date(),
        },
      })

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to refresh token',
      })
    }
  }),

  /**
   * Sync Facebook Page insights using OAuth connection
   */
  syncPageInsights: publicProcedure.input(syncOptionsSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id ?? 'dev-user'

    // Get the account and its connection
    const account = await ctx.db.dimAccount.findFirst({
      where: {
        id: input.accountId,
        metaConnection: { userId, status: 'ACTIVE' },
      },
      include: {
        metaConnection: true,
        platform: true,
      },
    })

    if (!account || !account.metaConnection || !account.pageAccessToken) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found or not properly connected',
      })
    }

    if (account.platform.platform !== 'FACEBOOK') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This endpoint is for Facebook Pages only',
      })
    }

    try {
      // Create client with page access token
      const client = new MetaApiClient({
        appId: process.env.META_APP_ID!,
        appSecret: process.env.META_APP_SECRET!,
        accessToken: account.pageAccessToken,
        pageId: account.externalId,
      })

      // Fetch insights
      const insights = await getPageInsightsForDays(client, input.days)

      // Store insights
      const storedCount = await storePageInsightsOAuth(ctx.db, account.id, insights)

      // Update last sync time
      await ctx.db.dimAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date() },
      })

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
   * Sync Instagram insights using OAuth connection
   */
  syncInstagramInsights: publicProcedure
    .input(syncOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? 'dev-user'

      // Get the account and its connection
      const account = await ctx.db.dimAccount.findFirst({
        where: {
          id: input.accountId,
          metaConnection: { userId, status: 'ACTIVE' },
        },
        include: {
          metaConnection: true,
          platform: true,
        },
      })

      if (!account || !account.metaConnection || !account.pageAccessToken) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found or not properly connected',
        })
      }

      if (account.platform.platform !== 'INSTAGRAM') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This endpoint is for Instagram accounts only',
        })
      }

      try {
        // Create client with page access token (Instagram uses the linked page's token)
        const client = new MetaApiClient({
          appId: process.env.META_APP_ID!,
          appSecret: process.env.META_APP_SECRET!,
          accessToken: account.pageAccessToken,
          instagramAccountId: account.externalId,
        })

        // Fetch insights
        const insights = await getInstagramInsightsForDays(client, input.days)

        // Store insights
        const storedCount = await storeInstagramInsightsOAuth(ctx.db, account.id, insights)

        // Update last sync time
        await ctx.db.dimAccount.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        })

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
})

// ===========================================
// Helper Functions
// ===========================================

const MONTH_NAMES = [
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
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function createDateDimension(date: Date) {
  return {
    date,
    year: date.getFullYear(),
    quarter: Math.ceil((date.getMonth() + 1) / 3),
    month: date.getMonth() + 1,
    monthName: MONTH_NAMES[date.getMonth()]!,
    week: getWeekNumber(date),
    dayOfWeek: date.getDay(),
    dayName: DAY_NAMES[date.getDay()]!,
    dayOfMonth: date.getDate(),
    dayOfYear: getDayOfYear(date),
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
  }
}

function getWeekNumber(date: Date): number {
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

async function storePageInsightsOAuth(
  db: typeof import('@/server/db').db,
  accountId: string,
  insights: PageInsightMetric[]
): Promise<number> {
  let count = 0

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

  for (const [dateStr, metrics] of insightsByDate) {
    const date = new Date(dateStr)

    const dimDate = await db.dimDate.upsert({
      where: { date },
      create: createDateDimension(date),
      update: {},
    })

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
        pageViews: metrics.get('page_views_total') ?? null,
        pageFollows: metrics.get('page_follows') ?? null,
        pageFollowsNew: metrics.get('page_fan_adds') ?? null,
        pageUnfollows: metrics.get('page_fan_removes') ?? null,
        pageEngagement: metrics.get('page_post_engagements') ?? null,
        videoViews: metrics.get('page_video_views') ?? null,
      },
      update: {
        pageViews: metrics.get('page_views_total') ?? null,
        pageFollows: metrics.get('page_follows') ?? null,
        pageFollowsNew: metrics.get('page_fan_adds') ?? null,
        pageUnfollows: metrics.get('page_fan_removes') ?? null,
        pageEngagement: metrics.get('page_post_engagements') ?? null,
        videoViews: metrics.get('page_video_views') ?? null,
      },
    })

    count++
  }

  return count
}

async function storeInstagramInsightsOAuth(
  db: typeof import('@/server/db').db,
  accountId: string,
  insights: InstagramInsightMetric[]
): Promise<number> {
  let count = 0

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

  for (const [dateStr, metrics] of insightsByDate) {
    const date = new Date(dateStr)

    const dimDate = await db.dimDate.upsert({
      where: { date },
      create: createDateDimension(date),
      update: {},
    })

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
