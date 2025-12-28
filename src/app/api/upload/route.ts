/**
 * File Upload API Route
 *
 * Handles Excel file uploads with:
 * - Vercel Blob storage
 * - Rate limiting (100 requests/10min per IP)
 * - File validation (.xlsx/.xls only, max 5GB)
 * - Upload tracking in database
 */

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { ratelimit, getClientIdentifier } from '@/lib/rate-limit'
import { getServerAuthSession } from '@/server/auth'

// ==========================================
// CONFIGURATION
// ==========================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
]

// ==========================================
// UPLOAD HANDLER
// ==========================================

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting (if configured)
    if (ratelimit) {
      const identifier = getClientIdentifier(request)
      const rateLimitResult = await ratelimit.limit(identifier)

      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: Math.floor((rateLimitResult.reset - Date.now()) / 1000),
          },
          { status: 429 }
        )
      }
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB`,
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Only .xlsx and .xls files are allowed',
        },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await db.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 })
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Create upload record in database
    const upload = await db.upload.create({
      data: {
        projectId,
        fileName: blob.pathname,
        originalFileName: file.name,
        fileSize: file.size,
        filePath: blob.url,
        mimeType: file.type,
        status: 'UPLOADING',
        uploadedByUserId: session.user.id,
        totalRows: 0,
        processedRows: 0,
      },
    })

    return NextResponse.json(
      {
        success: true,
        uploadId: upload.id,
        blobUrl: blob.url,
        fileName: file.name,
        fileSize: file.size,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload error:', error)

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ==========================================
// GET UPLOAD STATUS
// ==========================================

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get upload ID from query params
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 })
    }

    // Fetch upload with validation errors
    const upload = await db.upload.findUnique({
      where: { id: uploadId },
      include: {
        validationErrors: {
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to first 100 errors
        },
        project: {
          select: {
            id: true,
            name: true,
            createdByUserId: true,
          },
        },
      },
    })

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // Verify user has access
    if (upload.project.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "You don't have access to this upload" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      upload: {
        id: upload.id,
        fileName: upload.originalFileName,
        fileSize: upload.fileSize,
        status: upload.status,
        statusMessage: upload.statusMessage,
        totalRows: upload.totalRows,
        processedRows: upload.processedRows,
        createdAt: upload.createdAt,
        updatedAt: upload.updatedAt,
        completedAt: upload.completedAt,
        validationErrors: upload.validationErrors,
      },
    })
  } catch (error) {
    console.error('Get upload status error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch upload status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ==========================================
// DELETE UPLOAD
// ==========================================

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get upload ID from query params
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 })
    }

    // Fetch upload to verify access
    const upload = await db.upload.findUnique({
      where: { id: uploadId },
      include: {
        project: {
          select: {
            createdByUserId: true,
          },
        },
      },
    })

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // Verify user has access
    if (upload.project.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "You don't have access to this upload" }, { status: 403 })
    }

    // Delete from database (cascade will delete related records)
    await db.upload.delete({
      where: { id: uploadId },
    })

    // Note: Vercel Blob files can be deleted separately if needed
    // For now, we keep them for audit purposes

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully',
    })
  } catch (error) {
    console.error('Delete upload error:', error)

    return NextResponse.json(
      {
        error: 'Failed to delete upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
