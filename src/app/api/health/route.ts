import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/api-middleware'
import { db } from '@/server/db'

/**
 * GET /api/health - Production-ready health check endpoint
 * Public: No authentication required
 * Tests database, blob storage, and returns comprehensive system metrics
 *
 * Response format:
 * {
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   timestamp: ISO timestamp,
 *   version: package version,
 *   uptime: process uptime in seconds,
 *   checks: {
 *     database: { status, latency, pool? },
 *     blobStorage: { status, configured },
 *     memory: { usage, percentUsed }
 *   }
 * }
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  const checks: Record<string, unknown> = {}
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  // 1. Database connection check with latency measurement
  try {
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart

    checks.database = {
      status: 'connected',
      latency: `${dbLatency}ms`,
    }

    // Warn if database latency > 500ms
    if (dbLatency > 500) {
      overallStatus = 'degraded'
    }
  } catch (error) {
    checks.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    overallStatus = 'unhealthy'
  }

  // 2. Blob storage configuration check
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    checks.blobStorage = {
      status: blobToken ? 'configured' : 'not-configured',
      configured: !!blobToken,
    }

    if (!blobToken && process.env.NODE_ENV === 'production') {
      overallStatus = 'degraded'
    }
  } catch (error) {
    checks.blobStorage = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    overallStatus = 'degraded'
  }

  // 3. Memory usage check
  try {
    const memUsage = process.memoryUsage()
    const totalMemory = memUsage.heapTotal
    const usedMemory = memUsage.heapUsed
    const percentUsed = ((usedMemory / totalMemory) * 100).toFixed(2)

    checks.memory = {
      heapUsed: `${(usedMemory / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`,
      percentUsed: `${percentUsed}%`,
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    }

    // Warn if memory usage > 85%
    if (parseFloat(percentUsed) > 85) {
      overallStatus = 'degraded'
    }
  } catch (error) {
    checks.memory = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  const responseTime = Date.now() - startTime

  return apiResponse(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      uptime: `${process.uptime().toFixed(2)}s`,
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV ?? 'development',
      checks,
    },
    overallStatus === 'unhealthy' ? 503 : 200
  )
}
