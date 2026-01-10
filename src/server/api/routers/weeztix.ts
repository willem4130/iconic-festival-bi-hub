import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

// Environment variables for Weeztix OAuth
const WEEZTIX_CLIENT_ID = process.env.WEEZTIX_CLIENT_ID
const WEEZTIX_CLIENT_SECRET = process.env.WEEZTIX_CLIENT_SECRET
const WEEZTIX_REDIRECT_URI =
  process.env.WEEZTIX_REDIRECT_URI || 'http://localhost:3000/api/auth/weeztix/callback'

export const weeztixRouter = createTRPCRouter({
  // Get connection status
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const connection = await ctx.db.weeztixConnection.findFirst({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    if (!connection) {
      return {
        connected: false,
        status: null,
        organizationName: null,
        lastSyncAt: null,
      }
    }

    // Check if token is expired
    const isExpired = new Date(connection.tokenExpiresAt) < new Date()

    return {
      connected: connection.status === 'ACTIVE' && !isExpired,
      status: isExpired ? 'TOKEN_EXPIRED' : connection.status,
      organizationName: connection.organizationName,
      organizationId: connection.organizationId,
      lastSyncAt: connection.lastSyncAt,
      lastSyncEventsCount: connection.lastSyncEventsCount,
      lastSyncOrdersCount: connection.lastSyncOrdersCount,
    }
  }),

  // Get OAuth URL for connecting
  getOAuthUrl: protectedProcedure.query(() => {
    if (!WEEZTIX_CLIENT_ID) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Weeztix OAuth not configured',
      })
    }

    const state = crypto.randomUUID()
    const authUrl = new URL('https://auth.weeztix.com/oauth/authorize')
    authUrl.searchParams.set('client_id', WEEZTIX_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', WEEZTIX_REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('scope', 'events:read orders:read analytics:read')

    return {
      url: authUrl.toString(),
      state,
    }
  }),

  // Disconnect Weeztix
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.weeztixConnection.updateMany({
      where: { userId: ctx.session.user.id },
      data: { status: 'DISCONNECTED' },
    })

    return { success: true }
  }),

  // Get all events
  getEvents: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(['active', 'cancelled', 'sold_out', 'ended', 'all'])
          .optional()
          .default('all'),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const connection = await ctx.db.weeztixConnection.findFirst({
        where: { userId: ctx.session.user.id, status: 'ACTIVE' },
      })

      if (!connection) {
        return { events: [], connectionStatus: 'NOT_CONNECTED' }
      }

      const events = await ctx.db.dimWeeztixEvent.findMany({
        where: {
          connectionId: connection.id,
          ...(input.status !== 'all' ? { status: input.status } : {}),
        },
        include: {
          ticketTypes: true,
        },
        orderBy: { startDate: 'desc' },
        take: input.limit,
      })

      return {
        events: events.map((event) => ({
          id: event.id,
          externalId: event.externalId,
          name: event.name,
          description: event.description,
          imageUrl: event.imageUrl,
          venueName: event.venueName,
          venueCity: event.venueCity,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          totalCapacity: event.totalCapacity,
          ticketsSold: event.ticketsSold,
          ticketsAvailable: event.ticketsAvailable,
          totalRevenue: event.totalRevenue / 100, // Convert from cents
          currency: event.currency,
          soldOutAt: event.soldOutAt,
          ticketTypes: event.ticketTypes.map((tt) => ({
            id: tt.id,
            name: tt.name,
            price: tt.price / 100,
            quantitySold: tt.quantitySold,
            quantityAvailable: tt.quantityAvailable,
            isOnSale: tt.isOnSale,
          })),
        })),
        connectionStatus: 'CONNECTED',
      }
    }),

  // Get single event details with analytics
  getEventDetails: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.dimWeeztixEvent.findUnique({
        where: { id: input.eventId },
        include: {
          ticketTypes: {
            include: {
              orderItems: {
                select: {
                  quantity: true,
                  totalPrice: true,
                },
              },
            },
          },
          dailySales: {
            orderBy: { date: { date: 'asc' } },
            include: {
              date: true,
            },
          },
        },
      })

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        })
      }

      // Calculate ticket type metrics
      const ticketTypeMetrics = event.ticketTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        price: tt.price / 100,
        quantitySold: tt.quantitySold,
        totalQuantity: tt.totalQuantity,
        revenue: tt.totalRevenue / 100,
        percentageSold: tt.totalQuantity
          ? Math.round((tt.quantitySold / tt.totalQuantity) * 100)
          : 0,
      }))

      // Daily sales trend
      const salesTrend = event.dailySales.map((ds) => ({
        date: ds.date.date,
        ticketsSold: ds.ticketsSold,
        revenue: ds.revenue / 100,
        orderCount: ds.orderCount,
      }))

      return {
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          imageUrl: event.imageUrl,
          venueName: event.venueName,
          venueCity: event.venueCity,
          venueCountry: event.venueCountry,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          totalCapacity: event.totalCapacity,
          ticketsSold: event.ticketsSold,
          totalRevenue: event.totalRevenue / 100,
          currency: event.currency,
          soldOutAt: event.soldOutAt,
        },
        ticketTypeMetrics,
        salesTrend,
      }
    }),

  // Get overall ticketing analytics
  getAnalytics: protectedProcedure
    .input(
      z.object({
        eventId: z.string().optional(), // Filter by specific event
        days: z.number().min(7).max(365).optional().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const connection = await ctx.db.weeztixConnection.findFirst({
        where: { userId: ctx.session.user.id, status: 'ACTIVE' },
      })

      if (!connection) {
        return null
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      // Get events for this connection
      const eventFilter = input.eventId ? { id: input.eventId } : { connectionId: connection.id }

      const events = await ctx.db.dimWeeztixEvent.findMany({
        where: eventFilter,
        select: {
          id: true,
          name: true,
          ticketsSold: true,
          totalRevenue: true,
          totalCapacity: true,
          startDate: true,
        },
      })

      // Get daily sales aggregates
      const dailySales = await ctx.db.factWeeztixDailySales.findMany({
        where: {
          eventId: { in: events.map((e) => e.id) },
          date: { date: { gte: cutoffDate } },
        },
        include: { date: true },
        orderBy: { date: { date: 'asc' } },
      })

      // Get recent orders
      const recentOrders = await ctx.db.factWeeztixOrder.findMany({
        where: {
          eventId: { in: events.map((e) => e.id) },
          createdAt: { gte: cutoffDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      // Calculate totals
      const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0)
      const totalTicketsSold = events.reduce((sum, e) => sum + e.ticketsSold, 0)
      const totalCapacity = events.reduce((sum, e) => sum + (e.totalCapacity ?? 0), 0)

      // Payment method breakdown
      const paymentMethods: Record<string, number> = {}
      recentOrders.forEach((order) => {
        const method = order.paymentMethod ?? 'unknown'
        paymentMethods[method] = (paymentMethods[method] ?? 0) + 1
      })

      // Device breakdown
      const devices: Record<string, number> = {}
      recentOrders.forEach((order) => {
        const device = order.deviceType ?? 'unknown'
        devices[device] = (devices[device] ?? 0) + 1
      })

      // UTM source breakdown
      const utmSources: Record<string, number> = {}
      recentOrders.forEach((order) => {
        if (order.utmSource) {
          utmSources[order.utmSource] = (utmSources[order.utmSource] ?? 0) + 1
        }
      })

      return {
        summary: {
          totalRevenue: totalRevenue / 100,
          totalTicketsSold,
          totalCapacity,
          fillRate: totalCapacity ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0,
          totalEvents: events.length,
          averageOrderValue:
            recentOrders.length > 0
              ? recentOrders.reduce((sum, o) => sum + o.totalAmount, 0) / recentOrders.length / 100
              : 0,
        },
        dailySalesTrend: dailySales.map((ds) => ({
          date: ds.date.date,
          ticketsSold: ds.ticketsSold,
          revenue: ds.revenue / 100,
          orderCount: ds.orderCount,
        })),
        breakdowns: {
          paymentMethods,
          devices,
          utmSources,
        },
        topEvents: events
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5)
          .map((e) => ({
            id: e.id,
            name: e.name,
            ticketsSold: e.ticketsSold,
            revenue: e.totalRevenue / 100,
            startDate: e.startDate,
          })),
      }
    }),

  // Sync events and orders from Weeztix API (placeholder - needs actual API integration)
  syncData: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await ctx.db.weeztixConnection.findFirst({
      where: { userId: ctx.session.user.id, status: 'ACTIVE' },
    })

    if (!connection) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No active Weeztix connection',
      })
    }

    // TODO: Implement actual Weeztix API calls here
    // For now, this is a placeholder that updates the sync timestamp

    await ctx.db.weeztixConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
      },
    })

    return {
      success: true,
      message: 'Sync completed (placeholder - API integration pending)',
      eventsCount: 0,
      ordersCount: 0,
    }
  }),
})
