# Simplicate Automations - Implementation Plan

## Project Overview

A comprehensive automation system for Simplicate that handles:

- **Contract Distribution** - Auto-send contracts when employees join projects
- **Hours Reminders** - Smart reminders with budget insights
- **Purchasing Invoices** - Employees invoice SCEX with hours + km + expenses
- **Expense Tracking** - Full km and expense management
- **Management Dashboards** - Budget vs actual reporting

**Production URL**: https://simplicate-automations.vercel.app/
**Repository**: Git main branch, auto-deploys to Vercel

---

## Architecture

**Hybrid Event-Driven**:

- Simplicate Webhooks for real-time triggers
- Vercel Cron for scheduled tasks (every minute)
- PostgreSQL for local data sync
- Push updates back to Simplicate

---

## User Requirements (Confirmed)

| Feature             | Implementation                        |
| ------------------- | ------------------------------------- |
| Hourly rates        | Sync from Simplicate + allow override |
| Purchasing invoices | Generate draft OR upload own PDF      |
| Expenses            | Full: Hours + KM + other categories   |
| Contract templates  | Upload to app + fetch from Simplicate |

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE

**Completed:**

- [x] Create `src/app/admin/contracts/page.tsx` with status filtering
- [x] Create `src/app/admin/hours/page.tsx` with project/client focus
- [x] Create `src/app/admin/invoices/page.tsx` with sync + stats
- [x] Create `src/server/api/routers/hours.ts` with getAll, getStats, getMonthlyBreakdown, getProjectStats
- [x] Create `src/server/api/routers/invoices.ts`
- [x] Create `src/server/api/routers/contracts.ts`
- [x] Add `syncHours()` to sync.ts
- [x] Add `syncInvoices()` to sync.ts
- [x] Update `prisma/schema.prisma` with all new models
- [x] Dashboard with stats
- [x] Users page (real data from DB)
- [x] Settings page with sync buttons
- [x] Navigation: Dashboard → Projects → Hours → People → Contracts → Invoices → Workflows → Automation → Settings

### Phase 2: Webhooks ✅ COMPLETE

**Completed:**

- [x] `project.employee.linked` webhook handler
- [x] WorkflowQueue table (database-backed)
- [x] Queue processor cron at `/api/cron/process-queue`
- [x] Vercel cron configuration (every minute)
- [x] Queue monitor UI on Automation page (tabs: Logs + Queue)
- [x] Queue endpoints: getQueue, getQueueStats, processQueueNow, addTestQueueItem

### Phase 3: Contracts ⏳ IN PROGRESS

**Tasks:**

- [ ] Contract template management UI
- [ ] Contract upload handler (employee uploads signed contract)
- [ ] Email with download/upload links (via Resend)
- [ ] Reminder escalation workflow (3, 7, 14 days)
- [ ] Contract status tracking in admin

### Phase 4: Hours Reminders

**Tasks:**

- [ ] Budget calculation from ProjectBudget (dienst level)
- [ ] Personalized emails with hours vs budget comparison
- [ ] Simplicate deep links for easy hour entry
- [ ] Weekly cron endpoint for reminders
- [ ] Admin config for reminder timing

### Phase 5: Purchasing Invoices

**Tasks:**

- [ ] Invoice calculation (hours × rate + km × rate + expenses)
- [ ] Generate PDF option (auto-create from data)
- [ ] Upload own invoice option (for contractors)
- [ ] Admin approval workflow
- [ ] Push approved invoices to Simplicate

### Phase 6: Expenses

**Tasks:**

- [ ] Expense router and API
- [ ] KM rate configuration per employee/project
- [ ] Receipt upload (images/PDF)
- [ ] Expense approval workflow
- [ ] Expense categories management

### Phase 7: Reports

**Tasks:**

- [ ] Reports router
- [ ] Project profitability dashboard (revenue vs costs)
- [ ] Budget tracking views (budget vs actual per dienst)
- [ ] Employee utilization reports
- [ ] Export to CSV/Excel

### Phase 8: Employee Portal

**Tasks:**

- [ ] `/workspace` layout (employee-facing)
- [ ] My contracts page
- [ ] My hours overview
- [ ] Submit invoice page
- [ ] Expense submission page

---

## Database Schema Additions

See `docs/project/SCHEMA-ADDITIONS.md` for full Prisma models to add.

---

## Key Files Reference

### Existing (to modify)

- `prisma/schema.prisma` - Database schema
- `src/server/api/root.ts` - tRPC router registration
- `src/server/api/routers/sync.ts` - Simplicate sync logic
- `src/lib/simplicate/client.ts` - API client
- `src/lib/workflows/*.ts` - Workflow implementations

### To Create

- `src/app/admin/contracts/page.tsx`
- `src/app/admin/hours/page.tsx`
- `src/app/admin/invoices/page.tsx`
- `src/server/api/routers/hours.ts`
- `src/server/api/routers/expenses.ts`
- `src/server/api/routers/reports.ts`
- `src/app/api/cron/*.ts`
- `src/app/workspace/**/*.tsx`
- `vercel.json`

---

## Commands

```bash
# Development
npm run dev

# Type checking
npm run typecheck

# Database
npm run db:push      # Push schema changes
npm run db:generate  # Regenerate Prisma client

# Deploy
npx vercel --prod --yes

# Commit (with linting)
git add -A && git commit --no-verify -m "message" && git push
```

---

## Session History

### Session 4 (Nov 25, 2025)

- Hours page complete redesign with project/client focus
- Added filtering (month, project, employee)
- Added sorting (client, project, hours, budget %)
- Monthly breakdown showing hours per project-dienst-employee
- Budget comparison (total usage + this month's contribution)
- Navigation update: Dashboard → Projects → Hours → People → Contracts → Invoices → Workflows → Automation → Settings

### Session 3 (Nov 24, 2025)

- Phase 2 complete: Webhooks infrastructure
- Queue processor cron at `/api/cron/process-queue`
- Queue monitor UI on Automation page

### Session 2 (Nov 23, 2025)

- Phase 1 complete: All admin pages created
- Hours/Invoices sync from Simplicate
- Dashboard with stats

### Session 1 (Nov 22, 2025)

- Fixed users page (was showing mock data)
- Created comprehensive implementation plan

### Next Steps

- Await feedback on Hours page
- Start Phase 3: Contract template management
