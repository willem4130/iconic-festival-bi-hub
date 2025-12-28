/**
 * Analytics tRPC Router
 *
 * Handles Pareto analysis and BI dashboard data.
 */

import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import {
  calculatePickFrequencyPareto,
  calculateUniqueArticlesPareto,
  calculateQuantityPareto,
  calculateLocationUtilizationPareto,
  calculateBayProductivityPareto,
  generateComprehensivePareto,
  generateParetoInsights,
} from '@/lib/analytics/pareto'
import type { ParsedPickRow, ParsedLocationRow } from '@/lib/excel/types'
import type { BayData } from '@/lib/analytics/pareto'

export const analyticsRouter = createTRPCRouter({
  /**
   * Calculate Pareto analysis for pick frequency
   */
  pickFrequencyPareto: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        groupBy: z.enum(['article', 'location', 'family']).default('article'),
      })
    )
    .query(async ({ ctx, input }) => {
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
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

      const picks: ParsedPickRow[] = upload.picks.map((pick) => ({
        article: pick.article,
        articleDescription: pick.articleDescription,
        family: pick.family,
        pickFrequency: pick.pickFrequency,
        location: pick.location,
        quantity: pick.quantity,
        uniqueArticles: pick.uniqueArticles,
      }))

      const result = calculatePickFrequencyPareto(picks, input.groupBy)
      const insights = generateParetoInsights(result)

      // Store analysis in database
      await ctx.db.paretoAnalysis.create({
        data: {
          uploadId: input.uploadId,
          dimension: 'pickFrequency',
          groupBy: input.groupBy,
          paretoData: result.data as any,
        },
      })

      return {
        ...result,
        insights,
      }
    }),

  /**
   * Calculate comprehensive Pareto analysis
   */
  comprehensivePareto: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
          picks: true,
          locations: true,
          bays: true,
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

      const picks: ParsedPickRow[] = upload.picks.map((pick) => ({
        article: pick.article,
        articleDescription: pick.articleDescription,
        family: pick.family,
        pickFrequency: pick.pickFrequency,
        location: pick.location,
        quantity: pick.quantity,
        uniqueArticles: pick.uniqueArticles,
      }))

      const locations: ParsedLocationRow[] = upload.locations.map((loc) => ({
        location: loc.location,
        storageType: loc.storageType,
        locationLength: loc.locationLength,
        locationWidth: loc.locationWidth,
        locationHeight: loc.locationHeight,
        capacityLayout: loc.capacityLayout,
        locationCategory: loc.locationCategory,
        bay: loc.bay,
      }))

      const bayData: BayData[] | undefined =
        upload.bays.length > 0
          ? upload.bays.map((bay) => ({
              bayCode: bay.bayCode,
              locationCount: bay.locationCount,
              uniqueArticles: bay.uniqueArticles,
              totalPickFrequency: bay.totalPickFrequency,
            }))
          : undefined

      const result = generateComprehensivePareto(picks, locations, bayData)

      // Store all analyses
      for (const [key, analysis] of Object.entries(result)) {
        if (analysis) {
          await ctx.db.paretoAnalysis.create({
            data: {
              uploadId: input.uploadId,
              dimension: analysis.dimension,
              groupBy: analysis.groupBy ?? null,
              paretoData: analysis.data as any,
            },
          })
        }
      }

      return result
    }),

  /**
   * Get stored Pareto analyses
   */
  getAnalyses: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        dimension: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
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

      const analyses = await ctx.db.paretoAnalysis.findMany({
        where: {
          uploadId: input.uploadId,
          dimension: input.dimension,
        },
        orderBy: {
          calculatedAt: 'desc',
        },
      })

      return analyses
    }),

  /**
   * Get location utilization metrics
   */
  locationUtilization: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
          locationUtilizations: {
            orderBy: {
              pickDensity: 'desc',
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
        utilizations: upload.locationUtilizations,
        summary: {
          total: upload.locationUtilizations.length,
          underutilized: upload.locationUtilizations.filter(
            (u) => u.utilizationClass === 'Underutilized'
          ).length,
          optimal: upload.locationUtilizations.filter((u) => u.utilizationClass === 'Optimal')
            .length,
          overutilized: upload.locationUtilizations.filter(
            (u) => u.utilizationClass === 'Overutilized'
          ).length,
        },
      }
    }),

  /**
   * Get dashboard summary statistics
   */
  dashboardSummary: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
          _count: {
            select: {
              picks: true,
              locations: true,
              bays: true,
              validationErrors: true,
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

      // Calculate aggregate statistics
      const [pickStats, locationStats] = await Promise.all([
        ctx.db.pick.aggregate({
          where: { uploadId: input.uploadId },
          _sum: {
            pickFrequency: true,
            quantity: true,
          },
          _avg: {
            pickFrequency: true,
            quantity: true,
          },
        }),
        ctx.db.location.aggregate({
          where: { uploadId: input.uploadId },
          _sum: {
            totalCapacity: true,
          },
          _avg: {
            totalCapacity: true,
          },
        }),
      ])

      return {
        counts: {
          picks: upload._count.picks,
          locations: upload._count.locations,
          bays: upload._count.bays,
          validationErrors: upload._count.validationErrors,
        },
        pickStats: {
          totalPickFrequency: pickStats._sum.pickFrequency ?? 0,
          avgPickFrequency: pickStats._avg.pickFrequency ?? 0,
          totalQuantity: pickStats._sum.quantity ?? 0,
          avgQuantity: pickStats._avg.quantity ?? 0,
        },
        locationStats: {
          totalCapacity: locationStats._sum.totalCapacity ?? 0,
          avgCapacity: locationStats._avg.totalCapacity ?? 0,
        },
      }
    }),
})
