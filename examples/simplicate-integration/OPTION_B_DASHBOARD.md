# Option B: Admin Dashboard Implementation

**Goal**: Build a functional admin dashboard that visualizes your Simplicate automation system with real data.

**Time Required**: 4-6 hours (can be done incrementally)
**Prerequisites**: Backend tested (Option A completed)

---

## Quick Overview

You'll build a dashboard that shows:

1. **System Overview** - Stats cards with automation metrics
2. **Projects List** - All projects with statuses
3. **Contract Tracker** - Sent/pending/signed contracts
4. **Hours Overview** - Submitted hours by project
5. **Invoice Queue** - Draft/pending invoices
6. **Automation Logs** - Workflow execution history

---

## Architecture Plan

```
Admin Dashboard
├── Data Layer (tRPC Routers)
│   ├── dashboard.ts - Stats and overview data
│   ├── projects.ts - Project CRUD operations
│   ├── contracts.ts - Contract tracking
│   ├── hours.ts - Hours overview
│   ├── invoices.ts - Invoice management
│   └── automations.ts - Workflow logs
│
├── UI Components
│   ├── StatCard.tsx - Metric display cards
│   ├── ProjectsTable.tsx - Project list
│   ├── ContractsTable.tsx - Contract tracking
│   ├── AutomationLogViewer.tsx - Workflow logs
│   └── Charts (recharts) - Visual analytics
│
└── Pages
    ├── /admin/dashboard - Main overview
    ├── /admin/projects - Project management
    ├── /admin/contracts - Contract tracking
    ├── /admin/hours - Hours overview
    ├── /admin/invoices - Invoice queue
    └── /admin/automations - Logs viewer
```

---

## Phase 1: tRPC Data Layer (2 hours)

### Step 1.1: Create Dashboard Router

Create `src/server/api/routers/dashboard.ts`:

```typescript
import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { prisma } from '@/lib/db'

export const dashboardRouter = createTRPCRouter({
  // Get overview stats
  getStats: publicProcedure.query(async () => {
    const [
      projectCount,
      activeProjects,
      pendingContracts,
      totalHours,
      draftInvoices,
      automationRuns,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.contract.count({ where: { status: { in: ['PENDING', 'SENT'] } } }),
      prisma.hoursEntry.aggregate({ _sum: { hours: true } }),
      prisma.invoice.count({ where: { status: 'DRAFT' } }),
      prisma.automationLog.count(),
    ])

    // Calculate success rate
    const successfulRuns = await prisma.automationLog.count({
      where: { status: 'SUCCESS' },
    })
    const successRate = automationRuns > 0 ? Math.round((successfulRuns / automationRuns) * 100) : 0

    return {
      projects: {
        total: projectCount,
        active: activeProjects,
      },
      contracts: {
        pending: pendingContracts,
      },
      hours: {
        total: totalHours._sum.hours || 0,
      },
      invoices: {
        draft: draftInvoices,
      },
      automations: {
        total: automationRuns,
        successRate,
      },
    }
  }),

  // Get recent activity
  getRecentActivity: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const logs = await prisma.automationLog.findMany({
        take: input.limit,
        orderBy: { startedAt: 'desc' },
        include: {
          project: { select: { name: true } },
        },
      })

      return logs.map((log) => ({
        id: log.id,
        workflowType: log.workflowType,
        status: log.status,
        projectName: log.project?.name || 'N/A',
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        error: log.error,
      }))
    }),

  // Get workflow stats by type
  getWorkflowStats: publicProcedure.query(async () => {
    const stats = await prisma.automationLog.groupBy({
      by: ['workflowType', 'status'],
      _count: true,
    })

    return stats.map((stat) => ({
      workflow: stat.workflowType,
      status: stat.status,
      count: stat._count,
    }))
  }),
})
```

### Step 1.2: Create Projects Router

Create `src/server/api/routers/projects.ts`:

```typescript
import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { prisma } from '@/lib/db'

export const projectsRouter = createTRPCRouter({
  // List all projects
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const projects = await prisma.project.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: input.limit,
        skip: input.offset,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              contracts: true,
              hoursEntries: true,
              invoices: true,
            },
          },
        },
      })

      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        clientName: p.clientName,
        status: p.status,
        startDate: p.startDate,
        contractCount: p._count.contracts,
        hoursCount: p._count.hoursEntries,
        invoiceCount: p._count.invoices,
      }))
    }),

  // Get project details
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const project = await prisma.project.findUnique({
      where: { id: input.id },
      include: {
        contracts: {
          include: { user: { select: { name: true, email: true } } },
        },
        hoursEntries: {
          include: { user: { select: { name: true } } },
        },
        invoices: true,
        automationLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    })

    return project
  }),
})
```

### Step 1.3: Create Contracts Router

Create `src/server/api/routers/contracts.ts`:

```typescript
import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { prisma } from '@/lib/db'

export const contractsRouter = createTRPCRouter({
  // List contracts with filters
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'SENT', 'SIGNED', 'REJECTED', 'EXPIRED']).optional(),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const contracts = await prisma.contract.findMany({
        where: {
          ...(input.status && { status: input.status }),
          ...(input.projectId && { projectId: input.projectId }),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          project: { select: { name: true } },
        },
      })

      return contracts
    }),

  // Get contract stats
  getStats: publicProcedure.query(async () => {
    const stats = await prisma.contract.groupBy({
      by: ['status'],
      _count: true,
    })

    return stats.map((stat) => ({
      status: stat.status,
      count: stat._count,
    }))
  }),
})
```

### Step 1.4: Update Root Router

Edit `src/server/api/root.ts`:

