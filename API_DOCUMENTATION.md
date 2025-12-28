# Protected API Routes with Rate Limiting

Complete implementation of secure, rate-limited REST API endpoints for your Next.js application.

## ✅ What Was Implemented

### **1. Rate Limiting with Upstash Redis**

- ✅ Configurable rate limiting utilities
- ✅ Standard limit: 10 requests per 10 seconds
- ✅ Strict limit: 5 requests per 10 seconds (for sensitive operations)
- ✅ Auth limit: 3 attempts per minute
- ✅ Graceful fallback when Redis is not configured

### **2. API Authentication Middleware**

- ✅ API key authentication (easily replaceable with NextAuth/Clerk)
- ✅ Supports both `Authorization: Bearer` and `x-api-key` headers
- ✅ Automatic validation

### **3. Request Validation**

- ✅ Zod schema validation for all endpoints
- ✅ Proper error messages with validation details
- ✅ Type-safe request handling

### **4. Complete CRUD API Endpoints**

- ✅ **GET /api/posts** - List posts with pagination
- ✅ **POST /api/posts** - Create new post (strict rate limit)
- ✅ **GET /api/posts/[id]** - Get single post
- ✅ **PUT /api/posts/[id]** - Update post (strict rate limit)
- ✅ **DELETE /api/posts/[id]** - Delete post (strict rate limit)

### **5. Utility Endpoints**

- ✅ **GET /api** - API documentation
- ✅ **GET /api/health** - Health check with database status

---

## 📁 File Structure

```
src/
├── lib/
│   ├── rate-limit.ts           # Rate limiting utilities
│   └── api-middleware.ts       # Authentication & validation
├── app/api/
│   ├── route.ts                # API documentation endpoint
│   ├── health/
│   │   └── route.ts            # Health check endpoint
│   └── posts/
│       ├── route.ts            # List & create posts
│       └── [id]/
│           └── route.ts        # Get, update, delete post
```

---

## 🚀 Setup Instructions

### **1. Configure Upstash Redis (Optional - for rate limiting)**

Sign up for free at https://upstash.com (10,000 requests/day)

Add to `.env`:

```bash
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token-here"
```

**Note:** Rate limiting will be **disabled** if these are not configured, but the API will still work.

### **2. Configure API Authentication**

Generate a secure API key (32+ characters):

```bash
openssl rand -base64 32
```

Add to `.env`:

```bash
API_SECRET_KEY="your-generated-secret-key-here"
```

**Note:** If `API_SECRET_KEY` is not set, all API routes are **unprotected** (development mode).

### **3. Set up Database**

Update `.env` with your PostgreSQL credentials:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/yourdb"
DIRECT_URL="postgresql://user:password@localhost:5432/yourdb"
```

Run migrations:

```bash
npm run db:push
# or
npm run db:migrate
```

---

## 📖 API Usage Examples

### **Authentication**

All protected endpoints require an API key. Provide it using either:

**Option 1: Authorization Header**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3000/api/posts
```

**Option 2: x-api-key Header**

```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/api/posts
```

### **Endpoints**

#### **GET /api** - API Documentation

```bash
curl http://localhost:3000/api
```

Returns complete API documentation in JSON format.

#### **GET /api/health** - Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T13:00:00.000Z",
  "database": "connected",
  "uptime": 123.45
}
```

#### **GET /api/posts** - List Posts

```bash
# Basic request
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/posts

# With pagination
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/posts?page=2&limit=20"
```

Response:

```json
{
  "posts": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### **POST /api/posts** - Create Post

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My New Post",
    "content": "Post content here",
    "authorId": "user-id-123"
  }'
