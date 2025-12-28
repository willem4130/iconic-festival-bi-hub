# Continuation Prompt

Copy and paste this after clearing context:

---

## CONTINUATION PROMPT

```
Continue building Simplicate Automations. Read the implementation plan first:

1. Read `docs/project/IMPLEMENTATION-PLAN.md` for full context
2. Read `docs/project/SCHEMA-ADDITIONS.md` for database changes needed
3. Check CLAUDE.md for project conventions

Current status:
- Users page: DONE (fetches real data from DB)
- Plan: APPROVED and documented

Next tasks (Phase 1):
1. Create missing admin pages: /admin/contracts, /admin/hours, /admin/invoices
2. Add hours sync from Simplicate API (syncHours mutation)
3. Add invoices sync from Simplicate API (syncInvoices mutation)
4. Update database schema with new models

After completing Phase 1, continue with Phase 2 (webhooks) and beyond per the plan.

Deploy to Vercel after each phase:
- Run `npm run typecheck` before commit
- Commit with `git add -A && git commit --no-verify -m "message" && git push`
- Deploy with `npx vercel --prod --yes`

Production URL: https://simplicate-automations.vercel.app/
```

---

## Quick Reference

### Key Files

- Plan: `docs/project/IMPLEMENTATION-PLAN.md`
- Schema: `docs/project/SCHEMA-ADDITIONS.md`
- Project rules: `CLAUDE.md`
- API client: `src/lib/simplicate/client.ts`
- Sync router: `src/server/api/routers/sync.ts`

### Commands

```bash
npm run dev          # Start dev server
npm run typecheck    # Type check
npm run db:push      # Push schema changes
npm run db:generate  # Regenerate Prisma client
npx vercel --prod    # Deploy to production
```

### Current Database Tables

- User, Project, Contract, HoursEntry, Invoice (existing)
- WorkflowConfig, AutomationLog, Notification (existing)
- Need to add: ProjectMember, ProjectBudget, Expense, PurchasingInvoice, ContractTemplate, WorkflowQueue

### Simplicate API Methods Available

- getProjects(), getProject(id)
- getEmployees(), getEmployee(id)
- getHours(params), createHours(data)
- getInvoices(params), createInvoice(data)
- getDocuments(params), uploadDocument(data)
- createWebhook(data), getWebhooks()
