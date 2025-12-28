/**
 * Validation tRPC Router
 *
 * Handles data validation and quality checks.
 */

import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'

export const validationRouter = createTRPCRouter({
  /**
   * Get validation errors for an upload
   */
  getErrors: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        severity: z.enum(['ERROR', 'WARNING', 'INFO']).optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch upload to verify access
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

      // Fetch validation errors
      const errors = await ctx.db.validationError.findMany({
        where: {
          uploadId: input.uploadId,
          severity: input.severity,
        },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: input.limit,
        skip: input.offset,
      })

      // Get total count
      const total = await ctx.db.validationError.count({
        where: {
          uploadId: input.uploadId,
          severity: input.severity,
        },
      })

      return {
        errors,
        total,
        hasMore: input.offset + errors.length < total,
      }
    }),

  /**
   * Get validation summary for an upload
   */
  getSummary: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch upload to verify access
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

      // Get counts by severity
      const errorCount = await ctx.db.validationError.count({
        where: {
          uploadId: input.uploadId,
          severity: 'ERROR',
        },
      })

      const warningCount = await ctx.db.validationError.count({
        where: {
          uploadId: input.uploadId,
          severity: 'WARNING',
        },
      })

      const infoCount = await ctx.db.validationError.count({
        where: {
          uploadId: input.uploadId,
          severity: 'INFO',
        },
      })

      // Get top error codes
      const topErrors = await ctx.db.validationError.groupBy({
        by: ['errorCode'],
        where: {
          uploadId: input.uploadId,
        },
        _count: {
          errorCode: true,
        },
        orderBy: {
          _count: {
            errorCode: 'desc',
          },
        },
        take: 10,
      })

      return {
        summary: {
          errorCount,
          warningCount,
          infoCount,
          totalIssues: errorCount + warningCount + infoCount,
          isValid: errorCount === 0,
        },
        topErrors: topErrors.map((error) => ({
          errorCode: error.errorCode,
          count: error._count.errorCode,
        })),
      }
    }),

  /**
   * Clear validation errors (for reprocessing)
   */
  clearErrors: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch upload to verify access
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

      // Delete all validation errors
      await ctx.db.validationError.deleteMany({
        where: {
          uploadId: input.uploadId,
        },
      })

      return { success: true }
    }),
})
