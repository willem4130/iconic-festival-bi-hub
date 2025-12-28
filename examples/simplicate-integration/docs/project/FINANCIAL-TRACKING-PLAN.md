# Financial Tracking System - Implementation Plan

## Overview

Build a comprehensive financial tracking system for Simplicate Automations that tracks revenue, costs, and margins at the lowest granularity (project-service-employee level).

### Business Requirements

1. **Rate Types**:
   - Blended hourly rates (T&M projects)
   - Fixed prices (staged invoicing)
   - Co-owner rates: sales tariff + purchase tariff (~10% lower for internal BV)
   - Freelancer rates: project-specific, may vary
   - Software licenses

2. **Core Goal**: Track at project-service-employee level for accurate margins

3. **Invoice Matching**: Match sales invoices and purchase invoices with hours

---

## Implementation Phases

### Phase 0: Bug Fix - Hours Sync Date Parsing

**Goal**: Fix the Invalid Date errors in hours sync

**Issue**: Some hours entries have `start_date` in a format that causes `new Date()` to return Invalid Date.

#### Tasks

- [ ] Fix date parsing in syncHours() to handle edge cases
- [ ] Re-sync hours to fix affected entries
- [ ] Verify no more Invalid Date errors

#### Files to Modify

- `src/server/api/routers/sync.ts`

---

### Phase 1: Schema Extensions & Employee Sync

**Goal**: Add financial fields to schema and sync employee rates from Simplicate

#### Tasks

- [ ] Add `EmployeeType` enum (CO_OWNER, FREELANCER, INTERNAL)
- [ ] Add to User model: `employeeType`, `defaultSalesRate`, `defaultCostRate`, `salesRateOverride`, `costRateOverride`
- [ ] Extend ProjectMember: rename `hourlyRate` → `salesRate`, add `costRate`
- [ ] Extend HoursEntry: add `costRate`, `revenue`, `cost`, `margin`, `rateSource`
- [ ] Create `ServiceEmployeeRate` model for most granular rate overrides
- [ ] Update `syncEmployees()` to fetch `hourly_cost_tariff`, `hourly_sales_tariff`, `type.label`
- [ ] Update SimplicateEmployee interface in client.ts

#### Files to Modify

- `prisma/schema.prisma`
- `src/server/api/routers/sync.ts`
- `src/lib/simplicate/client.ts`

---

### Phase 2: Rate Resolution System

**Goal**: Implement rate hierarchy and resolution logic

#### Rate Hierarchy (Priority Order)

1. Service-Employee Rate (most specific)
2. Project-Member Rate
3. User Override
4. User Default (synced from Simplicate)
5. Simplicate hours.tariff (snapshot)

#### Tasks

- [ ] Create `src/lib/rates/resolver.ts` with `resolveEffectiveRates()`
- [ ] Create `src/server/api/routers/rates.ts` for rate CRUD
- [ ] Add purchase rate calculation (% discount for co-owners)
- [ ] Add rate validation utilities
- [ ] Add `RateAuditLog` model for change tracking

#### Files to Create

- `src/lib/rates/resolver.ts`
- `src/server/api/routers/rates.ts`

---

### Phase 3: Enhanced Hours Sync

**Goal**: Capture full tariff data and calculate financials on sync

#### Tasks

- [ ] Update `syncHours()` to capture `tariff`, `employee_tariff`, `type_tariff`
- [ ] Calculate and store `revenue`, `cost`, `margin` per hours entry
- [ ] Store `rateSource` to track which rate was used
- [ ] Update `syncServices()` to store `hourTypeTariffs` JSON

#### Files to Modify

- `src/server/api/routers/sync.ts`

---

### Phase 4: Financial Dashboard UI

**Goal**: New /admin/financials page with drill-down views

#### Tasks

- [ ] Create `/admin/financials/page.tsx`
- [ ] Create `src/server/api/routers/financials.ts`
- [ ] Implement summary stats cards (revenue, cost, margin, margin %)
- [ ] Implement Project → Service → Employee drill-down table
- [ ] Add filters: date range, projects, employees, clients, billable
- [ ] Extend filter presets for financials page
- [ ] Register financials router in root.ts

#### Files to Create/Modify

- `src/app/admin/financials/page.tsx` (new)
- `src/server/api/routers/financials.ts` (new)
- `src/server/api/root.ts`

---

### Phase 5: Hours Page Enhancement

**Goal**: Add financial columns to existing Hours page

#### Tasks

- [ ] Add "Rate" column to employee rows
- [ ] Add "Revenue" column (hours × rate)
- [ ] Add subtotals per service and project
- [ ] Add billable filter option

#### Files to Modify

- `src/app/admin/hours/page.tsx`
- `src/server/api/routers/hours.ts`

---

### Phase 6: Employee Financial View

**Goal**: Employee-centric financial reporting

#### Tasks

- [ ] Add employee breakdown to financials page
- [ ] Show per-employee: revenue, hours, utilization
- [ ] Show project breakdown per employee
- [ ] Prepare data for purchase invoice generation

