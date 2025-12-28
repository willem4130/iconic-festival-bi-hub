# Option A: Backend Testing Guide

**Goal**: Test the complete automation system without building UI first. Verify all workflows execute correctly.

**Time Required**: 30-45 minutes
**Prerequisites**: Supabase account (free), Simplicate account

---

## Quick Overview

You'll test three workflows by:

1. Setting up a database
2. Creating test data
3. Triggering workflows manually or via webhooks
4. Checking results in the database

---

## Step 1: Database Setup (2 minutes)

### 1.1 Create Supabase Database

1. Go to [supabase.com](https://supabase.com)
2. Sign in with GitHub
3. Click "New Project"
4. Fill in:
   - Name: `simplicate-test`
   - Database Password: (generate and save it!)
   - Region: Choose closest
5. Wait ~2 minutes for setup

### 1.2 Get Connection String

1. Go to **Settings** → **Database**
2. Find **Connection string** → **URI** tab
3. Copy the string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your actual password

### 1.3 Update Environment

Edit `.env`:

```env
DATABASE_URL="your-copied-connection-string"
DIRECT_URL="your-copied-connection-string"
```

### 1.4 Initialize Database

```bash
npm run db:push
```

Expected output: "Your database is now in sync with your Prisma schema."

---

## Step 2: Add Simplicate Credentials (1 minute)

### Option 1: Use Real Simplicate (Recommended)

1. Log into Simplicate
2. Go to **Settings** → **API**
3. Generate API key
4. Add to `.env`:
   ```env
   SIMPLICATE_API_KEY="your-api-key"
   SIMPLICATE_API_SECRET="your-api-secret"
   SIMPLICATE_DOMAIN="your-company.simplicate.com"
   ```

### Option 2: Test Without Simplicate (Mock Data)

If you don't have Simplicate credentials yet, you can still test with mock data. The system will work but won't sync with real Simplicate.

---

## Step 3: Create Test Data (5 minutes)

### 3.1 Create Test Script

Create `test-data-setup.ts`:

```typescript
import { prisma } from './src/lib/db'

async function createTestData() {
  console.log('Creating test data...\n')

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'ADMIN',
    },
  })
  console.log('✅ Created admin:', admin.email)

  // Create team member
  const teamMember = await prisma.user.create({
    data: {
      email: 'john@test.com',
      name: 'John Doe',
      role: 'TEAM_MEMBER',
      simplicateEmployeeId: 'emp-test-001',
      notificationPrefs: {
        create: {
          emailEnabled: true,
          slackEnabled: false,
          inAppEnabled: true,
          hoursReminders: true,
        },
      },
    },
  })
  console.log('✅ Created team member:', teamMember.email)

  // Create test project
  const project = await prisma.project.create({
    data: {
      simplicateId: 'project-test-001',
      name: 'Test Website Build',
      description: 'Building a new website for client',
      status: 'ACTIVE',
      clientName: 'Test Client Corp',
      projectNumber: 'PRJ-2025-001',
      startDate: new Date('2025-01-01'),
    },
  })
  console.log('✅ Created project:', project.name)

  // Create hours entry (approved, ready for invoicing)
  const hoursEntry = await prisma.hoursEntry.create({
    data: {
      projectId: project.id,
      userId: teamMember.id,
      hours: 40,
      date: new Date('2025-01-15'),
      description: 'Frontend development work',
      hourlyRate: 100,
      status: 'APPROVED',
      submittedAt: new Date(),
      approvedAt: new Date(),
    },
  })
  console.log('✅ Created hours entry:', hoursEntry.hours, 'hours')

  console.log('\n✅ Test data created successfully!')
  console.log('\n📊 Summary:')
  console.log('  - Users: 2 (1 admin, 1 team member)')
  console.log('  - Projects: 1')
  console.log('  - Hours: 40 (approved)')
  console.log('\n💡 Ready to test workflows!')
}

createTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 3.2 Run Test Data Script

```bash
npx tsx test-data-setup.ts
```

---

## Step 4: Test Workflows (15-20 minutes)

### Test 1: Contract Distribution Workflow

**What it does**: Sends contracts to team members when they join a project.

```bash
# Create test-contract-workflow.ts
```

```typescript
import { runContractDistribution } from './src/lib/workflows/contract-distribution'
import { prisma } from './src/lib/db'

async function testContractWorkflow() {
  console.log('🧪 Testing Contract Distribution Workflow\n')

  // Get test project
  const project = await prisma.project.findFirst({
    where: { simplicateId: 'project-test-001' },
  })

  if (!project) {
    console.error('❌ Test project not found')
    return
  }

  // Run workflow
  console.log('Running contract distribution...')
  const result = await runContractDistribution({
    projectId: project.id,
    templateName: 'Standard Development Contract',
  })

  console.log('\n✅ Workflow completed!')
  console.log('  Contracts created:', result.contractsCreated)

  // Check database
  const contracts = await prisma.contract.findMany({
    where: { projectId: project.id },
    include: { user: true },
  })

  console.log('\n📋 Contracts in database:')
  contracts.forEach((contract) => {
    console.log(`  - ${contract.user.name}: ${contract.status}`)
  })

  // Check notifications
  const notifications = await prisma.notification.findMany({
    where: { type: 'CONTRACT_ASSIGNED' },
  })

  console.log('\n🔔 Notifications sent:', notifications.length)
}

testContractWorkflow()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run it:

```bash
npx tsx test-contract-workflow.ts
```

**Expected Output**:

```
✅ Workflow completed!
  Contracts created: 1

📋 Contracts in database:
  - John Doe: SENT

🔔 Notifications sent: 1
```

### Test 2: Hours Reminder Workflow

**What it does**: Reminds team members to submit missing hours.

```bash
# Create test-hours-workflow.ts
```

```typescript
import { runHoursReminder } from './src/lib/workflows/hours-reminder'
import { prisma } from './src/lib/db'

async function testHoursWorkflow() {
  console.log('🧪 Testing Hours Reminder Workflow\n')

  // Run workflow
  console.log('Running hours reminder check...')
  const result = await runHoursReminder({ period: 'current' })

  console.log('\n✅ Workflow completed!')
  console.log('  Reminders sent:', result.remindersSent)

  // Check automation logs
  const logs = await prisma.automationLog.findMany({
    where: { workflowType: 'HOURS_REMINDER' },
    orderBy: { startedAt: 'desc' },
    take: 1,
  })

  if (logs.length > 0) {
    console.log('\n📊 Latest automation log:')
    console.log('  Status:', logs[0].status)
    console.log('  Started:', logs[0].startedAt.toLocaleString())
    console.log('  Completed:', logs[0].completedAt?.toLocaleString())
  }
}

testHoursWorkflow()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run it:

```bash
npx tsx test-hours-workflow.ts
```

### Test 3: Invoice Generation Workflow

**What it does**: Creates invoices from approved hours.

```bash
# Create test-invoice-workflow.ts
```

```typescript
import { runInvoiceGeneration } from './src/lib/workflows/invoice-generation'
import { prisma } from './src/lib/db'

async function testInvoiceWorkflow() {
  console.log('🧪 Testing Invoice Generation Workflow\n')

  // Run workflow
  console.log('Running invoice generation...')
  const result = await runInvoiceGeneration()

  console.log('\n✅ Workflow completed!')
  console.log('  Invoices created:', result.invoicesCreated)

  // Check invoices
  const invoices = await prisma.invoice.findMany({
    include: {
      project: true,
      hoursEntries: true,
    },
  })

  console.log('\n💰 Invoices in database:')
  invoices.forEach((invoice) => {
    console.log(`  - ${invoice.project.name}`)
    console.log(`    Amount: $${invoice.amount}`)
    console.log(`    Status: ${invoice.status}`)
    console.log(`    Hours: ${invoice.hoursEntries.length} entries`)
  })
}

testInvoiceWorkflow()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run it:

```bash
npx tsx test-invoice-workflow.ts
```

**Expected Output**:

```
✅ Workflow completed!
  Invoices created: 1

💰 Invoices in database:
  - Test Website Build
    Amount: $4000
    Status: DRAFT
    Hours: 1 entries
```

---

## Step 5: Test Webhook Receiver (10 minutes)

### 5.1 Start Dev Server

```bash
npm run dev
```

### 5.2 Test with curl

In a new terminal:

```bash
# Test project.created event
curl -X POST http://localhost:3000/api/webhooks/simplicate \
  -H "Content-Type: application/json" \
  -d '{
    "event": "project.created",
    "data": {
      "id": "project-webhook-test",
      "name": "Webhook Test Project",
      "organization": {"name": "Test Company"},
      "project_number": "PRJ-2025-002"
    },
    "timestamp": "2025-11-20T12:00:00Z"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "eventId": "clx..."
}
```

### 5.3 Check Database

```typescript
// check-webhook-results.ts
import { prisma } from './src/lib/db'

async function checkResults() {
  // Check webhook event was stored
  const webhookEvent = await prisma.webhookEvent.findFirst({
    where: { eventType: 'project.created' },
    orderBy: { createdAt: 'desc' },
  })

  console.log('📥 Webhook received:', webhookEvent?.processed)

  // Check project was created
  const project = await prisma.project.findFirst({
    where: { simplicateId: 'project-webhook-test' },
  })

  console.log('📊 Project created:', project?.name)

  // Check automation was triggered
  const automation = await prisma.automationLog.findFirst({
    where: {
      projectId: project?.id,
      workflowType: 'CONTRACT_DISTRIBUTION',
    },
  })

  console.log('🤖 Automation triggered:', automation?.status)
}

checkResults()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

```bash
npx tsx check-webhook-results.ts
```

---

## Step 6: Verify in Supabase Dashboard (5 minutes)

### 6.1 View Data in Supabase

1. Go to Supabase dashboard
2. Click **Table Editor**
3. Check these tables:
   - `Project` - Should see test projects
   - `Contract` - Should see contracts created
   - `HoursEntry` - Should see hours logged
   - `Invoice` - Should see invoices generated
   - `Notification` - Should see notifications sent
   - `AutomationLog` - Should see workflow executions
   - `WebhookEvent` - Should see received webhooks

### 6.2 Run SQL Queries

In Supabase **SQL Editor**:

```sql
-- Check automation success rate
SELECT
  workflowType,
  status,
  COUNT(*) as count
FROM "AutomationLog"
GROUP BY workflowType, status;

-- Check contracts by status
SELECT
  status,
  COUNT(*) as count
FROM "Contract"
GROUP BY status;

-- Check total invoice amount
SELECT
  SUM(amount) as total_amount,
  COUNT(*) as invoice_count
FROM "Invoice";
```

---

## Testing Checklist

After completing all tests, you should have:

- ✅ Database connected and populated
- ✅ Test users created (admin + team member)
- ✅ Test project created
- ✅ Contract distribution workflow executed
- ✅ Contracts created and sent
- ✅ Hours reminder workflow executed
- ✅ Invoice generation workflow executed
- ✅ Invoices created from hours
- ✅ Webhook receiver tested and working
- ✅ Automation logs recorded
- ✅ Notifications created (check database)

---

## Common Issues & Solutions

### "Cannot connect to database"

- Check connection string is correct
- Ensure password has no special characters that need escaping
- Try the "Session" mode connection string

### "Simplicate API error"

- Check API credentials are correct
- Verify domain format (no https://)
- Try without Simplicate first (mock data)

### "Workflow runs but nothing happens"

- Check automation logs in database for errors
- Look at terminal output for error messages
- Verify test data exists (users, projects)

### "Notifications not sending"

- Email requires Resend API key (optional for testing)
- Slack requires bot token (optional for testing)
- In-app notifications always work (check database)

---

## Success Criteria

You've successfully tested the backend when:

1. ✅ All workflows execute without errors
2. ✅ Data appears in database tables
3. ✅ Automation logs show SUCCESS status
4. ✅ Webhook receiver processes events
5. ✅ Contracts, invoices, notifications created

---

## What's Next?

**You've proven the automation works!** 🎉

Now you can:

1. **Deploy to production** - Deploy to Vercel, it'll work immediately
2. **Connect real Simplicate** - Add your production API credentials
3. **Build the UI** - Move to Option B (admin dashboard)
4. **Add more workflows** - Customize the automations

The system is production-ready for headless operation!

---

**Next**: See `OPTION_B_DASHBOARD.md` for building the admin UI.
