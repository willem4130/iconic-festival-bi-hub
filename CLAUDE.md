# Iconic Festival BI Hub

Advanced Business Intelligence platform for tracking Facebook & Instagram performance with Apache ECharts visualizations, Claude AI-powered analysis, and Weeztix ticketing integration.

## Repository

**GitHub**: https://github.com/willem4130/iconic-festival-bi-hub
**Production**: https://iconic-bi-hub.vercel.app

> **CRITICAL**: This repo was created from template `willem4130/nextjs-fullstack-template`.
> NEVER push to the template repo - only to `iconic-festival-bi-hub`.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── admin/insights/         # Analytics dashboards
│   │   ├── page.tsx            # Overview dashboard
│   │   ├── comparison/         # FB vs IG comparison
│   │   ├── calendar/           # Content calendar
│   │   ├── content/            # Post performance (NEW)
│   │   ├── ai/                 # AI analysis (NEW)
│   │   └── competitors/        # Competitor tracking (NEW)
│   ├── admin/settings/         # Settings pages
│   └── api/auth/meta/          # Meta OAuth endpoints
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── charts/                 # ECharts wrapper
│   ├── meta/                   # Meta OAuth components
│   └── insights/               # Dashboard components (NEW)
├── server/api/routers/         # tRPC routers
│   ├── meta-auth.ts            # OAuth + sync endpoints
│   ├── meta-insights.ts        # Stored insights queries
│   ├── ai-analysis.ts          # Claude AI analysis (NEW)
│   └── competitors.ts          # Competitor tracking (NEW)
├── lib/
│   ├── meta-api/               # Meta Graph API client
│   ├── ai/                     # Claude AI client (NEW)
│   ├── sentiment-api/          # AWS Comprehend
│   └── weeztix-api/            # Weeztix integration (NEW)
└── trpc/                       # tRPC client config
prisma/
└── schema.prisma               # Database schema
```

## Tech Stack

- **Framework**: Next.js 16 + React 19 (App Router, Turbopack)
- **Language**: TypeScript 5.9
- **API**: tRPC 11 (type-safe endpoints)
- **Database**: Prisma 6 + PostgreSQL (Neon)
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Charts**: Apache ECharts + Recharts
- **Auth**: NextAuth 5 + Meta OAuth
- **AI**: Claude API (Anthropic SDK)

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
npm run typecheck && npm run lint
```

Fix ALL errors/warnings before continuing.

**After database schema changes:**

```bash
npm run db:push && npm run db:generate && npm run typecheck
```

## Organization Rules

- tRPC routers → `src/server/api/routers/` (one router per domain)
- Meta API logic → `src/lib/meta-api/`
- AI logic → `src/lib/ai/`
- Business logic → `src/lib/` (pure functions)
- Components → `src/components/ui/` (shadcn) or feature folders
- Types → co-located or `src/types/`

## Meta OAuth Integration

### Key Files

- `src/server/api/routers/meta-auth.ts` - OAuth + sync (`syncPageInsights`, `syncInstagramInsights`)
- `src/lib/meta-api/page-insights.ts` - Facebook metrics
- `src/lib/meta-api/instagram-insights.ts` - Instagram metrics

### Working Metrics (Nov 2025+)

**Facebook**: `page_post_engagements`, `page_impressions_unique`, `page_video_views`, `page_views_total`, `page_follows`
**Instagram**: `reach`, `impressions`, `follower_count`

### Data Storage

- OAuth tokens → `MetaConnection` table
- Page tokens → `DimAccount.pageAccessToken`
- Daily insights → `FactAccountInsightsDaily`
- Posts → `DimContent` + `FactContentInsights`

## Enhancement Roadmap

### Phase 1: Content Sync - COMPLETE

- [x] Sync FB posts + IG media with engagement stats
- [x] Store in DimContent + FactContentInsights

### Phase 2: Enhanced Dashboards - COMPLETE

- [x] Platform toggle (FB/IG/Both) with URL persistence
- [x] Content grid with thumbnails + engagement
- [x] New Content Performance page (`/admin/insights/content`)

### Phase 3: AI Analysis - COMPLETE

- [x] Claude AI integration (`src/lib/ai/`)
- [x] Quick insights for Overview page
- [x] Post recommendations + performance analysis
- [x] Monthly narrative reports

### Phase 4: Overview Restructure - COMPLETE

- [x] 3 collapsible sections (Executive Summary, Dashboard Hub, Recent Content)
- [x] KPI cards with sparklines and trend indicators
- [x] AI Quick Insights integration

### Phase 5: Content Hub Enhancement - COMPLETE

- [x] Content Hub with 4 tabs (Browse, Performance, Rankings, AI Analysis)
- [x] Engagement trends chart (ECharts)
- [x] Content detail modal with AI analysis
- [x] Performance badges on content cards (High/Low)
- [x] Top/Bottom content rankings

### Phase 6: Content Comparison + Dedicated AI Page - COMPLETE

- [x] Post-to-post comparison (`/admin/insights/content/compare`)
- [x] Dedicated AI analysis page (`/admin/insights/ai`)
