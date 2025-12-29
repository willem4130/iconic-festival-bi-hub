/**
 * This is the primary configuration file for your tRPC server.
 * It's where you initialize the tRPC context, define middleware, and create reusable procedures.
 */
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { db } from '@/server/db'
import { type Session } from 'next-auth'

/**
 * Creates the context for incoming requests
 */
export const createTRPCContext = async (opts: { headers: Headers; session?: Session | null }) => {
  return {
    db,
    session: opts.session ?? null,
    ...opts,
  }
}

/**
 * Initialize tRPC with transformer and error formatter
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Reusable router and procedure helpers
 */
export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

/**
 * Public procedure - can be accessed by anyone
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 * In development, bypasses auth check for easier testing
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  // Allow bypass in development for testing
  if (process.env.NODE_ENV === 'development') {
    const devSession = {
      user: { id: 'dev-user', name: 'Dev User', email: 'dev@localhost' },
      expires: '',
    }
    return next({
      ctx: {
        ...ctx,
        session: ctx.session ?? devSession,
      } as typeof ctx & {
        session: { user: { id: string; name: string; email: string }; expires: string }
      },
    })
  }

  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    } as typeof ctx & {
      session: NonNullable<typeof ctx.session> & {
        user: NonNullable<NonNullable<typeof ctx.session>['user']>
      }
    },
  })
})
