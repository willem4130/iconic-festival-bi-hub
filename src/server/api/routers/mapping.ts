/**
 * Mapping tRPC Router
 *
 * Handles column mapping auto-detection and configuration management.
 */

import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import {
  autoDetectPickMappings,
  autoDetectLocationMappings,
  toColumnMapping,
} from '@/lib/mapping/detector'

export const mappingRouter = createTRPCRouter({
  /**
   * Auto-detect column mappings from sample data
   */
  autoDetect: protectedProcedure
    .input(
      z.object({
        columns: z.array(z.string()),
        sheetType: z.enum(['PICK', 'LOCATION']),
        threshold: z.number().min(0).max(1).default(0.7),
      })
    )
    .mutation(({ input }) => {
      const result =
        input.sheetType === 'PICK'
          ? autoDetectPickMappings(input.columns, input.threshold)
          : autoDetectLocationMappings(input.columns, input.threshold)

      return {
        detectionResult: result,
        columnMapping: toColumnMapping(result),
      }
    }),

  /**
   * Create mapping configuration
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        pickMapping: z.record(z.string(), z.string()),
        locationMapping: z.record(z.string(), z.string()),
        autoDetectThreshold: z.number().min(0).max(1).default(0.8),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      // Create mapping configuration
      const mapping = await ctx.db.mappingConfig.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          pickMapping: input.pickMapping as any,
          locationMapping: input.locationMapping as any,
          autoDetectThreshold: input.autoDetectThreshold,
        },
      })

      return mapping
    }),

  /**
   * List mapping configurations for a project
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
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

      return ctx.db.mappingConfig.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get mapping configuration by ID
   */
  get: protectedProcedure
    .input(z.object({ mappingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const mapping = await ctx.db.mappingConfig.findUnique({
        where: { id: input.mappingId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
        },
      })

      if (!mapping) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mapping configuration not found',
        })
      }

      if (mapping.project.createdByUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to this mapping",
        })
      }

      return mapping
    }),

  /**
   * Update mapping configuration
   */
  update: protectedProcedure
    .input(
      z.object({
        mappingId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        pickMapping: z.record(z.string(), z.string()).optional(),
        locationMapping: z.record(z.string(), z.string()).optional(),
        autoDetectThreshold: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mapping = await ctx.db.mappingConfig.findUnique({
        where: { id: input.mappingId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
        },
      })

      if (!mapping) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mapping configuration not found',
        })
      }

      if (mapping.project.createdByUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to this mapping",
        })
      }

      return ctx.db.mappingConfig.update({
        where: { id: input.mappingId },
        data: {
          name: input.name,
          description: input.description,
          pickMapping: input.pickMapping as any,
          locationMapping: input.locationMapping as any,
          autoDetectThreshold: input.autoDetectThreshold,
        },
      })
    }),

  /**
   * Delete mapping configuration
   */
  delete: protectedProcedure
    .input(z.object({ mappingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mapping = await ctx.db.mappingConfig.findUnique({
        where: { id: input.mappingId },
        include: {
          project: {
            select: {
              createdByUserId: true,
            },
          },
        },
      })

      if (!mapping) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mapping configuration not found',
        })
      }

      if (mapping.project.createdByUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to this mapping",
        })
      }

      await ctx.db.mappingConfig.delete({
        where: { id: input.mappingId },
      })

      return { success: true }
    }),
})
