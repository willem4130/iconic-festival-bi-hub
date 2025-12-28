# Mileage (Kilometer) Tracking System - Implementation Plan

## Overview

Add comprehensive kilometer tracking to Simplicate Automations, displaying mileage alongside hours in all relevant views with proper cost calculations and financial integration.

### Business Context

- Employees track kilometers in Simplicate (travel for projects)
- Current state: Simplicate API supports mileage, but system doesn't sync or display it
- Mileage should be visible wherever hours are shown (same granularity: project-service-employee-date)
- Kilometer rate: €0.23/km (configurable in AppSettings)

---

## Current State Analysis

### What Exists

✅ `getMileage()` endpoint in Simplicate API client
✅ `AppSettings.kmRate` field (default 0.23 EUR/km)
✅ `Expense.kilometers` field (for expense tracking)
✅ `PurchasingInvoice.kmTotal`, `kmRate`, `kmAmount` fields
✅ Hours tracking with full financial integration

### What's Missing

❌ No dedicated `Mileage` model in database
❌ No mileage sync from Simplicate
❌ No mileage display in hours views
❌ No mileage in financial calculations
❌ No mileage in employee portal

---

## Architecture Design

### Data Model Decision

**Choice**: Create a dedicated `Mileage` model (separate from `Expense`)

**Rationale**:

1. Mileage has distinct attributes (from/to locations, km distance, vehicle info)
2. Same granularity as hours (project-service-employee-date level)
3. Needs similar financial tracking (cost = km × rate)
4. Cleaner for querying and reporting
5. Follows established pattern (like `HoursEntry`)

### Integration Points

```
┌─────────────────┐
│  Simplicate API │
│  /mileage/mileage│
└────────┬────────┘
         │
         ↓ sync
┌─────────────────┐      ┌──────────────┐
│  Mileage Model  │──────│ AppSettings  │
│  (Database)     │      │  (kmRate)    │
└────────┬────────┘      └──────────────┘
         │
         ↓ display
┌─────────────────────────────────────┐
│  Views: Hours / Financials / Portal │
└─────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Schema ✓ READY TO IMPLEMENT

#### New Model: Mileage

```prisma
model Mileage {
  id                  String          @id @default(cuid())
  projectId           String
  userId              String
  projectServiceId    String?         // Link to dienst

  // Mileage details
  date                DateTime
  kilometers          Float
  fromLocation        String?
  toLocation          String?
  description         String?

  // Financial tracking
  kmRate              Float           // Rate at time of entry (snapshot)
  cost                Float           // kilometers * kmRate

  // Billing status
  billable            Boolean         @default(true)
  status              MileageStatus   @default(PENDING)

  // Simplicate integration
  simplicateMileageId String?         @unique

  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  // Relations
  project             Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user                User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectService      ProjectService? @relation(fields: [projectServiceId], references: [id], onDelete: SetNull)
  purchaseInvoice     PurchasingInvoice? @relation(fields: [purchaseInvoiceId], references: [id])
  purchaseInvoiceId   String?

  @@index([projectId])
  @@index([userId])
  @@index([projectServiceId])
  @@index([status])
  @@index([date])
}

