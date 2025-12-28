# Iconic Festival BI Hub

Advanced Business Intelligence platform for tracking Facebook & Instagram performance with Apache ECharts visualizations and ML-powered engagement optimization.

## Repository

**GitHub**: https://github.com/willem4130/iconic-festival-bi-hub

> **CRITICAL**: This repo was created from template `willem4130/nextjs-fullstack-template`.
> NEVER push to the template repo - only to `iconic-festival-bi-hub`.

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authenticated routes (dashboard)
│   ├── (public)/            # Public routes (about)
│   ├── admin/               # Admin pages (dashboard, users, settings)
│   └── api/                 # API routes (health, upload, trpc)
├── components/
│   └── ui/                  # 28 shadcn/ui components
├── server/
│   ├── api/routers/         # 7 tRPC routers
│   └── db/                  # Prisma client
├── lib/
│   ├── analytics/           # Pareto analysis
│   ├── excel/               # Excel parsing
│   ├── mapping/             # Column detection
│   ├── transformation/      # Data transforms
│   └── validation/          # Business rules
├── hooks/                   # Custom React hooks
└── trpc/                    # tRPC client config
prisma/
└── schema.prisma            # Database schema
tests/
├── api/                     # API tests
├── unit/                    # Unit tests
└── e2e/                     # Playwright E2E tests
```

## Tech Stack

- **Framework**: Next.js 16 + React 19 (App Router, Turbopack)
- **Language**: TypeScript 5.9
- **API**: tRPC 11 (type-safe endpoints)
- **Database**: Prisma 6 + PostgreSQL
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Charts**: Recharts (+ Apache ECharts for BI)
- **Auth**: NextAuth 5

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

**Dev server:**

```bash
npm run dev
```

## Organization Rules

- API routes → `src/server/api/routers/` (one router per domain)
- Business logic → `src/lib/` (pure functions, no DB access)
- Components → `src/components/ui/` (shadcn) or feature folders
- Types → co-located or `src/types/`
- Tests → `tests/` folder (unit, api, e2e)
