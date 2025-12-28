/**
 * Upload tRPC Router
 *
 * Handles file upload processing, parsing, and status tracking.
 */

import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { parseExcelStream } from '@/lib/excel/parser'
import { validateUpload } from '@/lib/validation/business-rules'
import type { ParsedPickRow, ParsedLocationRow } from '@/lib/excel/types'

// ==========================================
// UPLOAD ROUTER
// ==========================================

export const uploadRouter = createTRPCRouter({
  /**
   * Get all uploads for a project
   */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify project access
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      if (project.createdByUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to this project",
        })
      }

      // Fetch uploads
      const uploads = await ctx.db.upload.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          _count: {
            select: {
              validationErrors: true,
              picks: true,
              locations: true,
            },
          },
        },
      })

      let nextCursor: string | undefined = undefined
      if (uploads.length > input.limit) {
        const nextItem = uploads.pop()
        nextCursor = nextItem?.id
      }

      return {
        uploads,
        nextCursor,
      }
    }),

  /**
   * Get upload by ID with full details
   */
  get: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const upload = await ctx.db.upload.findUnique({
        where: { id: input.uploadId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              createdByUserId: true,
            },
          },
          validationErrors: {
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
          _count: {
            select: {
              picks: true,
              locations: true,
              bays: true,
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

      return upload
    }),

  /**
   * Process uploaded file (parse Excel and store data)
   */
  process: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        sheetName: z.string().optional(),
        columnMapping: z.record(z.string(), z.string()).optional(),
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

      // Update status to processing
      await ctx.db.upload.update({
        where: { id: input.uploadId },
        data: { status: 'MAPPING' },
      })

      try {
        // Fetch file from Vercel Blob
        const response = await fetch(upload.filePath)
        if (!response.ok) {
          throw new Error('Failed to fetch file from storage')
        }

        const arrayBuffer = await response.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        // Parse PICK sheet (simplified - you'd implement full sheet detection)
        const pickResult = await parseExcelStream<ParsedPickRow>(fileBuffer, {
          sheetType: 'PICK',
          sheet: input.sheetName ?? 0,
          columnMapping: (input.columnMapping ?? {}) as Record<string, string>,
          onProgress: async (progress) => {
            // Update database with progress
            await ctx.db.upload.update({
              where: { id: input.uploadId },
              data: {
                processedRows: progress.processedRows,
                totalRows: progress.totalRows,
              },
            })
          },
        })

        if (!pickResult.success) {
          throw new Error(pickResult.error)
        }

        // Parse LOCATION sheet
        const locationResult = await parseExcelStream<ParsedLocationRow>(fileBuffer, {
          sheetType: 'LOCATION',
          sheet: input.sheetName ?? 1,
          columnMapping: (input.columnMapping ?? {}) as Record<string, string>,
        })

        if (!locationResult.success) {
          throw new Error(locationResult.error)
        }

        // Validate data
        const validationResult = validateUpload(pickResult.data, locationResult.data)

        // Store picks
        const picks = await ctx.db.pick.createMany({
          data: pickResult.data.map((row) => ({
            uploadId: input.uploadId,
            article: row.article,
            articleDescription: row.articleDescription,
            family: row.family,
            pickFrequency: row.pickFrequency,
            location: row.location,
            quantity: row.quantity,
            uniqueArticles: row.uniqueArticles,
          })),
          skipDuplicates: true,
        })

        // Store locations
        const locations = await ctx.db.location.createMany({
          data: locationResult.data.map((row) => ({
            uploadId: input.uploadId,
            location: row.location,
            storageType: row.storageType,
            locationLength: row.locationLength,
            locationWidth: row.locationWidth,
            locationHeight: row.locationHeight,
            capacityLayout: row.capacityLayout,
            locationCategory: row.locationCategory,
            bay: row.bay,
            parsedCapacityLayout: row.capacityLayout.split('-').map((v) => parseFloat(v)),
            totalCapacity: row.locationLength * row.locationWidth * row.locationHeight,
          })),
          skipDuplicates: true,
        })

        // Store validation errors
        if (validationResult.errors.length > 0) {
          await ctx.db.validationError.createMany({
            data: validationResult.errors.map((error) => ({
              uploadId: input.uploadId,
              severity: error.severity,
              errorCode: error.errorCode,
              errorMessage: error.errorMessage,
              rowNumber: error.rowNumber,
              columnName: error.columnName,
              affectedValue: error.affectedValue,
              suggestedFix: error.suggestedFix,
            })),
          })
        }

        // Update upload status
        await ctx.db.upload.update({
          where: { id: input.uploadId },
          data: {
            status: validationResult.isValid ? 'COMPLETED' : 'FAILED',
            statusMessage: validationResult.isValid
              ? 'Processing completed successfully'
              : `Processing completed with ${validationResult.errors.length} errors`,
            totalRows: pickResult.totalRows + locationResult.totalRows,
            processedRows: pickResult.processedRows + locationResult.processedRows,
            completedAt: new Date(),
          },
        })

        return {
          success: true,
          picksCreated: picks.count,
          locationsCreated: locations.count,
          validationErrors: validationResult.errors.length,
          validationWarnings: validationResult.warnings.length,
        }
      } catch (error) {
        // Update upload status to failed
        await ctx.db.upload.update({
          where: { id: input.uploadId },
          data: {
            status: 'FAILED',
            statusMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process upload',
          cause: error,
        })
      }
    }),

  /**
   * Delete upload and all associated data
   */
  delete: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      await ctx.db.upload.delete({
        where: { id: input.uploadId },
      })

      return { success: true }
    }),
})
