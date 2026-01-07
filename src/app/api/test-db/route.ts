/**
 * Test endpoint to verify database connectivity
 * GET /api/test-db
 */

import { NextResponse } from 'next/server'
import { db } from '@/server/db'

export async function GET() {
  try {
    // Test 1: Check if we can connect
    console.log('Test DB - checking connection...')

    // Test 2: Try to count OAuthState records
    const stateCount = await db.oAuthState.count()
    console.log('Test DB - OAuthState count:', stateCount)

    // Test 3: Try to count MetaConnection records
    const connectionCount = await db.metaConnection.count()
    console.log('Test DB - MetaConnection count:', connectionCount)

    // Test 4: Try to create and delete a test OAuthState
    const testState = await db.oAuthState.create({
      data: {
        state: 'test-' + Date.now(),
        expiresAt: new Date(Date.now() + 60000),
      },
    })
    console.log('Test DB - created test state:', testState.id)

    await db.oAuthState.delete({ where: { id: testState.id } })
    console.log('Test DB - deleted test state')

    return NextResponse.json({
      success: true,
      stateCount,
      connectionCount,
      message: 'Database connection working',
    })
  } catch (error) {
    console.error('Test DB - ERROR:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