```typescript
import { createTRPCRouter } from '@/server/api/trpc'
import { dashboardRouter } from '@/server/api/routers/dashboard'
import { projectsRouter } from '@/server/api/routers/projects'
import { contractsRouter } from '@/server/api/routers/contracts'

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  projects: projectsRouter,
  contracts: contractsRouter,
})

export type AppRouter = typeof appRouter
```

---

## Phase 2: UI Components (1.5 hours)

### Step 2.1: Create StatCard Component

Create `src/components/admin/StatCard.tsx`:

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: LucideIcon;
}

export function StatCard({ title, value, change, trend, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend === 'up' ? (
              <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownIcon className="mr-1 h-3 w-3 text-red-500" />
            )}
            <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 2.2: Create ProjectsTable Component

Create `src/components/admin/ProjectsTable.tsx`:

```typescript
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  clientName: string | null;
  status: string;
  contractCount: number;
  hoursCount: number;
  invoiceCount: number;
}

interface ProjectsTableProps {
  projects: Project[];
}

const statusColors = {
  ACTIVE: 'bg-green-500',
  COMPLETED: 'bg-blue-500',
  ON_HOLD: 'bg-yellow-500',
  CANCELLED: 'bg-red-500',
};

export function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project Name</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Contracts</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <Link
                href={`/admin/projects/${project.id}`}
                className="font-medium hover:underline"
              >
                {project.name}
              </Link>
            </TableCell>
            <TableCell>{project.clientName || '-'}</TableCell>
            <TableCell>
              <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                {project.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{project.contractCount}</TableCell>
            <TableCell className="text-right">{project.hoursCount}</TableCell>
            <TableCell className="text-right">{project.invoiceCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Phase 3: Update Dashboard Page (1 hour)

### Step 3.1: Replace Admin Dashboard

Edit `src/app/admin/dashboard/page.tsx`:

```typescript
'use client';

import { api } from '@/trpc/react';
import { StatCard } from '@/components/admin/StatCard';
import {
  Activity,
  FileText,
  Clock,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = api.dashboard.getStats.useQuery();
  const { data: recentActivity } = api.dashboard.getRecentActivity.useQuery({ limit: 5 });

  if (statsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Simplicate automation system overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={stats?.projects.active || 0}
          icon={Activity}
        />
        <StatCard
          title="Pending Contracts"
          value={stats?.contracts.pending || 0}
          icon={FileText}
        />
        <StatCard
          title="Total Hours"
          value={stats?.hours.total || 0}
          icon={Clock}
        />
        <StatCard
          title="Draft Invoices"
          value={stats?.invoices.draft || 0}
          icon={DollarSign}
        />
      </div>

      {/* Automation Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Success Rate</CardTitle>
          <CardDescription>
            {stats?.automations.total || 0} workflows executed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div>
              <div className="text-4xl font-bold">
                {stats?.automations.successRate || 0}%
              </div>
              <p className="text-sm text-muted-foreground">Success rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Automation Activity</CardTitle>
          <CardDescription>Latest workflow executions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity?.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4">
                <Badge
                  variant={activity.status === 'SUCCESS' ? 'default' : 'destructive'}
                >
                  {activity.status}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {activity.workflowType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.projectName} -{' '}
                    {new Date(activity.startedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 4: Add Projects Page (30 minutes)

Create `src/app/admin/projects/page.tsx`:

```typescript
'use client';

import { api } from '@/trpc/react';
import { ProjectsTable } from '@/components/admin/ProjectsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectsPage() {
  const { data: projects, isLoading } = api.projects.list.useQuery({});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Manage all Simplicate projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading projects...</div>
          ) : (
            <ProjectsTable projects={projects || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing the Dashboard

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Visit Dashboard

Go to: http://localhost:3000/admin/dashboard

You should see:

- ✅ Real stats from your database
- ✅ Active projects count
- ✅ Pending contracts
- ✅ Total hours logged
- ✅ Recent automation activity

### 3. Visit Projects Page

Go to: http://localhost:3000/admin/projects

You should see:

- ✅ List of all projects
- ✅ Status badges
- ✅ Contract/hours/invoice counts

---

## Next Steps

After implementing these core pages, you can add:

1. **Project Details Page** (`/admin/projects/[id]`)
   - Full project information
   - Associated contracts, hours, invoices
   - Automation history for this project

2. **Contracts Page** (`/admin/contracts`)
   - All contracts with status filters
   - Quick actions (resend, mark as signed)

3. **Invoices Page** (`/admin/invoices`)
   - Draft invoice queue
   - Approve/reject actions
   - Send to Simplicate

4. **Automation Logs** (`/admin/automations`)
   - Full workflow execution history
   - Error debugging
   - Retry failed workflows

5. **Real-time Updates**
   - Add tRPC subscriptions for live data
   - Toast notifications for new automations

---

## Implementation Checklist

### Phase 1: Data Layer ✅

- [ ] Dashboard router with stats
- [ ] Projects router with CRUD
- [ ] Contracts router
- [ ] Root router updated

### Phase 2: Components ✅

- [ ] StatCard component
- [ ] ProjectsTable component
- [ ] Other table components as needed

### Phase 3: Pages ✅

- [ ] Dashboard page updated
- [ ] Projects list page
- [ ] Contracts page
- [ ] Additional pages

### Phase 4: Polish

- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty states
- [ ] Add filters and search
- [ ] Add pagination

---

## Estimated Time Breakdown

- **Phase 1** (Data Layer): 2 hours
- **Phase 2** (Components): 1.5 hours
- **Phase 3** (Pages): 1 hour
- **Phase 4** (Polish): 1-2 hours

**Total**: 5.5-6.5 hours for full admin dashboard

---

**Previous**: See `OPTION_A_TESTING.md` for backend testing
**Next**: Deploy to production and enjoy your automation system! 🚀
