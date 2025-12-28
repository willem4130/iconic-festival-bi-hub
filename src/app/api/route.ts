import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/api-middleware'

/**
 * GET /api - API Documentation
 * Public: No authentication required
 * Returns available API endpoints and usage information
 */
export async function GET(_request: NextRequest) {
  return apiResponse({
    name: 'Iconic Website API',
    version: '1.0.0',
    documentation: {
      endpoints: {
        health: {
          path: '/api/health',
          method: 'GET',
          description: 'Health check endpoint',
          authentication: 'None',
        },
        posts: {
          list: {
            path: '/api/posts',
            method: 'GET',
            description: 'List all posts with pagination',
            authentication: 'Required',
            queryParams: {
              page: 'Page number (default: 1)',
              limit: 'Items per page (default: 10, max: 100)',
            },
          },
          create: {
            path: '/api/posts',
            method: 'POST',
            description: 'Create a new post',
            authentication: 'Required',
            rateLimit: 'Strict (5 requests per 10 seconds)',
            body: {
              title: 'string (required, max 200)',
              content: 'string (optional)',
              authorId: 'string (required)',
            },
          },
          get: {
            path: '/api/posts/[id]',
            method: 'GET',
            description: 'Get a single post by ID',
            authentication: 'Required',
          },
          update: {
            path: '/api/posts/[id]',
            method: 'PUT',
            description: 'Update a post',
            authentication: 'Required',
            rateLimit: 'Strict (5 requests per 10 seconds)',
            body: {
              title: 'string (optional, max 200)',
              content: 'string (optional)',
              published: 'boolean (optional)',
            },
          },
          delete: {
            path: '/api/posts/[id]',
            method: 'DELETE',
            description: 'Delete a post',
            authentication: 'Required',
            rateLimit: 'Strict (5 requests per 10 seconds)',
          },
        },
      },
      authentication: {
        description: 'API endpoints require authentication via API key',
        methods: [
          {
            name: 'Authorization Header',
            example: 'Authorization: Bearer YOUR_API_KEY',
          },
          {
            name: 'X-API-Key Header',
            example: 'x-api-key: YOUR_API_KEY',
          },
        ],
        note: 'Set API_SECRET_KEY in your environment variables',
      },
      rateLimit: {
        standard: '10 requests per 10 seconds',
        strict: '5 requests per 10 seconds (for create/update/delete operations)',
        headers: {
          'x-ratelimit-limit': 'Maximum requests allowed',
          'x-ratelimit-remaining': 'Remaining requests in current window',
          'x-ratelimit-reset': 'Timestamp when rate limit resets',
        },
      },
    },
  })
}