enum MileageStatus {
  PENDING
  SUBMITTED
  APPROVED
  REJECTED
  INVOICED
}
```

#### Files to Modify

- `prisma/schema.prisma` - Add Mileage model and MileageStatus enum
- Run `npm run db:push` and `npm run db:generate`

---

### Phase 2: Simplicate API Types ✓ READY TO IMPLEMENT

#### Update SimplicateMileage Interface

```typescript
export interface SimplicateMileage {
  id: string
  employee_id: string
  project_id?: string
  projectservice_id?: string
  date: string
  kilometers: number
  from_address?: string
  to_address?: string
  description?: string
  tariff?: number // Rate per km from Simplicate
  billable?: boolean
  status?: string
  employee?: {
    id: string
    name: string
  }
  project?: {
    id: string
    name: string
  }
}
```

#### Files to Modify

- `src/lib/simplicate/client.ts` - Update interface (currently minimal)

---

### Phase 3: Mileage Sync Logic ✓ READY TO IMPLEMENT

#### Add `syncMileage` Procedure to Sync Router

**Logic**:

1. Fetch all mileage from Simplicate using `client.getMileage()`
2. Match to local projects by `simplicateId`
3. Match to local users by `simplicateEmployeeId`
4. Link to `projectService` if available
5. Get current `kmRate` from `AppSettings`
6. Calculate `cost = kilometers * kmRate`
7. Upsert mileage entries (by `simplicateMileageId`)
8. Update project service mileage totals

**Pseudo-code**:

```typescript
syncMileage: publicProcedure.mutation(async ({ ctx }) => {
  const client = getSimplicateClient()
  const simplicateMileage = await client.getMileage({ limit: 1000 })

  // Get km rate from settings
  const settings = await ctx.db.appSettings.findFirst()
  const kmRate = settings?.kmRate || 0.23

  for (const entry of simplicateMileage) {
    // Match project and user
    const project = await findProjectBySimplicateId(entry.project_id)
    const user = await findUserBySimplicateId(entry.employee_id)

    // Calculate cost
    const cost = entry.kilometers * kmRate

    // Upsert mileage
    await ctx.db.mileage.upsert({
      where: { simplicateMileageId: entry.id },
      create: {
        projectId: project.id,
        userId: user.id,
        kilometers: entry.kilometers,
        date: new Date(entry.date),
        kmRate,
        cost,
        // ... other fields
      },
      update: {
        /* same fields */
      },
    })
  }

  return { success: true, synced: simplicateMileage.length }
})
```

#### Files to Modify

- `src/server/api/routers/sync.ts` - Add `syncMileage` procedure

---

### Phase 4: Hours View Enhancement ✓ PRIMARY VIEW

#### Add Mileage Columns to Employee Table

**Current structure** (per employee row):

- Employee name
- Hours
- Rate
- Revenue
- Cost
- Margin
- Margin %
- Entries

**Enhanced structure** (add km columns):

- Employee name
- **Hours** | **KM** (side-by-side)
- Rate | **KM Rate**
- Revenue | **KM Cost**
- **Total Cost** (hours cost + km cost)
- **Total Margin** (revenue - total cost)
- Margin %
- Entries | **Trips**

#### Update Query to Include Mileage

Modify `getProjectsSummary` in hours router:

```typescript
// After fetching hours, also fetch mileage for same filters
const mileage = await ctx.db.mileage.findMany({
  where: hoursWhere, // same filters
  include: { /* same relations */ }
})

