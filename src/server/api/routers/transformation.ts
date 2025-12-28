/**
 * Transformation tRPC Router
 *
 * Handles bay transformation and location grouping.
 */

import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import {
  transformLocationsToBays,
  calculateBayMetrics,
  detectBestStrategy,
} from '@/lib/transformation/bay-grouping'
import type { ParsedLocationRow } from '@/lib/excel/types'

const bayTransformStrategySchema = z.enum([
  'NAMING_CONVENTION',
  'PHYSICAL_PROXIMITY',
  'MANUAL_MAPPING',
])

export const transformationRouter = createTRPCRouter({
  /**
   * Transform locations to bays
   */
  transformToBays: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        strategy: bayTransformStrategySchema,
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch upload
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
          locations: true,
          picks: true,
        },
      })

      if (!upload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Upload not found',
        })
      }

      if (upload.project.createdByUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to this upload",
        })
      }

      // Update upload status
      await ctx.db.upload.update({
        where: { id: input.uploadId },
        data: { status: 'TRANSFORMING' },
      })

      try {
        // Transform locations to bays
        const locationRows: ParsedLocationRow[] = upload.locations.map((loc) => ({
          location: loc.location,
          storageType: loc.storageType,
          locationLength: loc.locationLength,
          locationWidth: loc.locationWidth,
          locationHeight: loc.locationHeight,
          capacityLayout: loc.capacityLayout,
          locationCategory: loc.locationCategory,
          bay: loc.bay,
        }))

        const groupingResults = transformLocationsToBays(locationRows, input.strategy, input.config)

        // Calculate bay metrics
        const bayMetrics = calculateBayMetrics(groupingResults, locationRows)

        // Create bay records
        const bays = []
        for (const [bayCode, metrics] of bayMetrics.entries()) {
          // Calculate unique articles for this bay
          const locationCodes = new Set(metrics.locations)
          const uniqueArticles = new Set(
            upload.picks
              .filter((pick) => locationCodes.has(pick.location))
              .map((pick) => pick.article)
          ).size

          // Calculate total pick frequency for this bay
          const totalPickFrequency = upload.picks
            .filter((pick) => locationCodes.has(pick.location))
            .reduce((sum, pick) => sum + pick.pickFrequency, 0)

          const bay = await ctx.db.bay.create({
            data: {
              uploadId: input.uploadId,
              bayCode,
              bayName: bayCode,
              locationCount: metrics.locationCount,
              uniqueArticles,
              totalPickFrequency,
            },
          })

          bays.push(bay)

          // Update locations with bay reference
          await ctx.db.location.updateMany({
            where: {
              uploadId: input.uploadId,
              location: {
                in: metrics.locations,
              },
            },
            data: {
              bayId: bay.id,
              bay: bayCode,
            },
          })
        }

        // Update upload status
        await ctx.db.upload.update({
          where: { id: input.uploadId },
          data: {
            status: 'COMPLETED',
            bayTransformStrategy: input.strategy,
            bayTransformConfig: (input.config ?? {}) as any,
          },
        })

        return {
          success: true,
          baysCreated: bays.length,
          bays,
        }
      } catch (error) {
        // Update upload status to failed
        await ctx.db.upload.update({
          where: { id: input.uploadId },
          data: {
            status: 'FAILED',
            statusMessage: error instanceof Error ? error.message : 'Transformation failed',
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to transform bays',
          cause: error,
        })
      }
    }),

  /**
   * Detect best transformation strategy
   */
  detectStrategy: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }): Promise<{ recommendedStrategy: any; sampleSize: number }> => {
      // Fetch upload with locations
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
          locations: {
            take: 100, // Sample first 100 locations
          },
        },
      })

      if (!upload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Upload not found',
        })
      }

      if (upload.project.createdByUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to this upload",
        })
      }

      // Convert to ParsedLocationRow format
      const locationRows: ParsedLocationRow[] = upload.locations.map((loc) => ({
        location: loc.location,
        storageType: loc.storageType,
        locationLength: loc.locationLength,
        locationWidth: loc.locationWidth,
        locationHeight: loc.locationHeight,
        capacityLayout: loc.capacityLayout,
        locationCategory: loc.locationCategory,
        bay: loc.bay,
      }))

      const bestStrategy = detectBestStrategy(locationRows)

      return {
        recommendedStrategy: bestStrategy,
        sampleSize: locationRows.length,
      }
    }),

  /**
   * Get bay metrics for an upload
   */
  getBayMetrics: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch upload with bays
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
          bays: {
            orderBy: {
              totalPickFrequency: 'desc',
            },
          },
        },
      })

      if (!upload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Upload not found',
        })
      }

      if (upload.project.createdByUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to this upload",
        })
      }

      return {
        bays: upload.bays,
        totalBays: upload.bays.length,
      }
    }),
})
