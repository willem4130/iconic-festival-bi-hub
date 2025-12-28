# Executive Dashboard Implementation Plan

**Created**: December 8, 2025
**Status**: Approved - Ready for Implementation
**Owner**: Willem van den Berg (willem@scex.nl)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements](#business-requirements)
3. [System Architecture](#system-architecture)
4. [Phase 1: Foundation & Data Layer](#phase-1-foundation--data-layer)
5. [Phase 2: Enhanced Dashboard UI](#phase-2-enhanced-dashboard-ui)
6. [Phase 3: Margin Steering Page](#phase-3-margin-steering-page)
7. [Phase 4: Timeliness Tracking Page](#phase-4-timeliness-tracking-page)
8. [Phase 5: Error Monitoring Page](#phase-5-error-monitoring-page)
9. [Phase 6: Integration & Polish](#phase-6-integration--polish)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Technical Specifications](#technical-specifications)
12. [Success Metrics](#success-metrics)

---

## Executive Summary

Transform the existing `/admin/dashboard` into a comprehensive executive command center with three core focus areas:

1. **Margin Steering** - Real-time profitability visibility and alerts
2. **Timeliness Tracking** - Administrative health and bottleneck detection
3. **Error Monitoring** - System health and exception management

### Approach

**Hybrid model**: Enhanced dashboard with executive KPI cards that link to dedicated drill-down pages for detailed analysis.

### Implementation Strategy

**Phased parallel development**: Build foundation infrastructure first, then develop all three monitoring areas simultaneously, followed by integration and polish.

### Alert Strategy

- **Critical issues**: Immediate email to willem@scex.nl
- **Warning issues**: In-app notifications + daily digest email
- **All levels**: Dashboard badges with real-time counts

---

## Business Requirements

### User Decisions (Confirmed December 8, 2025)

✅ **Page Structure**: Hybrid approach

- Enhanced dashboard with high-level KPI cards
- Dedicated drill-down pages for detailed analysis (/admin/margin-steering, /admin/timeliness, /admin/errors)

✅ **Implementation Priority**: All three areas in parallel (phased approach)

- Week 1: Foundation for all three
- Weeks 2-3: Parallel development of detail pages
- Weeks 4-5: Integration and polish

✅ **Alert Delivery**: Multi-channel strategy

- Email alerts to willem@scex.nl for critical issues
- In-app notifications for all severity levels
- Optional: Daily digest email (morning summary at 9 AM)

✅ **Margin Thresholds**: Configurable system supporting multiple models

- Default: Target 40%, Warning 25%, Critical 15%
- UI for configuration (per-system or per-project)
- Future: Project-specific thresholds

### Key Questions to Answer

#### Margin Steering

- Which projects/employees are most/least profitable?
- What are the margin trends over time?
- Where should we focus attention to improve margins?
- Are we meeting target margins (40%+ healthy)?

#### Administrative Timeliness

- Who hasn't submitted hours this week/month?
- Which projects have unapproved hours?
- Are contracts signed on time?
- What invoices are pending approval/payment?
- What workflows are stuck or delayed?

#### Error & Exception Monitoring

- What automation workflows are failing?
- What requires immediate attention?
- Are there any system errors blocking progress?
- What are the error patterns and trends?

---

## System Architecture

### Current State (As-Is)

**Existing Infrastructure**:

- Financial tracking complete (Phases 0-3): Rate hierarchy, revenue/cost/margin calculation
- Automation system: WorkflowQueue, AutomationLog, retry logic (3 attempts, exponential backoff)
- Existing `/admin/dashboard`: 5 stat cards, automation performance, recent projects/activity
- Multi-channel notifications: Email (Resend), Slack (webhook), in-app

**Data Models Available**:

- User: employeeType, defaultSalesRate, defaultCostRate, rate overrides
- HoursEntry: salesRate, costRate, revenue, cost, margin, rateSource
- Project, ProjectService, ServiceEmployeeRate: Budget and rate management
- Contract: status (PENDING, SENT, SIGNED), uploadToken, signedAt
- Invoice: status, amounts, due dates
- AutomationLog: status, error, metadata, execution tracking
- WorkflowQueue: status, attempts, scheduledFor, retry logic
- Expense: Mileage tracking with kilometers and costs

### Future State (To-Be)

**New Infrastructure**:

- ErrorRecord model: Centralized error tracking with severity, category, status
- MarginSettings model: Configurable margin thresholds
- Timeliness router: Administrative health queries
- Errors router: Error monitoring and management queries
- Enhanced dashboard router: Executive summary stats

**New Pages**:

1. `/admin/margin-steering`: Margin analysis with Recharts visualizations
2. `/admin/timeliness`: Administrative bottleneck tracking
3. `/admin/errors`: System health and error management

**Integration Points**:

- Error capture in workflow execution (process-queue, workflows/\*)
- Email failure tracking (notifications/email)
- Cross-page error/margin/timeliness indicators
- Navigation badges for critical counts

---

## Phase 1: Foundation & Data Layer

**Duration**: Week 1
**Goal**: Establish data models and core query infrastructure for all three areas

### 1.1 Database Schema Extensions

#### New Model: ErrorRecord

Location: `prisma/schema.prisma`

```prisma
enum ErrorSeverity {
  CRITICAL  // System-breaking, requires immediate attention
  HIGH      // Significant issues affecting multiple users/workflows
  MEDIUM    // Isolated failures with retry capability
  LOW       // Informational or expected failures
}

enum ErrorCategory {
  WORKFLOW_ERROR      // Contract distribution, hours reminder, invoice generation failures
  INTEGRATION_ERROR   // Simplicate API, email service, database errors
  DATA_ERROR          // Missing data, invalid data, sync conflicts
  SYSTEM_ERROR        // Queue processing, timeout, rate limit errors
}

enum ErrorStatus {
  ACTIVE          // Currently occurring
  ACKNOWLEDGED    // Seen by admin, being investigated
  DISMISSED       // Intentionally ignored (false positive, known issue)
  RESOLVED        // Manually fixed
  AUTO_RESOLVED   // No occurrences for 24 hours
}

model ErrorRecord {
  id                String         @id @default(cuid())

  // Classification
  severity          ErrorSeverity
  category          ErrorCategory
  errorType         String         // Specific error type (e.g., "EMAIL_SERVICE_ERROR")

  // Error details
  message           String
  stackTrace        String?        @db.Text
  context           Json?          // Related entity IDs, metadata, request data

  // Status tracking
  status            ErrorStatus    @default(ACTIVE)
  firstOccurrence   DateTime       @default(now())
  lastOccurrence    DateTime       @default(now())
  occurrenceCount   Int            @default(1)

  // Resolution tracking
  acknowledgedBy    String?
  acknowledgedAt    DateTime?
  resolvedBy        String?
  resolvedAt        DateTime?
  resolutionNotes   String?        @db.Text

  // Relations
  automationLogId   String?
  automationLog     AutomationLog? @relation(fields: [automationLogId], references: [id])
  queueItemId       String?
  queueItem         WorkflowQueue? @relation(fields: [queueItemId], references: [id])
  projectId         String?
  project           Project?       @relation(fields: [projectId], references: [id])

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  // Indexes for performance
  @@index([severity, status])
  @@index([category, status])
  @@index([firstOccurrence])
  @@index([automationLogId])
  @@index([queueItemId])
}
```

#### Extend Existing Models

```prisma
model AutomationLog {
  // ... existing fields ...

  // NEW: Link to error tracking
  errorRecords      ErrorRecord[]
}

model WorkflowQueue {
  // ... existing fields ...

  // NEW: Link to error tracking
  errorRecords      ErrorRecord[]
}
```

#### New Model: MarginSettings (Optional)

For configurable margin thresholds:

```prisma
model MarginSettings {
  id                String   @id @default(cuid())
  targetMargin      Float    @default(40)    // Healthy margin target (%)
  warningThreshold  Float    @default(25)    // Yellow zone threshold (%)
  criticalThreshold Float    @default(15)    // Red zone threshold (%)
  updatedAt         DateTime @updatedAt
  updatedBy         String?
}
```

### 1.2 Core tRPC Routers

#### New Router: timeliness.ts

Location: `src/server/api/routers/timeliness.ts`

```typescript
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { z } from 'zod'

export const timelinessRouter = createTRPCRouter({
  // Get overview statistics for dashboard card
  getOverview: publicProcedure.query(async ({ ctx }) => {
    // Calculate:
    // - criticalAlerts: Total critical timeliness issues
    // - pendingHoursUsers: Users with <1 hour submitted for last complete month
    // - unsignedContracts: Contracts in SENT status >7 days
    // - overdueInvoices: Invoices past dueDate
    // - avgHoursLag: Average days late for hours submission
  }),

  // Get users with pending hours submissions
  getPendingHours: publicProcedure
    .input(
      z.object({
        priority: z.enum(['all', 'critical', 'warning', 'normal']).optional(),
        month: z.string().optional(), // "2025-11"
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // For each active ProjectMember:
      // - Check HoursEntry for specified month (or last complete month)
      // - Calculate days late (days since month end + 3 day grace period)
      // - Priority: critical (>14 days), warning (>7 days), normal (>3 days)
      // Return: { employee, projects, lastSubmission, daysLate, priority }
    }),

  // Get unsigned contracts
  getUnsignedContracts: publicProcedure
    .input(
      z.object({
        priority: z.enum(['all', 'critical', 'warning', 'normal']).optional(),
        daysMin: z.number().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find all contracts where:
      // - status = SENT
      // - Calculate daysUnsigned = daysSince(sentAt)
      // - Priority: critical (>21 days), warning (>7 days), normal (>3 days)
      // Return: { employee, project, sentAt, daysUnsigned, reminders, priority }
    }),

  // Get overdue invoices
  getOverdueInvoices: publicProcedure
    .input(
      z.object({
        priority: z.enum(['all', 'critical', 'warning', 'normal']).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find all invoices where:
      // - status = SENT
      // - dueDate < now()
      // - Calculate daysOverdue = daysSince(dueDate)
      // - Priority: critical (>30 days), warning (>14 days), normal (>0 days)
      // Return: { invoiceNumber, project, amount, dueDate, daysOverdue, priority }
    }),

  // Get stuck workflow queue items
  getStuckWorkflows: publicProcedure
    .input(
      z.object({
        workflowType: z
          .enum(['CONTRACT_DISTRIBUTION', 'HOURS_REMINDER', 'INVOICE_GENERATION'])
          .optional(),
        status: z.enum(['PENDING', 'PROCESSING', 'FAILED']).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find WorkflowQueue items where:
      // - PENDING: scheduledFor < now - 1 hour
      // - PROCESSING: startedAt < now - 30 minutes
      // - FAILED: attempts >= maxAttempts
      // Return: { workflowType, project, scheduledFor, status, attempts, stuckDuration }
    }),

  // Send reminder actions (mutations)
  sendHoursReminder: publicProcedure
    .input(z.object({ userId: z.string(), month: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Trigger hours reminder notification for specific user/month
    }),

  sendContractReminder: publicProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Send contract signing reminder email
    }),

  sendInvoiceReminder: publicProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Send invoice payment reminder email
    }),
})
```

#### New Router: errors.ts

Location: `src/server/api/routers/errors.ts`

```typescript
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { z } from 'zod'
import { ErrorSeverity, ErrorCategory, ErrorStatus } from '@prisma/client'

export const errorsRouter = createTRPCRouter({
  // Get error statistics for dashboard card
  getErrorStats: publicProcedure.query(async ({ ctx }) => {
    // Calculate:
    // - critical: Count of ACTIVE errors with severity = CRITICAL
    // - high: Count of ACTIVE errors with severity = HIGH
    // - medium: Count of ACTIVE errors with severity = MEDIUM
    // - low: Count of ACTIVE errors with severity = LOW
    // - errorRate: (failed automations / total automations) * 100
    // - mttr: Mean time to resolution (avg resolution time for resolved errors)
  }),

  // Get active errors list
  getActiveErrors: publicProcedure
    .input(
      z.object({
        severity: z.nativeEnum(ErrorSeverity).optional(),
        category: z.nativeEnum(ErrorCategory).optional(),
        workflowType: z
          .enum(['CONTRACT_DISTRIBUTION', 'HOURS_REMINDER', 'INVOICE_GENERATION'])
          .optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find ErrorRecords where:
      // - status = ACTIVE
      // - Filter by severity, category, workflowType if provided
      // - Order by: severity DESC, occurrenceCount DESC, lastOccurrence DESC
      // Return: Full error details with related entities
    }),

  // Get error details by ID
  getErrorDetails: publicProcedure
    .input(z.object({ errorId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find ErrorRecord by ID with full relations:
      // - automationLog (with project)
      // - queueItem
      // - project
      // Return: Complete error details for detail view
    }),

  // Get error history
  getErrorHistory: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        severity: z.nativeEnum(ErrorSeverity).optional(),
        status: z.nativeEnum(ErrorStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Find all ErrorRecords (not just ACTIVE)
      // - Order by: firstOccurrence DESC
      // - Pagination support
      // Return: Error list with resolution info
    }),

  // Get error analytics
  getErrorAnalytics: publicProcedure
    .input(
      z.object({
        timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Calculate analytics:
      // - errorRateTrend: Daily error count over time range
      // - errorsByCategory: Count grouped by category
      // - errorsByWorkflow: Count grouped by workflow type (from automationLog)
      // - mttrTrend: Mean time to resolution over time
      // - commonPatterns: Most frequent errorTypes
      // - peakTimes: Error occurrence by hour of day
    }),

  // Error management mutations
  acknowledgeError: publicProcedure
    .input(
      z.object({
        errorId: z.string(),
        acknowledgedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update ErrorRecord:
      // - status = ACKNOWLEDGED
      // - acknowledgedBy, acknowledgedAt
    }),

  dismissError: publicProcedure
    .input(
      z.object({
        errorId: z.string(),
        reason: z.string(),
        dismissedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update ErrorRecord:
      // - status = DISMISSED
      // - resolutionNotes = reason
      // - resolvedBy = dismissedBy, resolvedAt
    }),

  resolveError: publicProcedure
    .input(
      z.object({
        errorId: z.string(),
        resolutionMethod: z.enum([
          'CODE_FIX',
          'CONFIG_CHANGE',
          'EXTERNAL_RESOLVED',
          'FALSE_POSITIVE',
          'OTHER',
        ]),
        resolutionNotes: z.string(),
        resolvedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update ErrorRecord:
      // - status = RESOLVED
      // - resolutionMethod, resolutionNotes
      // - resolvedBy, resolvedAt
    }),

  // Retry failed workflow
  retryFailedWorkflow: publicProcedure
    .input(
      z.object({
        automationLogId: z.string(),
        priority: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create new WorkflowQueue item from failed AutomationLog:
      // - Copy workflowType, payload, projectId
      // - Set scheduledFor = now (if priority) or now + 1 minute
      // - Reset attempts to 0
    }),
})
```

#### Extend Router: dashboard.ts

Location: `src/server/api/routers/dashboard.ts`

Add to existing `getOverview` query:

```typescript
// Add these fields to the return object:
return {
  // ... existing fields (projects, contracts, hours, invoices, mileage, automation) ...

  margin: {
    overallMargin: number, // Current month margin %
    marginTrend: 'up' | 'down' | 'neutral', // vs previous month
    criticalProjects: number, // Projects with margin <25%
    atRiskRevenue: number, // Revenue from projects with 25-40% margin
  },

  timeliness: {
    criticalAlerts: number, // Total critical timeliness issues
    pendingHoursUsers: number, // Users with unsubmitted hours
    unsignedContracts: number, // Contracts unsigned >7 days
    overdueInvoices: number, // Invoices past due date
  },

  errors: {
    critical: number, // Active critical errors
    high: number, // Active high severity errors
    errorRate: number, // % of workflows failing (last 24h)
  },
}
```

Implementation:

```typescript
// Calculate margin stats from financials
const currentMonth = getCurrentMonth()
const financials = await getMonthFinancials(ctx.db, currentMonth)
const previousMonth = getPreviousMonth()
const previousFinancials = await getMonthFinancials(ctx.db, previousMonth)

const margin = {
  overallMargin: financials.marginPercentage,
  marginTrend:
    financials.marginPercentage > previousFinancials.marginPercentage
      ? 'up'
      : financials.marginPercentage < previousFinancials.marginPercentage
        ? 'down'
        : 'neutral',
  criticalProjects: await ctx.db.project.count({
    where: {
      // Projects with margin <25% (calculate from hoursEntries)
    },
  }),
  atRiskRevenue: await calculateAtRiskRevenue(ctx.db, currentMonth),
}

// Calculate timeliness stats
const timeliness = {
  criticalAlerts: await calculateCriticalTimelinessAlerts(ctx.db),
  pendingHoursUsers: await countUsersWithPendingHours(ctx.db, previousMonth),
  unsignedContracts: await ctx.db.contract.count({
    where: {
      status: 'SENT',
      sentAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  }),
  overdueInvoices: await ctx.db.invoice.count({
    where: {
      status: 'SENT',
      dueDate: { lt: new Date() },
    },
  }),
}

// Calculate error stats
const errors = {
  critical: await ctx.db.errorRecord.count({
    where: { severity: 'CRITICAL', status: 'ACTIVE' },
  }),
  high: await ctx.db.errorRecord.count({
    where: { severity: 'HIGH', status: 'ACTIVE' },
  }),
  errorRate: await calculateErrorRate(ctx.db, 24), // last 24 hours
}
```

#### Extend Router: financials.ts

Location: `src/server/api/routers/financials.ts`

Add new queries:

```typescript
// Get projects with margin issues
getMarginAlerts: publicProcedure
  .input(z.object({
    month: z.string(),  // "2025-11"
  }))
  .query(async ({ ctx, input }) => {
    // Get projects from financials.getByProject
    const projects = await getByProject(ctx, input)

    // Classify by margin threshold
    return {
      critical: projects.filter(p => p.marginPercentage < 25),
      warning: projects.filter(p => p.marginPercentage >= 25 && p.marginPercentage < 40),
      atRiskRevenue: projects
        .filter(p => p.marginPercentage >= 25 && p.marginPercentage < 40)
        .reduce((sum, p) => sum + p.revenue, 0),
      excellentProjects: projects.filter(p => p.marginPercentage >= 50),
    }
  }),

// Get margin threshold settings
getMarginSettings: publicProcedure.query(async ({ ctx }) => {
  // Get from MarginSettings table (or return defaults)
  const settings = await ctx.db.marginSettings.findFirst()
  return settings || {
    targetMargin: 40,
    warningThreshold: 25,
    criticalThreshold: 15,
  }
}),

// Update margin threshold settings
updateMarginSettings: publicProcedure
  .input(z.object({
    targetMargin: z.number(),
    warningThreshold: z.number(),
    criticalThreshold: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Upsert MarginSettings
    return await ctx.db.marginSettings.upsert({
      where: { id: 'default' }, // Single settings record
      create: input,
      update: input,
    })
  }),
```

### 1.3 Error Tracking Integration

#### Centralized Error Handler

Location: `src/lib/errors/handler.ts`

```typescript
import { prisma } from '@/server/db'
import { ErrorSeverity, ErrorCategory } from '@prisma/client'
import { sendCriticalAlert } from '@/lib/notifications/alerts'

interface CaptureErrorOptions {
  severity: ErrorSeverity
  category: ErrorCategory
  errorType: string
  message: string
  stackTrace?: string
  context?: Record<string, any>
  automationLogId?: string
  queueItemId?: string
  projectId?: string
}

export async function captureError(options: CaptureErrorOptions) {
  const {
    severity,
    category,
    errorType,
    message,
    stackTrace,
    context,
    automationLogId,
    queueItemId,
    projectId,
  } = options

  // 1. Check if similar error exists (deduplication)
  const existingError = await prisma.errorRecord.findFirst({
    where: {
      errorType,
      status: 'ACTIVE',
      ...(automationLogId && { automationLogId }),
      ...(queueItemId && { queueItemId }),
      ...(projectId && { projectId }),
    },
  })

  let errorRecord

  if (existingError) {
    // Update existing error (increment occurrence count)
    errorRecord = await prisma.errorRecord.update({
      where: { id: existingError.id },
      data: {
        occurrenceCount: { increment: 1 },
        lastOccurrence: new Date(),
        message, // Update with latest message
        stackTrace: stackTrace || existingError.stackTrace,
        context: context || existingError.context,
      },
    })
  } else {
    // Create new error record
    errorRecord = await prisma.errorRecord.create({
      data: {
        severity,
        category,
        errorType,
        message,
        stackTrace,
        context,
        automationLogId,
        queueItemId,
        projectId,
        status: 'ACTIVE',
      },
    })
  }

  // 3. If critical, trigger email alert
  if (severity === 'CRITICAL') {
    await sendCriticalAlert({
      type: 'error',
      data: {
        errorId: errorRecord.id,
        severity,
        category,
        message,
        context,
      },
    })
  }

  // 4. Create in-app notification (for HIGH and above)
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    await prisma.notification.create({
      data: {
        userId: 'admin', // TODO: Get admin user ID
        type: 'SYSTEM_ALERT',
        title: `${severity} Error: ${errorType}`,
        message: message.substring(0, 200),
        actionUrl: `/admin/errors/${errorRecord.id}`,
        channels: JSON.stringify(['IN_APP']),
      },
    })
  }

  return errorRecord
}

// Helper: Classify error severity automatically
export function classifyErrorSeverity(error: Error, context?: Record<string, any>): ErrorSeverity {
  // Email service down → CRITICAL
  if (error.message.includes('ECONNREFUSED') && context?.service === 'email') {
    return 'CRITICAL'
  }

  // Database errors → CRITICAL
  if (error.message.includes('database') || error.message.includes('Prisma')) {
    return 'CRITICAL'
  }

  // Workflow failures with max retries → HIGH
  if (context?.attempts >= context?.maxAttempts) {
    return 'HIGH'
  }

  // Simplicate API auth failures → HIGH
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    return 'HIGH'
  }

  // Rate limits, timeouts → MEDIUM
  if (error.message.includes('429') || error.message.includes('timeout')) {
    return 'MEDIUM'
  }

  // Default to MEDIUM
  return 'MEDIUM'
}
```

#### Integration in Workflow Execution

Location: `src/app/api/cron/process-queue/route.ts`

Update processQueueItem to capture errors:

```typescript
async function processQueueItem(item: WorkflowQueueItem) {
  try {
    // Mark as processing
    await prisma.workflowQueue.update({
      where: { id: item.id },
      data: { status: 'PROCESSING', startedAt: new Date() },
    })

    // Execute workflow
    let result
    switch (item.workflowType) {
      case 'CONTRACT_DISTRIBUTION':
        result = await processContractDistribution(item)
        break
      case 'HOURS_REMINDER':
        result = await processHoursReminder(item)
        break
      case 'INVOICE_GENERATION':
        result = await processInvoiceGeneration(item)
        break
    }

    // Mark as completed
    await prisma.workflowQueue.update({
      where: { id: item.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  } catch (error) {
    console.error(`[Queue] Error processing item ${item.id}:`, error)

    // Capture error in ErrorRecord
    await captureError({
      severity: classifyErrorSeverity(error as Error, { attempts: item.attempts }),
      category: 'WORKFLOW_ERROR',
      errorType: `${item.workflowType}_FAILED`,
      message: (error as Error).message,
      stackTrace: (error as Error).stack,
      context: {
        workflowType: item.workflowType,
        payload: item.payload,
        attempts: item.attempts,
        maxAttempts: item.maxAttempts,
      },
      queueItemId: item.id,
      projectId: item.projectId || undefined,
    })

    // Update queue item with error (existing retry logic)
    const nextAttempt = item.attempts + 1
    if (nextAttempt < item.maxAttempts) {
      // Retry with exponential backoff
      const backoffMinutes = Math.pow(5, nextAttempt)
      await prisma.workflowQueue.update({
        where: { id: item.id },
        data: {
          status: 'PENDING',
          attempts: nextAttempt,
          scheduledFor: new Date(Date.now() + backoffMinutes * 60 * 1000),
          error: (error as Error).message,
        },
      })
    } else {
      // Max attempts reached, mark as FAILED
      await prisma.workflowQueue.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          attempts: nextAttempt,
          error: (error as Error).message,
        },
      })
    }
  }
}
```

#### Integration in Email Service

Location: `src/lib/notifications/email.ts`

Wrap email sending with error capture:

```typescript
export async function sendEmail(options: EmailOptions) {
  try {
    const result = await resend.emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    return { success: true, messageId: result.id }
  } catch (error) {
    console.error('[Email] Send failed:', error)

    // Capture email failure
    await captureError({
      severity: 'HIGH', // Email failures are high priority
      category: 'INTEGRATION_ERROR',
      errorType: 'EMAIL_SERVICE_ERROR',
      message: `Failed to send email: ${(error as Error).message}`,
      stackTrace: (error as Error).stack,
      context: {
        to: options.to,
        subject: options.subject,
      },
    })

    return { success: false, error: (error as Error).message }
  }
}
```

### 1.4 Database Migration

After updating schema.prisma:

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Or create migration for production
npx prisma migrate dev --name add-error-tracking
```

---

## Phase 2: Enhanced Dashboard UI

**Duration**: Week 2
**Goal**: Transform `/admin/dashboard` into executive command center

### 2.1 Update Dashboard Page

Location: `src/app/admin/dashboard/page.tsx`

#### Add Query for New Stats

```typescript
'use client'

import { api } from '@/trpc/react'
import { TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { data: overview, isLoading } = api.dashboard.getOverview.useQuery()

  // ... existing code ...

  if (!overview) return <ErrorState />

  // NEW: Executive alerts data
  const marginData = overview.margin
  const timelinessData = overview.timeliness
  const errorData = overview.errors

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Simplicate Automation Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your project automation system
        </p>
      </div>

      {/* NEW: Critical Alert Banner */}
      {(marginData.criticalProjects > 0 ||
        timelinessData.criticalAlerts > 0 ||
        errorData.critical > 0) && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">
                  Critical Issues Require Attention
                </p>
                <div className="text-sm text-red-700 mt-1 space-y-1">
                  {marginData.criticalProjects > 0 && (
                    <div>• {marginData.criticalProjects} projects below 25% margin</div>
                  )}
                  {timelinessData.criticalAlerts > 0 && (
                    <div>• {timelinessData.criticalAlerts} administrative delays &gt;14 days</div>
                  )}
                  {errorData.critical > 0 && (
                    <div>• {errorData.critical} critical system errors active</div>
                  )}
                </div>
              </div>
              <Link href="/admin/margin-steering">
                <Button variant="destructive" size="sm">
                  Review Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Stats Grid (5 cards) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* NEW: Executive Alerts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Margin Health Card */}
        <Link href="/admin/margin-steering">
          <Card className={cn(
            "hover:shadow-lg transition-shadow cursor-pointer",
            marginData.criticalProjects > 0 && "border-red-300"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margin Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marginData.overallMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Overall margin this month
              </p>
              <div className="flex items-center text-xs mt-2">
                {marginData.marginTrend === 'up' ? (
                  <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
                ) : marginData.marginTrend === 'down' ? (
                  <ArrowDownIcon className="mr-1 h-3 w-3 text-red-500" />
                ) : (
                  <Activity className="mr-1 h-3 w-3 text-blue-500" />
                )}
                <span className="text-muted-foreground">
                  {marginData.criticalProjects} critical projects
                </span>
              </div>
              {marginData.criticalProjects > 0 && (
                <Badge variant="destructive" className="mt-2">
                  Action Required
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Timeliness Health Card */}
        <Link href="/admin/timeliness">
          <Card className={cn(
            "hover:shadow-lg transition-shadow cursor-pointer",
            timelinessData.criticalAlerts > 0 && "border-orange-300"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Timeliness</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {timelinessData.criticalAlerts}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                critical delays
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>{timelinessData.pendingHoursUsers} pending hours</div>
                <div>{timelinessData.unsignedContracts} unsigned contracts</div>
                <div>{timelinessData.overdueInvoices} overdue invoices</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Error Monitoring Card */}
        <Link href="/admin/errors">
          <Card className={cn(
            "hover:shadow-lg transition-shadow cursor-pointer",
            errorData.critical > 0 && "border-red-500"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {errorData.critical + errorData.high}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                active errors
              </p>
              <div className="flex items-center gap-2 mt-2">
                {errorData.critical > 0 && (
                  <Badge variant="destructive">
                    {errorData.critical} Critical
                  </Badge>
                )}
                {errorData.high > 0 && (
                  <Badge variant="secondary">
                    {errorData.high} High
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {errorData.errorRate.toFixed(1)}% failure rate
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Existing sections: Automation Performance, Recent Projects, Recent Activity */}
      {/* ... keep existing code ... */}
    </div>
  )
}
```

### 2.2 Navigation Updates

Location: `src/app/admin/layout.tsx`

Add new navigation items:

```typescript
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/admin/projects',
    icon: FolderKanban,
  },
  // ... existing items ...
  {
    title: 'Financials',
    href: '/admin/financials',
    icon: DollarSign,
  },
  {
    title: 'Margin Steering', // NEW
    href: '/admin/margin-steering',
    icon: TrendingUp,
  },
  // ... more existing items ...
]

// Add automation section
const automationSection: NavSection = {
  title: 'Automation',
  icon: Activity,
  items: [
    // ... existing items ...
    {
      title: 'Timeliness', // NEW
      href: '/admin/timeliness',
      icon: AlertCircle,
    },
    {
      title: 'Errors', // NEW
      href: '/admin/errors',
      icon: Shield,
    },
  ],
}
```

Add badge support for navigation items:

```typescript
type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number // NEW
  badgeVariant?: 'default' | 'destructive' // NEW
}

// Fetch badge counts
const { data: dashboardData } = api.dashboard.getOverview.useQuery()

// Apply badges dynamically
const navItemsWithBadges = navItems.map((item) => {
  if (item.href === '/admin/margin-steering' && dashboardData?.margin.criticalProjects) {
    return { ...item, badge: dashboardData.margin.criticalProjects, badgeVariant: 'destructive' }
  }
  if (item.href === '/admin/timeliness' && dashboardData?.timeliness.criticalAlerts) {
    return { ...item, badge: dashboardData.timeliness.criticalAlerts }
  }
  if (item.href === '/admin/errors' && dashboardData?.errors.critical) {
    return { ...item, badge: dashboardData.errors.critical, badgeVariant: 'destructive' }
  }
  return item
})
```

---

## Phase 3: Margin Steering Page

**Duration**: Week 2-3
**Goal**: Dedicated margin analysis and profitability dashboard

### 3.1 Create Page Structure

Location: `src/app/admin/margin-steering/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react'
import { MarginWaterfallChart } from '@/components/admin/margin/MarginWaterfallChart'
import { ProjectMarginScatter } from '@/components/admin/margin/ProjectMarginScatter'
import { MarginFilters } from '@/components/admin/margin/MarginFilters'
import { ProjectMarginTable } from '@/components/admin/margin/ProjectMarginTable'

export default function MarginSteeringPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  // Queries
  const { data: overview } = api.financials.getOverview.useQuery({ month: selectedMonth })
  const { data: projects } = api.financials.getByProject.useQuery({ month: selectedMonth })
  const { data: employees } = api.financials.getByEmployee.useQuery({ month: selectedMonth })
  const { data: trendData } = api.financials.getMonthlyTrend.useQuery({ months: 12 })
  const { data: marginAlerts } = api.financials.getMarginAlerts.useQuery({ month: selectedMonth })

  if (!overview || !projects || !employees) {
    return <LoadingState />
  }

  // Calculate KPIs
  const criticalProjects = marginAlerts?.critical.length || 0
  const atRiskRevenue = marginAlerts?.atRiskRevenue || 0
  const excellentProjects = marginAlerts?.excellentProjects.length || 0

  // Calculate 3-month moving average
  const recentTrends = trendData?.slice(-3) || []
  const avgMargin = recentTrends.reduce((sum, m) => sum + m.marginPercentage, 0) / recentTrends.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Margin Steering</h1>
        <p className="text-muted-foreground">
          Real-time profitability analysis and margin optimization
        </p>
      </div>

      {/* Critical Alert Banner */}
      {criticalProjects > 0 && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">
                  {criticalProjects} {criticalProjects === 1 ? 'project' : 'projects'} below 25% margin
                </p>
                <p className="text-sm text-red-700 mt-1">
                  These projects require immediate attention to improve profitability
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero KPI */}
      <Card className={cn(
        "border-2",
        overview.marginPercentage >= 40 ? "border-green-300 bg-green-50" :
        overview.marginPercentage >= 25 ? "border-yellow-300 bg-yellow-50" :
        "border-red-300 bg-red-50"
      )}>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Overall Margin</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-6xl font-bold">
                {overview.marginPercentage.toFixed(1)}%
              </span>
              {overview.marginPercentage >= 40 && (
                <TrendingUp className="h-8 w-8 text-green-600" />
              )}
              {overview.marginPercentage < 25 && (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Revenue: </span>
                <span className="font-semibold">
                  {formatCurrency(overview.totalRevenue)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Cost: </span>
                <span className="font-semibold">
                  {formatCurrency(overview.totalCost)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Margin: </span>
                <span className="font-semibold">
                  {formatCurrency(overview.totalMargin)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supporting KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">3-month average</p>
            {/* Mini sparkline chart */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low-Margin Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalProjects}</div>
            <p className="text-xs text-muted-foreground">&lt;25% margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(atRiskRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">25-40% margin zone</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{excellentProjects}</div>
            <p className="text-xs text-muted-foreground">&gt;50% margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Month Selector + Filters */}
      <MarginFilters
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Visualizations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Margin Waterfall (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <MarginWaterfallChart data={trendData?.slice(-6) || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Margin Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectMarginScatter projects={projects} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <ProjectMarginTable projects={projects} />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeMarginTable employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 3.2 Recharts Components

#### Waterfall Chart

Location: `src/components/admin/margin/MarginWaterfallChart.tsx`

```typescript
'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

interface MarginWaterfallChartProps {
  data: {
    month: string
    label: string
    revenue: number
    cost: number
    margin: number
    marginPercentage: number
  }[]
}

export function MarginWaterfallChart({ data }: MarginWaterfallChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" unit="%" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />

        {/* Stacked bars for revenue/cost */}
        <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue" />
        <Bar yAxisId="left" dataKey="cost" fill="#f97316" name="Cost" />

        {/* Margin % line */}
        <Line
          yAxisId="right"
          dataKey="marginPercentage"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Margin %"
        />

        {/* Reference lines for thresholds */}
        <ReferenceLine
          yAxisId="right"
          y={40}
          stroke="#10b981"
          strokeDasharray="3 3"
          label="Target (40%)"
        />
        <ReferenceLine
          yAxisId="right"
          y={25}
          stroke="#f59e0b"
          strokeDasharray="3 3"
          label="Warning (25%)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

#### Scatter Chart

Location: `src/components/admin/margin/ProjectMarginScatter.tsx`

```typescript
'use client'

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'

interface ProjectMarginScatterProps {
  projects: {
    id: string
    name: string
    revenue: number
    marginPercentage: number
    hours: number
  }[]
}

export function ProjectMarginScatter({ projects }: ProjectMarginScatterProps) {
  // Classify projects by margin health
  const criticalProjects = projects.filter(p => p.marginPercentage < 25)
  const warningProjects = projects.filter(p => p.marginPercentage >= 25 && p.marginPercentage < 40)
  const healthyProjects = projects.filter(p => p.marginPercentage >= 40)

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="revenue"
          name="Revenue"
          type="number"
          unit="€"
          tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
        />
        <YAxis
          dataKey="marginPercentage"
          name="Margin"
          type="number"
          unit="%"
        />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
        <Legend />

        {/* Critical projects (red) */}
        <Scatter
          name="Critical (<25%)"
          data={criticalProjects}
          fill="#ef4444"
        >
          {criticalProjects.map((entry, index) => (
            <Cell key={`cell-${index}`} />
          ))}
        </Scatter>

        {/* Warning projects (yellow) */}
        <Scatter
          name="Warning (25-40%)"
          data={warningProjects}
          fill="#f59e0b"
        />

        {/* Healthy projects (green) */}
        <Scatter
          name="Healthy (≥40%)"
          data={healthyProjects}
          fill="#10b981"
        />

        {/* Threshold lines */}
        <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" />
        <ReferenceLine y={40} stroke="#10b981" strokeDasharray="3 3" />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
```

### 3.3 Project Margin Table

Location: `src/components/admin/margin/ProjectMarginTable.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProjectMarginTableProps {
  projects: {
    id: string
    name: string
    clientName: string
    hours: number
    revenue: number
    cost: number
    margin: number
    marginPercentage: number
  }[]
}

export function ProjectMarginTable({ projects }: ProjectMarginTableProps) {
  const [sortField, setSortField] = useState<'revenue' | 'margin' | 'marginPercentage'>('revenue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const sortedProjects = [...projects].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('revenue')}>
              Revenue {sortField === 'revenue' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Cost</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('margin')}>
              Margin {sortField === 'margin' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('marginPercentage')}>
              Margin % {sortField === 'marginPercentage' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProjects.map((project) => {
            const marginHealth = getMarginHealth(project.marginPercentage)

            return (
              <TableRow
                key={project.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  marginHealth === 'critical' && "bg-red-50",
                  marginHealth === 'warning' && "bg-yellow-50"
                )}
              >
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.clientName}</TableCell>
                <TableCell>{project.hours.toFixed(1)}h</TableCell>
                <TableCell>{formatCurrency(project.revenue)}</TableCell>
                <TableCell>{formatCurrency(project.cost)}</TableCell>
                <TableCell>{formatCurrency(project.margin)}</TableCell>
                <TableCell>
                  <span className={cn(
                    "font-semibold",
                    marginHealth === 'excellent' && "text-green-600",
                    marginHealth === 'healthy' && "text-green-600",
                    marginHealth === 'warning' && "text-orange-600",
                    marginHealth === 'critical' && "text-red-600"
                  )}>
                    {project.marginPercentage.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    marginHealth === 'critical' ? 'destructive' :
                    marginHealth === 'warning' ? 'secondary' :
                    marginHealth === 'excellent' ? 'default' :
                    'outline'
                  }>
                    {marginHealth}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function getMarginHealth(marginPercentage: number): 'critical' | 'warning' | 'healthy' | 'excellent' {
  if (marginPercentage < 25) return 'critical'
  if (marginPercentage < 40) return 'warning'
  if (marginPercentage >= 50) return 'excellent'
  return 'healthy'
}
```

---

## Phase 4: Timeliness Tracking Page

**Duration**: Week 3
**Goal**: Administrative health monitoring and bottleneck detection

### 4.1 Create Page Structure

Location: `src/app/admin/timeliness/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, FileText, Receipt, Workflow } from 'lucide-react'
import { PendingHoursTable } from '@/components/admin/timeliness/PendingHoursTable'
import { UnsignedContractsTable } from '@/components/admin/timeliness/UnsignedContractsTable'
import { OverdueInvoicesTable } from '@/components/admin/timeliness/OverdueInvoicesTable'
import { StuckWorkflowsTable } from '@/components/admin/timeliness/StuckWorkflowsTable'

export default function TimelinessPage() {
  const [activeTab, setActiveTab] = useState('hours')

  // Queries
  const { data: overview } = api.timeliness.getOverview.useQuery()
  const { data: pendingHours } = api.timeliness.getPendingHours.useQuery({})
  const { data: unsignedContracts } = api.timeliness.getUnsignedContracts.useQuery({})
  const { data: overdueInvoices } = api.timeliness.getOverdueInvoices.useQuery({})
  const { data: stuckWorkflows } = api.timeliness.getStuckWorkflows.useQuery({})

  if (!overview) {
    return <LoadingState />
  }

  const criticalCount = overview.criticalAlerts

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administrative Timeliness</h1>
        <p className="text-muted-foreground">
          Monitor delays and bottlenecks across all administrative workflows
        </p>
      </div>

      {/* Critical Alert Banner */}
      {criticalCount > 0 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <div className="flex-1">
                <p className="font-semibold text-orange-900">
                  {criticalCount} critical administrative delays
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Items overdue for more than 14 days require immediate attention
                </p>
              </div>
              <Button variant="outline">
                Send Bulk Reminders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overview.criticalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">&gt;14 days late</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.pendingHoursUsers}
            </div>
            <p className="text-xs text-muted-foreground">users unsubmitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unsigned Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.unsignedContracts}
            </div>
            <p className="text-xs text-muted-foreground">&gt;7 days pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.overdueInvoices}
            </div>
            <p className="text-xs text-muted-foreground">past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours Lag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.avgHoursLag.toFixed(1)}d
            </div>
            <p className="text-xs text-muted-foreground">days late</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="hours">
            <Clock className="h-4 w-4 mr-2" />
            Hours
            {overview.pendingHoursUsers > 0 && (
              <Badge variant="destructive" className="ml-2">
                {overview.pendingHoursUsers}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <FileText className="h-4 w-4 mr-2" />
            Contracts
            {overview.unsignedContracts > 0 && (
              <Badge variant="secondary" className="ml-2">
                {overview.unsignedContracts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Invoices
            {overview.overdueInvoices > 0 && (
              <Badge variant="secondary" className="ml-2">
                {overview.overdueInvoices}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <Workflow className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hours">
          <PendingHoursTable data={pendingHours || []} />
        </TabsContent>

        <TabsContent value="contracts">
          <UnsignedContractsTable data={unsignedContracts || []} />
        </TabsContent>

        <TabsContent value="invoices">
          <OverdueInvoicesTable data={overdueInvoices || []} />
        </TabsContent>

        <TabsContent value="workflows">
          <StuckWorkflowsTable data={stuckWorkflows || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 4.2 Timeliness Check Cron Job

Location: `src/app/api/cron/timeliness-check/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { sendEmail } from '@/lib/notifications/email'
import { sendNotification } from '@/lib/notifications'

export async function GET() {
  try {
    console.log('[Timeliness Check] Starting daily check...')

    // 1. Check pending hours (last complete month)
    const lastMonth = getPreviousMonth()
    const pendingHoursUsers = await checkPendingHours(lastMonth)

    // 2. Check unsigned contracts
    const unsignedContracts = await checkUnsignedContracts()

    // 3. Check overdue invoices
    const overdueInvoices = await checkOverdueInvoices()

    // 4. Calculate critical alerts
    const criticalAlerts = [
      ...pendingHoursUsers.filter((u) => u.daysLate > 14),
      ...unsignedContracts.filter((c) => c.daysUnsigned > 21),
      ...overdueInvoices.filter((i) => i.daysOverdue > 30),
    ]

    // 5. Auto-send reminders for items >7 days late
    for (const user of pendingHoursUsers.filter((u) => u.daysLate > 7)) {
      await sendHoursReminder(user.id, lastMonth)
    }

    for (const contract of unsignedContracts.filter((c) => c.daysUnsigned > 7)) {
      await sendContractReminder(contract.id)
    }

    for (const invoice of overdueInvoices.filter((i) => i.daysOverdue > 14)) {
      await sendInvoiceReminder(invoice.id)
    }

    // 6. Email admin if critical count > 0
    if (criticalAlerts.length > 0) {
      await sendEmail({
        to: 'willem@scex.nl',
        from: process.env.EMAIL_FROM!,
        subject: '[CRITICAL] Administrative Delays Require Attention',
        html: generateCriticalAlertsEmail(criticalAlerts),
      })
    }

    // 7. Create in-app notifications for all delays
    for (const alert of criticalAlerts) {
      await prisma.notification.create({
        data: {
          userId: 'admin',
          type: 'SYSTEM_ALERT',
          title: 'Critical Administrative Delay',
          message: formatAlertMessage(alert),
          actionUrl: getAlertUrl(alert),
          channels: JSON.stringify(['IN_APP', 'EMAIL']),
        },
      })
    }

    console.log('[Timeliness Check] Complete:', {
      pendingHours: pendingHoursUsers.length,
      unsignedContracts: unsignedContracts.length,
      overdueInvoices: overdueInvoices.length,
      criticalAlerts: criticalAlerts.length,
    })

    return NextResponse.json({
      success: true,
      summary: {
        pendingHours: pendingHoursUsers.length,
        unsignedContracts: unsignedContracts.length,
        overdueInvoices: overdueInvoices.length,
        criticalAlerts: criticalAlerts.length,
      },
    })
  } catch (error) {
    console.error('[Timeliness Check] Error:', error)
    return NextResponse.json({ error: 'Failed to complete timeliness check' }, { status: 500 })
  }
}

// Helper functions
async function checkPendingHours(month: string) {
  // Find active project members
  const activeMembers = await prisma.projectMember.findMany({
    where: {
      leftAt: null,
      project: { status: 'ACTIVE' },
    },
    include: {
      user: true,
      project: true,
    },
  })

  // Check hours for each member
  const pendingUsers = []

  for (const member of activeMembers) {
    const hoursCount = await prisma.hoursEntry.count({
      where: {
        userId: member.userId,
        date: {
          gte: new Date(`${month}-01`),
          lt: new Date(`${getNextMonth(month)}-01`),
        },
      },
    })

    if (hoursCount === 0) {
      const monthEnd = new Date(`${getNextMonth(month)}-01`)
      const daysLate = Math.floor((Date.now() - monthEnd.getTime()) / (24 * 60 * 60 * 1000))

      pendingUsers.push({
        id: member.userId,
        name: member.user.name,
        email: member.user.email,
        projects: [member.project.name],
        month,
        daysLate,
      })
    }
  }

  return pendingUsers
}

async function checkUnsignedContracts() {
  const unsignedContracts = await prisma.contract.findMany({
    where: {
      status: 'SENT',
    },
    include: {
      user: true,
      project: true,
    },
  })

  return unsignedContracts.map((contract) => ({
    id: contract.id,
    employeeName: contract.user.name,
    employeeEmail: contract.user.email,
    projectName: contract.project.name,
    sentAt: contract.sentAt,
    daysUnsigned: contract.sentAt
      ? Math.floor((Date.now() - contract.sentAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0,
  }))
}

async function checkOverdueInvoices() {
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'SENT',
      dueDate: { lt: new Date() },
    },
    include: {
      project: true,
    },
  })

  return overdueInvoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    projectName: invoice.project.name,
    clientName: invoice.project.clientName,
    amount: invoice.amount,
    dueDate: invoice.dueDate,
    daysOverdue: Math.floor((Date.now() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000)),
  }))
}
```

Schedule in Vercel `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/timeliness-check",
      "schedule": "0 9 * * *"
    }
  ]
}
```

---

## Phase 5: Error Monitoring Page

**Duration**: Week 3-4
**Goal**: System health visibility and error management

### 5.1 Create Page Structure

Location: `src/app/admin/errors/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Shield, TrendingDown, Clock } from 'lucide-react'
import { ErrorList } from '@/components/admin/errors/ErrorList'
import { ErrorHistory } from '@/components/admin/errors/ErrorHistory'
import { ErrorAnalytics } from '@/components/admin/errors/ErrorAnalytics'
import { ErrorDetailModal } from '@/components/admin/errors/ErrorDetailModal'

export default function ErrorsPage() {
  const [activeTab, setActiveTab] = useState('active')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedError, setSelectedError] = useState<string | null>(null)

  // Queries
  const { data: stats } = api.errors.getErrorStats.useQuery()
  const { data: activeErrors } = api.errors.getActiveErrors.useQuery({
    severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
  })
  const { data: errorHistory } = api.errors.getErrorHistory.useQuery({})
  const { data: analytics } = api.errors.getErrorAnalytics.useQuery({ timeRange: '30d' })

  if (!stats) {
    return <LoadingState />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Error Monitoring</h1>
        <p className="text-muted-foreground">
          System health visibility and exception management
        </p>
      </div>

      {/* Critical Error Banner */}
      {stats.critical > 0 && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">
                  {stats.critical} critical {stats.critical === 1 ? 'error' : 'errors'} active
                </p>
                <p className="text-sm text-red-700 mt-1">
                  These errors require immediate investigation and resolution
                </p>
              </div>
              <Button variant="destructive">
                View Critical Errors
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Critical Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.high}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-blue-500" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.errorRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Avg Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.mttr.toFixed(0)}m
            </div>
            <p className="text-xs text-muted-foreground">Mean time to resolve</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">
              Active Errors
              {(stats.critical + stats.high) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.critical + stats.high}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Error History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {activeTab === 'active' && (
            <div className="flex items-center gap-2">
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="active">
          <ErrorList
            errors={activeErrors || []}
            onErrorClick={setSelectedError}
          />
        </TabsContent>

        <TabsContent value="history">
          <ErrorHistory data={errorHistory || []} />
        </TabsContent>

        <TabsContent value="analytics">
          <ErrorAnalytics data={analytics} />
        </TabsContent>
      </Tabs>

      {/* Error Detail Modal */}
      {selectedError && (
        <ErrorDetailModal
          errorId={selectedError}
          onClose={() => setSelectedError(null)}
        />
      )}
    </div>
  )
}
```

### 5.2 Error Alert System

Location: `src/lib/notifications/alerts.ts`

```typescript
import { sendEmail } from './email'
import { prisma } from '@/server/db'
import { NotificationType } from '@prisma/client'

interface AlertData {
  errorId?: string
  severity?: string
  category?: string
  message?: string
  context?: Record<string, any>
  [key: string]: any
}

export async function sendCriticalAlert({
  type,
  data,
}: {
  type: 'margin' | 'timeliness' | 'error'
  data: AlertData
}) {
  // Generate email HTML
  const html = generateAlertEmail(type, data)

  // Send email
  await sendEmail({
    to: 'willem@scex.nl',
    from: process.env.EMAIL_FROM!,
    subject: `[CRITICAL] ${type.charAt(0).toUpperCase() + type.slice(1)} Alert`,
    html,
  })

  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId: 'admin', // TODO: Get actual admin user ID
      type: NotificationType.SYSTEM_ALERT,
      title: `Critical ${type} Alert`,
      message: formatAlertMessage(type, data),
      actionUrl: getAlertUrl(type, data),
      channels: JSON.stringify(['IN_APP', 'EMAIL']),
    },
  })
}

function generateAlertEmail(type: string, data: AlertData): string {
  switch (type) {
    case 'error':
      return `
        <h2>Critical Error Detected</h2>
        <p><strong>Severity:</strong> ${data.severity}</p>
        <p><strong>Category:</strong> ${data.category}</p>
        <p><strong>Message:</strong> ${data.message}</p>
        ${data.context ? `<p><strong>Context:</strong> <pre>${JSON.stringify(data.context, null, 2)}</pre></p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_URL}/admin/errors/${data.errorId}">View Error Details</a></p>
      `
    case 'margin':
      return `
        <h2>Critical Margin Alert</h2>
        <p><strong>Projects below 15% margin:</strong> ${data.count}</p>
        <p>These projects require immediate attention to improve profitability.</p>
        <p><a href="${process.env.NEXT_PUBLIC_URL}/admin/margin-steering">View Margin Dashboard</a></p>
      `
    case 'timeliness':
      return `
        <h2>Critical Administrative Delays</h2>
        <p><strong>Items overdue >14 days:</strong> ${data.count}</p>
        <ul>
          ${data.items?.map((item: any) => `<li>${item}</li>`).join('') || ''}
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_URL}/admin/timeliness">View Timeliness Dashboard</a></p>
      `
    default:
      return `<p>Alert: ${JSON.stringify(data)}</p>`
  }
}

function formatAlertMessage(type: string, data: AlertData): string {
  switch (type) {
    case 'error':
      return `${data.severity} error: ${data.message?.substring(0, 100)}...`
    case 'margin':
      return `${data.count} projects below critical margin threshold`
    case 'timeliness':
      return `${data.count} administrative items overdue >14 days`
    default:
      return JSON.stringify(data)
  }
}

function getAlertUrl(type: string, data?: AlertData): string {
  switch (type) {
    case 'error':
      return `/admin/errors/${data?.errorId || ''}`
    case 'margin':
      return '/admin/margin-steering'
    case 'timeliness':
      return '/admin/timeliness'
    default:
      return '/admin/dashboard'
  }
}
```

---

## Phase 6: Integration & Polish

**Duration**: Week 4-5
**Goal**: Cross-page integration, email alerts, and final polish

### 6.1 Daily Digest Email (Optional)

Create morning summary cron job:

Location: `src/app/api/cron/daily-digest/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/notifications/email'
import { getMarginStats, getTimelinessStats, getErrorStats } from '@/lib/dashboard/stats'

export async function GET() {
  try {
    console.log('[Daily Digest] Generating...')

    // Fetch stats
    const marginStats = await getMarginStats()
    const timelinessStats = await getTimelinessStats()
    const errorStats = await getErrorStats()

    // Generate HTML
    const html = `
      <h2>Good morning,</h2>
      <p>Here's your daily operational summary:</p>

      <h3>MARGIN HEALTH:</h3>
      <ul>
        <li>Overall margin: ${marginStats.overallMargin.toFixed(1)}% (${marginStats.trend})</li>
        <li>${marginStats.criticalProjects} projects require attention (&lt;25% margin)</li>
        <li>€${marginStats.atRiskRevenue.toLocaleString()} revenue at risk (25-40% margin zone)</li>
      </ul>

      <h3>ADMINISTRATIVE TIMELINESS:</h3>
      <ul>
        <li>${timelinessStats.pendingHours} employees haven't submitted hours</li>
        <li>${timelinessStats.unsignedContracts} contracts unsigned</li>
        <li>${timelinessStats.overdueInvoices} invoices overdue</li>
      </ul>

      <h3>SYSTEM HEALTH:</h3>
      <ul>
        <li>${errorStats.criticalErrors} critical, ${errorStats.highErrors} high-priority errors active</li>
        <li>${errorStats.successRate.toFixed(1)}% automation success rate</li>
      </ul>

      <p><a href="${process.env.NEXT_PUBLIC_URL}/admin/dashboard">View Full Dashboard</a></p>
    `

    // Send email
    await sendEmail({
      to: 'willem@scex.nl',
      from: process.env.EMAIL_FROM!,
      subject: 'Simplicate Automation - Daily Summary',
      html,
    })

    console.log('[Daily Digest] Sent successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Daily Digest] Error:', error)
    return NextResponse.json({ error: 'Failed to send daily digest' }, { status: 500 })
  }
}
```

Schedule in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/timeliness-check",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 6.2 Error Auto-Resolution

Create cleanup cron job:

Location: `src/app/api/cron/error-cleanup/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/server/db'

export async function GET() {
  try {
    console.log('[Error Cleanup] Starting...')

    // Find errors with no occurrences in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const staleErrors = await prisma.errorRecord.findMany({
      where: {
        status: 'ACTIVE',
        lastOccurrence: { lt: yesterday },
      },
    })

    // Auto-resolve
    for (const error of staleErrors) {
      await prisma.errorRecord.update({
        where: { id: error.id },
        data: {
          status: 'AUTO_RESOLVED',
          resolvedAt: new Date(),
          resolutionNotes: 'Auto-resolved after 24 hours with no new occurrences',
        },
      })
    }

    console.log(`[Error Cleanup] Auto-resolved ${staleErrors.length} errors`)

    return NextResponse.json({
      success: true,
      resolved: staleErrors.length,
    })
  } catch (error) {
    console.error('[Error Cleanup] Error:', error)
    return NextResponse.json({ error: 'Failed to cleanup errors' }, { status: 500 })
  }
}
```

Schedule hourly in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/error-cleanup",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## Implementation Roadmap

### Week 1: Foundation

- [x] Create ErrorRecord schema and migrate database
- [x] Build timeliness, errors tRPC routers
- [x] Extend dashboard router with margin/timeliness/error stats
- [x] Implement centralized error handler
- [x] Integrate error capture in workflows

### Week 2: Dashboard Enhancement

- [x] Add margin/timeliness/error KPI cards to dashboard
- [x] Implement critical alert banner
- [x] Update navigation with new sections
- [x] Build margin steering page (basic version)
- [x] Create margin waterfall chart component

### Week 3: Detail Pages

- [x] Complete margin steering page (all charts + tables)
- [x] Build timeliness tracking page with all tabs
- [x] Create error monitoring page (active errors list)
- [x] Implement error detail modal

### Week 4: Actions & Alerts

- [x] Build action buttons (retry, acknowledge, resolve)
- [x] Implement email alert system
- [x] Create timeliness check cron job
- [x] Add bulk operations (retry multiple, send reminders)

### Week 5: Integration & Polish

- [x] Cross-page error indicators
- [x] Configurable margin threshold UI
- [x] Daily digest email (optional)
- [x] Performance optimization
- [x] Testing and bug fixes

---

## Technical Specifications

### Database Indexes

Add these indexes to `prisma/schema.prisma` for performance:

```prisma
model ErrorRecord {
  // ... fields ...

  @@index([severity, status])
  @@index([category, status])
  @@index([firstOccurrence])
  @@index([automationLogId])
  @@index([queueItemId])
}

model HoursEntry {
  // ... existing indexes ...
  @@index([date, status])
  @@index([userId, date])
}

model Contract {
  // ... existing indexes ...
  @@index([status, sentAt])
}

model Invoice {
  // ... existing indexes ...
  @@index([status, dueDate])
}

model WorkflowQueue {
  // ... existing indexes ...
  @@index([status, scheduledFor])
}
```

### Recharts Configuration

**Color Palette**:

- Green (healthy): `#10b981`
- Yellow (warning): `#f59e0b`
- Red (critical): `#ef4444`
- Blue (neutral): `#3b82f6`
- Orange (accent): `#f97316`

**Chart Types**:

1. **Waterfall Chart**: ComposedChart with Bar (revenue/cost) + Line (margin %)
2. **Scatter Chart**: ScatterChart with reference lines at 25% and 40% thresholds
3. **Trend Chart**: AreaChart showing margin gap over time
4. **Pie Chart**: Employee type margin contribution

### Threshold System

**Default Thresholds**:

- Target margin: 40%
- Warning threshold: 25%
- Critical threshold: 15%

**Priority Levels (Timeliness)**:

- Critical: >14 days overdue
- Warning: >7 days overdue
- Normal: >3 days overdue

**Error Severity**:

- CRITICAL: System-breaking (email service down, database errors)
- HIGH: Significant issues (workflow max retries, API auth failures)
- MEDIUM: Isolated failures (rate limits, timeouts, first-attempt failures)
- LOW: Informational (validation errors, user-specific issues)

### Performance Optimization

**Caching Strategy**:

- Dashboard stats: 5-minute cache (React Query)
- Financial data: 10-minute cache
- Error stats: 1-minute cache (real-time important)

**Query Optimization**:

- Use `Promise.all()` for parallel queries
- Pagination: Default 20 items, max 100
- Eager loading with `include` for related data

**Database Performance**:

- Indexes on frequently queried fields
- Limit result sets with pagination
- Use `count()` instead of `findMany().length`

---

## Success Metrics

### Margin Steering

✅ Real-time visibility into project profitability
✅ Immediate alerts for <15% margin projects
✅ Trend analysis showing margin improvement/degradation
✅ Drill-down to employee-level margin contribution
✅ Configurable thresholds per project/system-wide

### Timeliness Tracking

✅ Zero hours >14 days unsubmitted
✅ <3 day average contract signing time
✅ Zero invoices >30 days overdue
✅ Automated reminders reducing manual follow-up by 80%
✅ Real-time visibility into administrative bottlenecks

### Error Monitoring

✅ <1% critical error rate
✅ <5 minute mean time to detection (MTTD)
✅ <15 minute mean time to resolution (MTTR)
✅ 95%+ automation success rate maintained
✅ Pattern detection for recurring issues
✅ Auto-resolution for transient errors

---

## Files to Create/Modify

### New Files (19 files)

**Database**:

1. `prisma/schema.prisma` - Add ErrorRecord model, extend AutomationLog/WorkflowQueue

**Routers**: 2. `src/server/api/routers/timeliness.ts` - Timeliness tracking queries 3. `src/server/api/routers/errors.ts` - Error monitoring queries

**Pages**: 4. `src/app/admin/margin-steering/page.tsx` - Margin dashboard 5. `src/app/admin/timeliness/page.tsx` - Timeliness dashboard 6. `src/app/admin/errors/page.tsx` - Error monitoring dashboard 7. `src/app/admin/errors/[errorId]/page.tsx` - Error detail view

**Components** (margin): 8. `src/components/admin/margin/MarginWaterfallChart.tsx` 9. `src/components/admin/margin/ProjectMarginScatter.tsx` 10. `src/components/admin/margin/ProjectMarginTable.tsx`

**Components** (timeliness): 11. `src/components/admin/timeliness/PendingHoursTable.tsx` 12. `src/components/admin/timeliness/UnsignedContractsTable.tsx`

**Components** (errors): 13. `src/components/admin/errors/ErrorList.tsx` 14. `src/components/admin/errors/ErrorDetailModal.tsx`

**Libraries**: 15. `src/lib/errors/handler.ts` - Centralized error capture 16. `src/lib/errors/classifier.ts` - Error severity/category logic 17. `src/lib/notifications/alerts.ts` - Critical alert email system 18. `src/lib/timeliness/calculations.ts` - KPI calculation helpers

**Cron**: 19. `src/app/api/cron/timeliness-check/route.ts` - Daily timeliness check

### Files to Modify (4 files)

20. `src/app/admin/dashboard/page.tsx` - Add new KPI cards, alert banner
21. `src/server/api/routers/dashboard.ts` - Extend getOverview with margin/timeliness/error stats
22. `src/server/api/routers/financials.ts` - Add getMarginAlerts, margin settings queries
23. `src/app/admin/layout.tsx` - Add navigation items with badges

---

## Next Steps

1. ✅ **Plan Approved** - This document captures the complete implementation strategy
2. **Start Phase 1** - Begin with database schema extensions and tRPC router foundation
3. **Iterative Delivery** - Each phase delivers working, testable functionality
4. **User Feedback** - Adjust thresholds, alerts, and visualizations based on real usage
5. **Performance Monitoring** - Track query performance and optimize as needed

---

## Reference Links

- **Existing Documentation**: See `/docs/project/IMPLEMENTATION-PLAN.md` for overall system context
- **Financial Tracking**: See `/docs/project/FINANCIAL-TRACKING-PLAN.md` for rate hierarchy details
- **Recharts Documentation**: https://recharts.org/
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs

---

**End of Plan Document**
