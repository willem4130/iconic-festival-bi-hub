import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

const generalSettingsInput = z.object({
  siteName: z.string().min(1),
  siteUrl: z.string().url().optional().nullable(),
  timezone: z.string(),
})

const appearanceSettingsInput = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  accentColor: z.string(),
})

const notificationSettingsInput = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
})

export const settingsRouter = createTRPCRouter({
  // Get all application settings (creates default if doesn't exist)
  getSettings: publicProcedure.query(async ({ ctx }) => {
    // Find the first settings record or create default
    let settings = await ctx.db.appSettings.findFirst()

    if (!settings) {
      settings = await ctx.db.appSettings.create({
        data: {
          siteName: 'My App',
          timezone: 'UTC',
          theme: 'system',
          accentColor: '#000000',
          emailNotifications: true,
          pushNotifications: false,
        },
      })
    }

    return settings
  }),

  // Update general settings
  updateGeneral: publicProcedure.input(generalSettingsInput).mutation(async ({ ctx, input }) => {
    const settings = await ctx.db.appSettings.findFirst()

    if (!settings) {
      // Create new settings with general values
      return await ctx.db.appSettings.create({
        data: {
          ...input,
        },
      })
    }

    // Update existing settings
    return await ctx.db.appSettings.update({
      where: { id: settings.id },
      data: input,
    })
  }),

  // Update appearance settings
  updateAppearance: publicProcedure
    .input(appearanceSettingsInput)
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.appSettings.findFirst()

      if (!settings) {
        return await ctx.db.appSettings.create({
          data: input,
        })
      }

      return await ctx.db.appSettings.update({
        where: { id: settings.id },
        data: input,
      })
    }),

  // Update notification settings
  updateNotifications: publicProcedure
    .input(notificationSettingsInput)
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.appSettings.findFirst()

      if (!settings) {
        return await ctx.db.appSettings.create({
          data: input,
        })
      }

      return await ctx.db.appSettings.update({
        where: { id: settings.id },
        data: input,
      })
    }),

  // Get database connection status
  getDatabaseStatus: publicProcedure.query(async ({ ctx }) => {
    try {
      // Try to execute a simple query to check connection
      await ctx.db.$queryRaw`SELECT 1`

      return {
        connected: true,
        provider: 'PostgreSQL',
        message: 'Database connection is healthy',
      }
    } catch (error) {
      return {
        connected: false,
        provider: 'Unknown',
        message: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }),
})
