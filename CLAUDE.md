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
│   │   ├── ai/                 # AI analysis (Claude-powered)
│   │   ├── content/            # Content Hub + Compare
│   │   ├── comparison/         # FB vs IG comparison
│   │   ├── calendar/           # Content calendar
│   │   ├── ads/                # Ad performance
│   │   ├── attribution/        # Attribution tracking
│   │   ├── correlations/       # Correlation analysis
│   │   ├── weather/            # Weather impact
│   │   ├── sentiment/          # Sentiment analysis
│   │   ├── hashtags/           # Hashtag tracking
│   │   └── mentions/           # Mentions tracking
│   ├── admin/settings/         # Settings pages
│   └── api/auth/meta/          # Meta OAuth endpoints
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── charts/                 # ECharts wrapper
│   ├── meta/                   # Meta OAuth components
│   └── insights/               # Dashboard components
├── server/api/routers/         # tRPC routers
│   ├── meta-auth.ts            # OAuth + sync endpoints
│   ├── meta-insights.ts        # Stored insights queries
│   └── ai-analysis.ts          # Claude AI analysis
├── lib/
│   ├── meta-api/               # Meta Graph API client
│   ├── ai/                     # Claude AI client
│   │   ├── claude-client.ts    # API calls + caching
│   │   ├── prompts.ts          # Structured prompts
│   │   └── types.ts            # AI response types
│   └── sentiment-api/          # AWS Comprehend
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
- **AI**: Claude API (Anthropic SDK) - claude-sonnet-4-20250514

## Sidebar Navigation Structure

```
BI Insights (collapsible)
├── Overview          /admin/insights
├── Content Hub       /admin/insights/content
├── Compare Posts     /admin/insights/content/compare
├── AI Analysis       /admin/insights/ai
├── FB vs IG          /admin/insights/comparison
└── Calendar          /admin/insights/calendar

Advanced Analytics (collapsible)
├── Ad Performance    /admin/insights/ads
├── Attribution       /admin/insights/attribution
├── Correlations      /admin/insights/correlations
└── Weather Impact    /admin/insights/weather

Social Listening (collapsible)
├── Sentiment         /admin/insights/sentiment
├── Hashtags          /admin/insights/hashtags
└── Mentions          /admin/insights/mentions

Settings (collapsible)
├── Connections       /admin/settings/connections
└── Users             /admin/users
```

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

## Claude AI Integration

### Key Files

- `src/lib/ai/claude-client.ts` - API calls with caching (1hr TTL)
- `src/lib/ai/prompts.ts` - Structured prompts for each analysis type
- `src/lib/ai/types.ts` - TypeScript interfaces for AI responses
- `src/server/api/routers/ai-analysis.ts` - tRPC endpoints
- `src/app/admin/insights/ai/page.tsx` - Dedicated AI page

### AI Analysis Types

| Endpoint                    | Token Limit | Use Case                    |
| --------------------------- | ----------- | --------------------------- |
| `getQuickInsights`          | 2048        | Overview page bullet points |
| `analyzeContent`            | 2048        | Single post analysis        |
| `compareContent`            | 2048        | Post-to-post comparison     |
| `getStrategicAdvice`        | 4096        | Strategic recommendations   |
| `generateNarrativeReport`   | 2048        | Monthly reports             |
| `getPostingRecommendations` | 6144        | Comprehensive posting tips  |

### PostRecommendation Response Structure

```typescript
{
  bestPostingTime: {
    ;(dayOfWeek, hour, timezone, reasoning)
  }
  secondaryPostingTimes: [{ dayOfWeek, hour, engagementPotential }]
  weeklySchedule: [{ day, postCount, bestTimes, contentType, theme }]
  contentMix: [{ type, percentage, description, examples }]
  hashtagStrategy: {
    ;(branded, trending, niche, community, usage)
  }
  captionTemplates: [{ type, template, example, tips }]
  audienceInsights: {
    ;(peakActivityHours, preferredContentTypes, engagementPatterns)
  }
  platformSpecificTips: [{ tip, impact, category }]
}
```

### StrategicAdvice Response Structure

```typescript
{
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  benchmarkComparison: {
    ;(vsIndustry, vsPreviousPeriod, areasAbove, areasBelow)
  }
  topOpportunities: [{ title, description, expectedImpact, effort, priority, steps }]
  quickWins: [{ action, impact, timeToImplement }]
  riskAssessment: [{ risk, severity, mitigation }]
  growthProjections: {
    ;(conservative, moderate, aggressive, keyAssumptions)
  }
  contentCalendarSuggestions: [{ dayOfWeek, contentType, theme, caption, bestTime }]
  keyMetricsToTrack: [{ metric, currentValue, targetValue, importance }]
}
```

### Loading Status Tracker

The AI page shows step-by-step progress during analysis:

- Animated checklist with completion states
- Elapsed time counter
- Progress bar with percentage
- Different steps per analysis type (strategic: 7, report: 6, recommendations: 8)

## Meta OAuth Integration

### Key Files

- `src/server/api/routers/meta-auth.ts` - OAuth + sync
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
- AI cache → `AiAnalysisCache` (1hr TTL)

## Organization Rules

- tRPC routers → `src/server/api/routers/` (one router per domain)
- Meta API logic → `src/lib/meta-api/`
- AI logic → `src/lib/ai/`
- Business logic → `src/lib/` (pure functions)
- Components → `src/components/ui/` (shadcn) or feature folders
- Types → co-located or `src/types/`

## Branding

- **Primary Gold**: `#aa7712` (Iconic Festival brand color)
- **Logo**: IF logo in sidebar header
- **Theme**: Light/dark mode support

## Enhancement Roadmap

### Phase 1-6: COMPLETE

- [x] Content sync (FB posts + IG media)
- [x] Enhanced dashboards with platform toggle
- [x] Claude AI integration with quick insights
- [x] Overview restructure with KPI cards
- [x] Content Hub with 4 tabs
- [x] Post comparison and dedicated AI page

### Phase 7: Enhanced AI Analysis - COMPLETE

- [x] Comprehensive PostRecommendation with 8 sections
- [x] Enhanced StrategicAdvice with grade, benchmarks, projections
- [x] Weekly posting schedule with content themes
- [x] Hashtag strategy organized by category
- [x] Caption templates with examples
- [x] Platform-specific tips with impact levels
- [x] Loading status tracker with step-by-step progress
- [x] Sidebar restructured like Weeztix project

### Phase 8: Future Enhancements

- [ ] Connect Advanced Analytics to real data
- [ ] Enhance Social Listening pages
- [ ] Add ECharts heatmap for weekly schedule
- [ ] Export AI reports to PDF
- [ ] Weeztix ticketing integration
