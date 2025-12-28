# Iconic Festival BI Hub

Advanced Business Intelligence platform for tracking Facebook & Instagram performance with Apache ECharts visualizations and ML-powered engagement optimization.

## Repository

**GitHub**: https://github.com/willem4130/iconic-festival-bi-hub

> **IMPORTANT**: This repo was created from template `willem4130/nextjs-fullstack-template`.
> NEVER push to the template repo - only to `iconic-festival-bi-hub`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (tRPC, webhooks, Meta callbacks)
│   ├── dashboard/         # Main BI dashboard pages
│   ├── insights/          # Deep-dive analytics pages
│   └── settings/          # Account & API configuration
├── components/
│   ├── charts/            # Apache ECharts components
│   ├── dashboard/         # Dashboard-specific components
│   ├── ui/                # shadcn/ui base components
│   └── data-tables/       # Data table components
├── server/
│   ├── api/routers/       # tRPC routers
│   └── services/          # External API integrations
│       ├── meta/          # Facebook/Instagram Graph API
│       ├── weather/       # Weather API integration
│       └── analytics/     # ML & correlation analysis
├── lib/
│   ├── meta-api/          # Meta Graph API client
│   ├── echarts/           # ECharts config & themes
│   ├── ml/                # Machine learning utilities
│   └── utils/             # General utilities
├── types/                 # TypeScript type definitions
└── prisma/
    └── schema.prisma      # Database schema
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **API**: tRPC for type-safe endpoints
- **Database**: PostgreSQL via Prisma ORM
- **Visualization**: Apache ECharts
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth.js (for Meta OAuth)

## Key APIs

- **Meta Graph API v21+**: Facebook/Instagram insights
- **Meta Marketing API v22**: Ad campaign data
- **OpenWeatherMap**: Weather correlation data

## Database Entities

**Dimensions:**

- `dim_platform`, `dim_account`, `dim_content`, `dim_date`

**Organic Facts:**

- `fact_account_insights`, `fact_content_insights`, `fact_audience_demographics`

**Paid Facts:**

- `fact_ad_insights`, `fact_ad_insights_breakdown`

**External:**

- `fact_weather`, `fact_events`, `fact_ticket_sales`

**Analytics:**

- `agg_content_performance`, `agg_optimal_posting_times`, `ml_predictions`

## Organization Rules

**Keep code organized and modularized:**

- API routes → `src/server/api/routers/` (one router per domain)
- Business logic → `src/lib/` (pure functions, no DB access)
- Components → `src/components/` (ui/ for shadcn, domain/ for features)
- Meta API logic → `src/lib/meta-api/` or `src/server/services/meta/`
- Chart configs → `src/lib/echarts/`

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

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add DATABASE_URL, META_APP_ID, META_APP_SECRET

# Push database schema
npm run db:push

# Start dev server
npm run dev
```
