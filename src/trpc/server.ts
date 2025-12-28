import 'server-only'
import { createTRPCContext } from '@/server/api/trpc'
import { appRouter } from '@/server/api/root'
import { createCallerFactory } from '@/server/api/trpc'
import { headers } from 'next/headers'
import { cache } from 'react'

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = await headers()
  return createTRPCContext({
    headers: heads,
  })
})

const createCaller = createCallerFactory(appRouter)

export const api = createCaller(createContext)