---

### Phase 7: Invoice Matching

**Goal**: Link hours to invoices and identify discrepancies

#### Tasks

- [ ] Add `purchaseInvoiceId` to HoursEntry
- [ ] Track which hours are in sales invoices
- [ ] Track which hours are in purchase invoices
- [ ] Create reconciliation queries
- [ ] Build discrepancy alert system

---

### Phase 8: Rate Management UI

**Goal**: Admin interface for rate overrides

#### Tasks

- [ ] Create rate override management page
- [ ] Allow setting rates at user, project, service-employee levels
- [ ] Show rate audit history
- [ ] Add rate validation warnings

---

## Schema Changes Summary

```prisma
// NEW ENUM
enum EmployeeType {
  CO_OWNER
  FREELANCER
  INTERNAL
}

// USER MODEL ADDITIONS
model User {
  employeeType          EmployeeType?
  defaultSalesRate      Float?        // from Simplicate hourly_sales_tariff
  defaultCostRate       Float?        // from Simplicate hourly_cost_tariff
  salesRateOverride     Float?        // manual override
  costRateOverride      Float?        // manual override
  ratesSyncedAt         DateTime?
  serviceEmployeeRates  ServiceEmployeeRate[]
}

// PROJECT MEMBER CHANGES
model ProjectMember {
  salesRate             Float?        // was: hourlyRate
  costRate              Float?        // NEW
  salesRateSource       String?       // "simplicate" | "manual"
  costRateSource        String?       // "simplicate" | "manual"
}

// NEW MODEL
model ServiceEmployeeRate {
  id                    String        @id @default(cuid())
  projectServiceId      String
  userId                String
  salesRate             Float?
  costRate              Float?
  salesRateSource       String?
  costRateSource        String?
  projectService        ProjectService @relation(...)
  user                  User          @relation(...)
  @@unique([projectServiceId, userId])
}

// HOURS ENTRY ADDITIONS
model HoursEntry {
  salesRate             Float?        // was: hourlyRate
  costRate              Float?        // NEW
  revenue               Float?        // hours * salesRate
  cost                  Float?        // hours * costRate
  margin                Float?        // revenue - cost
  rateSource            String?       // which rate level was used
  purchaseInvoiceId     String?       // link to PurchasingInvoice
}

// PROJECT SERVICE ADDITIONS
model ProjectService {
  hourTypeTariffs       Json?         // [{hourTypeId, tariff, budgetedAmount, billable}]
  employeeRates         ServiceEmployeeRate[]
}
```

---

## API Endpoints Summary

### financials.ts (new router)

- `getFinancialSummary` - Overview stats with filters
- `getProjectFinancials` - Project drill-down with services/employees
- `getEmployeeFinancials` - Employee-centric view
- `getMonthlyTrend` - Time series data
- `getUninvoicedHours` - Hours not yet billed

### rates.ts (new router)

- `getRateOverrides` - List overrides for user/project/service
- `createRateOverride` - Add new override
- `updateRateOverride` - Modify override
- `deleteRateOverride` - Remove override
- `getRateAuditLog` - View change history
- `resolveRate` - Get effective rate for calculation

---

## Key Design Decisions

1. **Dual Rate Model**: Every level stores salesRate (revenue) and costRate (cost)
2. **Override vs Default**: Overrides take precedence, defaults sync from Simplicate
3. **Rate Snapshots**: HoursEntry stores rates at time of sync for historical accuracy
4. **Source Tracking**: Track where each rate came from for audit
5. **Co-owner Purchase Rate**: Default 10% discount from sales, with override capability

---

## Critical Files Reference

| File                                   | Purpose                      |
| -------------------------------------- | ---------------------------- |
| `prisma/schema.prisma`                 | All schema changes           |
| `src/server/api/routers/sync.ts`       | Employee/hours/services sync |
| `src/lib/simplicate/client.ts`         | API types                    |
| `src/lib/rates/resolver.ts`            | Rate resolution logic        |
| `src/server/api/routers/rates.ts`      | Rate CRUD                    |
| `src/server/api/routers/financials.ts` | Financial queries            |
| `src/app/admin/financials/page.tsx`    | Dashboard UI                 |
| `src/app/admin/hours/page.tsx`         | Hours page enhancements      |

---

## Continuation Prompt

When starting a new session, use this prompt:

```
I'm continuing work on the Financial Tracking System for Simplicate Automations.

Read these files for context:
- docs/project/FINANCIAL-TRACKING-PLAN.md (full plan)
- docs/project/FINANCIAL-TRACKING-TASKS.md (current progress)
- CLAUDE.md (project overview)

Continue from where I left off. After completing each task:
1. Check off the task in FINANCIAL-TRACKING-TASKS.md
2. Run npm run typecheck
3. Commit with /commit and push to production

The goal is tracking revenue, costs, and margins at project-service-employee level.
```