// Aggregate by project -> service -> employee (same as hours)
// Add to existing structure:
employeeData.kilometers = ...
employeeData.kmCost = ...
employeeData.trips = ...
```

#### Files to Modify

- `src/app/admin/hours/page.tsx` - Add km columns to table
- `src/server/api/routers/hours.ts` - Add mileage to `getProjectsSummary`

---

### Phase 5: Financial Dashboard Integration

#### Include Mileage in Cost Calculations

**Summary Cards**:

- Total Revenue (unchanged)
- **Total Cost** (hours cost + km cost)
- **Total Margin** (revenue - total cost)
- Margin % (updated with km included)

**Drill-down Table**:

- Show both hours and km costs per project/service/employee
- Add "KM" column next to "Hours"
- Update margin calculations

#### Files to Create/Modify

- `src/server/api/routers/financials.ts` - Include mileage in queries
- `src/app/admin/financials/page.tsx` - Display mileage data

---

### Phase 6: Employee Portal Enhancement

#### Add Mileage to Portal View

Show employee's own mileage alongside hours:

- Monthly km totals
- Trip list (date, project, km, locations)
- Total km cost

#### Files to Modify

- `src/app/portal/[token]/page.tsx` - Add mileage section
- `src/server/api/routers/employeePortal.ts` - Add mileage queries

---

### Phase 7: Settings & Management

#### Add Mileage Settings to Settings Page

- Configure default km rate (currently 0.23 EUR/km)
- Trigger mileage sync manually
- View mileage sync stats

#### Files to Modify

- `src/app/admin/settings/page.tsx` - Add km rate input + sync button

---

## Key Design Decisions

### 1. Separate Model vs. Expense Extension

**Decision**: Separate `Mileage` model
**Reason**: Different attributes, cleaner querying, follows hours pattern

### 2. Rate Snapshot

**Decision**: Store `kmRate` on each mileage entry
**Reason**: Historical accuracy (rate may change over time)

### 3. Cost Calculation

**Decision**: Calculate on sync, store in database
**Reason**: Performance (pre-calculated), consistency with hours

### 4. Display Location

**Decision**: Integrate into existing hours views (not separate page)
**Reason**: Hours and mileage are tracked together, same context

### 5. Billable Status

**Decision**: Track billable flag on mileage
**Reason**: Some km may be non-billable, needs filtering

---

## Implementation Order

### Sprint 1: Foundation (Schema + Sync)

1. ✅ Create Mileage model in schema
2. ✅ Update Simplicate types
3. ✅ Implement syncMileage logic
4. ✅ Test sync with production data

### Sprint 2: Display (Hours View)

5. ✅ Update hours router to fetch mileage
6. ✅ Add km columns to hours page UI
7. ✅ Update financial calculations

### Sprint 3: Polish (Financials + Portal)

8. ✅ Add mileage to financial dashboard
9. ✅ Add mileage to employee portal
10. ✅ Add settings management

---

## Testing Strategy

### Unit Tests

- Mileage sync logic
- Cost calculation (km × rate)
- Aggregation queries

### Integration Tests

- Full sync cycle (Simplicate → Database)
- View rendering with mileage data
- Filter interactions (billable, date range, etc.)

### Production Validation

1. Run sync on production
2. Verify mileage count matches Simplicate
3. Spot-check cost calculations
4. Review UI in hours page

---

## Deployment Checklist

### Pre-deployment

- [ ] Run `npm run typecheck` (no errors)
- [ ] Test schema changes locally
- [ ] Verify sync logic with test data

### Deployment

- [ ] Push schema changes: `npm run db:push`
- [ ] Deploy to Vercel: `npx vercel --prod --yes`
- [ ] Run initial sync: Call `/api/trpc/sync.syncMileage`

### Post-deployment

- [ ] Verify mileage data in hours view
- [ ] Check financial totals include km costs
- [ ] Test filters work with mileage

---

## Critical Files Reference

| File                                   | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `prisma/schema.prisma`                 | Add Mileage model + enum             |
| `src/lib/simplicate/client.ts`         | Update SimplicateMileage interface   |
| `src/server/api/routers/sync.ts`       | Add syncMileage procedure            |
| `src/server/api/routers/hours.ts`      | Update queries to include mileage    |
| `src/app/admin/hours/page.tsx`         | Add km columns to UI                 |
| `src/server/api/routers/financials.ts` | Include mileage in financial queries |
| `src/app/admin/settings/page.tsx`      | Add km rate config + sync button     |

---

## Example Queries

### Get mileage with hours for a project

```typescript
const data = await Promise.all([
  ctx.db.hoursEntry.findMany({ where: { projectId } }),
  ctx.db.mileage.findMany({ where: { projectId } }),
])

const totalCost =
  hours.reduce((sum, h) => sum + (h.cost || 0), 0) + mileage.reduce((sum, m) => sum + m.cost, 0)
```

### Get employee totals for a month

```typescript
const [hours, mileage] = await Promise.all([
  ctx.db.hoursEntry.aggregate({
    _sum: { hours: true, cost: true },
    where: { userId, date: { gte, lte } },
  }),
  ctx.db.mileage.aggregate({
    _sum: { kilometers: true, cost: true },
    where: { userId, date: { gte, lte } },
  }),
])
```

---

## Continuation Prompt

When starting implementation:

```
I'm implementing the Mileage Tracking System for Simplicate Automations.

Read these files for context:
- docs/project/MILEAGE-TRACKING-PLAN.md (this plan)
- docs/project/FINANCIAL-TRACKING-PLAN.md (hours tracking pattern to follow)
- CLAUDE.md (project overview)

Start with Phase 1 (Schema). After completing each phase:
1. Run npm run typecheck
2. Test the changes
3. Commit with /commit and push to production
4. Move to next phase

The goal is displaying kilometers alongside hours in all relevant views with proper cost calculations.
```
