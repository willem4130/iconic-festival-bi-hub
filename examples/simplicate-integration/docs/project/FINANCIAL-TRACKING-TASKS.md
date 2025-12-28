# Financial Tracking - Task Progress

## Current Status: Phase 3 Complete, Phase 4 Next

---

### Phase 0: Bug Fix - Hours Sync Date Parsing - COMPLETE

- [x] Fix date parsing in syncHours() to handle edge cases
- [x] Deploy fix to production
- [x] Re-sync hours to fix affected entries (426 entries synced 2024-11-26)

---

### Phase 1: Schema Extensions & Employee Sync - COMPLETE

- [x] Add EmployeeType enum
- [x] Add User model financial fields
- [x] Extend ProjectMember model (salesRate, costRate)
- [x] Extend HoursEntry model (salesRate, costRate, revenue, cost, margin, rateSource, purchaseInvoiceId)
- [x] Add ProjectService hourTypeTariffs field
- [x] Create ServiceEmployeeRate model
- [x] Update SimplicateEmployee interface (hourly_sales_tariff, hourly_cost_tariff, type)
- [x] Update syncEmployees() for rate fields
- [x] Run db:push and verify
- [x] Test employee sync with rate data (cost rates synced for internal employees)
- [x] Re-sync hours (426 entries synced successfully)

---

### Phase 2: Rate Resolution System - COMPLETE

- [x] Create src/lib/rates/resolver.ts
- [x] Create rates router with CRUD endpoints
- [x] Implement resolveEffectiveRates() with hierarchy
- [x] Implement batchResolveRates() for efficiency
- [x] Add purchase rate calculation (calculatePurchaseRate)
- [x] Add getRateSourceLabel() utility
- [ ] Add RateAuditLog model (deferred to Phase 8)
- [ ] Test rate hierarchy in production

---

### Phase 3: Enhanced Hours Sync - COMPLETE

- [x] Update syncEmployees() to fetch rates from /hrm/timetable (where rates are stored)
- [x] Add getTimetables() method to Simplicate client
- [x] Update syncHours() to store salesRate and costRate
- [x] Calculate revenue/cost/margin on sync
- [x] Store rateSource
- [x] Test full sync cycle (425/426 entries with financials calculated)

---

### Phase 4: Financial Dashboard

- [ ] Create financials router
- [ ] Create /admin/financials page
- [ ] Implement summary stats
- [ ] Implement drill-down table
- [ ] Add filters
- [ ] Register router in root.ts

---

### Phase 5: Hours Page Enhancement

- [ ] Add Rate column
- [ ] Add Revenue column
- [ ] Add service/project subtotals
- [ ] Add billable filter

---

### Phase 6-8: Advanced Features

- [ ] Employee financial view
- [ ] Invoice matching
- [ ] Rate management UI

---

## Completed

(Move completed tasks here with date)

---

## Notes

(Add implementation notes, blockers, decisions here)
