import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const usersRouter = createTRPCRouter({
  // Get all users with pagination
  getAll: publicProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(50),
          role: z.enum(['USER', 'ADMIN']).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1
      const limit = input?.limit ?? 50
      const skip = (page - 1) * limit

      const where = {
        ...(input?.role ? { role: input.role } : {}),
        ...(input?.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' as const } },
                { email: { contains: input.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        ctx.db.user.count({ where }),
      ])

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    }),

  // Get user stats
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [totalUsers, adminUsers, regularUsers, recentUsers] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { role: 'ADMIN' } }),
      ctx.db.user.count({ where: { role: 'USER' } }),
      ctx.db.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
    ])

    return {
      total: totalUsers,
      admins: adminUsers,
      users: regularUsers,
      newThisMonth: recentUsers,
    }
  }),

  // Get single user by ID
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: input.id },
      include: {
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
        sessions: {
          select: {
            id: true,
            expires: true,
          },
          take: 5,
          orderBy: { expires: 'desc' },
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  }),

  // Update user role
  updateRole: publicProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum(['USER', 'ADMIN']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: input.id },
        data: { role: input.role },
      })
    }),
})