```

Response:

```json
{
  "message": "Post created successfully",
  "post": {
    "id": "...",
    "title": "My New Post",
    "content": "Post content here",
    "published": false,
    "author": {...},
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### **GET /api/posts/[id]** - Get Single Post

```bash
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/posts/post-id-123
```

#### **PUT /api/posts/[id]** - Update Post

```bash
curl -X PUT http://localhost:3000/api/posts/post-id-123 \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "published": true
  }'
```

#### **DELETE /api/posts/[id]** - Delete Post

```bash
curl -X DELETE http://localhost:3000/api/posts/post-id-123 \
  -H "x-api-key: YOUR_KEY"
```

---

## 🔒 Rate Limiting

### **Rate Limit Tiers**

1. **Standard**: 10 requests per 10 seconds
   - Used for: GET endpoints

2. **Strict**: 5 requests per 10 seconds
   - Used for: POST, PUT, DELETE endpoints

3. **Auth**: 3 attempts per minute
   - Used for: Authentication endpoints

### **Rate Limit Response**

When rate limit is exceeded:

```json
{
  "error": "Too many requests. Please try again later.",
  "details": {
    "limit": 10,
    "remaining": 0,
    "reset": "2025-11-11T13:05:00.000Z"
  }
}
```

HTTP Status: `429 Too Many Requests`

---

## ⚠️ Error Responses

### **401 Unauthorized** - Missing API Key

```json
{
  "error": "Missing API key. Provide via Authorization header or x-api-key header."
}
```

### **403 Forbidden** - Invalid API Key

```json
{
  "error": "Invalid API key"
}
```

### **400 Bad Request** - Validation Error

```json
{
  "error": "Validation error",
  "details": [
    {
      "path": ["title"],
      "message": "Title is required"
    }
  ]
}
```

### **404 Not Found**

```json
{
  "error": "Post not found"
}
```

### **429 Too Many Requests**

```json
{
  "error": "Too many requests. Please try again later.",
  "details": {
    "limit": 10,
    "remaining": 0,
    "reset": "2025-11-11T13:05:00.000Z"
  }
}
```

### **500 Internal Server Error**

```json
{
  "error": "Internal server error",
  "details": {
    "message": "Error details here"
  }
}
```

---

## 🔧 Customization

### **Adding New Protected Endpoints**

```typescript
// src/app/api/your-endpoint/route.ts
import { NextRequest } from 'next/server'
import { protectedRoute, apiResponse, validateRequest } from '@/lib/api-middleware'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
})

export async function POST(request: NextRequest) {
  return protectedRoute(
    request,
    async (req) => {
      const { data, error } = await validateRequest(req, schema)
      if (error) return error

      // Your logic here

      return apiResponse({ success: true, data })
    },
    { strictRateLimit: true } // Optional
  )
}
```

### **Replacing API Key Auth with NextAuth**

Update `src/lib/api-middleware.ts`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function withAuth(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return apiError('Unauthorized', 401)
  }

  return null // Auth passed
}
```

### **Custom Rate Limits**

Add to `src/lib/rate-limit.ts`:

```typescript
export const customRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'), // 20 req/min
      analytics: true,
      prefix: '@api/custom-ratelimit',
    })
  : null
```

---

## 🧪 Testing

### **Manual Testing**

```bash
# Start dev server
npm run dev

# Test endpoints
curl http://localhost:3000/api
curl http://localhost:3000/api/health
curl -H "x-api-key: test" http://localhost:3000/api/posts
```

### **Automated Tests**

Create tests in `tests/integration/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('API Endpoints', () => {
  it('should require authentication', async () => {
    const res = await fetch('http://localhost:3000/api/posts')
    expect(res.status).toBe(401)
  })

  it('should accept valid API key', async () => {
    const res = await fetch('http://localhost:3000/api/posts', {
      headers: { 'x-api-key': process.env.API_SECRET_KEY! },
    })
    expect(res.status).toBe(200)
  })
})
```

---

## 🎯 Next Steps

1. **Configure Upstash Redis** for rate limiting
2. **Set up production database** (PostgreSQL)
3. **Generate and configure API_SECRET_KEY**
4. **Replace API key auth with your preferred solution** (NextAuth, Clerk, etc.)
5. **Add more endpoints** following the same pattern
6. **Write tests** for your API routes
7. **Deploy to production** (Vercel recommended)

---

## 📚 Resources

- **Upstash Redis**: https://upstash.com
- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Zod Validation**: https://zod.dev
- **Prisma**: https://prisma.io

---

## ✅ Summary

You now have a **production-ready API** with:

- ✅ Rate limiting (Upstash Redis)
- ✅ Authentication middleware
- ✅ Request validation
- ✅ Complete CRUD operations
- ✅ Proper error handling
- ✅ Type-safe endpoints
- ✅ Documentation

All endpoints follow Next.js App Router conventions and are ready to scale! 🚀
