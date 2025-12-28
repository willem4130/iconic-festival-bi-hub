# Simplicate Automation System - Setup Guide

This guide will walk you through setting up the Simplicate Automation System from scratch.

## Overview

This system automates three main workflows:

1. **Contract Distribution** - Automatically send contracts when team members join projects
2. **Hours Reminders** - Remind team members to submit their hours
3. **Invoice Generation** - Generate invoices based on approved hours

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Simplicate account with API access
- (Optional) Resend account for emails
- (Optional) Slack workspace for notifications

## Step 1: Initial Setup

### 1.1 Install Dependencies

```bash
cd simplicate-automations
npm install
```

### 1.2 Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/simplicate_automations"
DIRECT_URL="postgresql://user:password@localhost:5432/simplicate_automations"

# NextAuth (Required)
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Simplicate API (Required)
SIMPLICATE_API_KEY="your-api-key"
SIMPLICATE_API_SECRET="your-api-secret"
SIMPLICATE_DOMAIN="your-company.simplicate.com"

# Email Service (Optional but recommended)
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@yourdomain.com"

# Slack (Optional)
SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"

# Redis for Rate Limiting (Optional)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

### 1.3 Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in your `.env` file.

## Step 2: Database Setup

### 2.1 Initialize Database

Push the Prisma schema to your database:

```bash
npm run db:push
```

Or create a migration:

```bash
npm run db:migrate
```

### 2.2 Verify Database

Open Prisma Studio to inspect your database:

```bash
npm run db:studio
```

## Step 3: Simplicate Configuration

### 3.1 Get API Credentials

1. Log in to Simplicate
2. Go to **Settings** → **API**
3. Click **Generate API Key**
4. Save your API Key and API Secret
5. Add them to your `.env` file

### 3.2 Test API Connection

Create a test script to verify your Simplicate connection:

```typescript
// test-simplicate.ts
import { getSimplicateClient } from './src/lib/simplicate'

async function testConnection() {
  const client = getSimplicateClient()

  try {
    const projects = await client.getProjects({ limit: 5 })
    console.log('✅ Connected to Simplicate!')
    console.log('Found projects:', projects.length)
  } catch (error) {
    console.error('❌ Connection failed:', error)
  }
}

testConnection()
```

Run it:

```bash
npx tsx test-simplicate.ts
```

### 3.3 Configure Webhooks

1. In Simplicate, go to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Set URL to: `https://your-domain.com/api/webhooks/simplicate`
4. Select events:
   - project.created
   - project.updated
   - hours.created
   - hours.updated
   - invoice.created
   - invoice.updated
5. Save and note the webhook secret (if provided)

> **Note**: For local development, use a tunnel service like [ngrok](https://ngrok.com) to expose your local server.

## Step 4: Email Configuration (Optional)

### 4.1 Set Up Resend

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use a test domain
3. Create an API key
4. Add to `.env`:

```env
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@yourdomain.com"
```

### 4.2 Test Email

```typescript
// test-email.ts
import { sendEmail } from './src/lib/notifications/email'

async function testEmail() {
  try {
    await sendEmail({
      to: 'your-email@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email from Simplicate Automations</p>',
    })
    console.log('✅ Email sent successfully!')
  } catch (error) {
    console.error('❌ Email failed:', error)
  }
}

testEmail()
```

## Step 5: Slack Integration (Optional)

### 5.1 Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name your app and select your workspace
4. Go to **OAuth & Permissions**
5. Add scopes:
   - `chat:write`
   - `users:read`
   - `conversations:write`
6. Install app to workspace
7. Copy **Bot User OAuth Token**
8. Add to `.env`:

```env
SLACK_BOT_TOKEN="xoxb-your-token"
```

### 5.2 Store Slack User IDs

Users need to configure their Slack User ID in their notification preferences:

1. In Slack, right-click a user → **View profile**
2. Click **More** → **Copy member ID**
3. Store in user's `NotificationPreference.slackUserId`

## Step 6: Run the Application

### 6.1 Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 6.2 Create First Admin User

The system uses NextAuth for authentication. You'll need to set this up based on your preferred auth method:

**Option A: Credentials Provider** (Simplest for testing)

- Add credentials provider to NextAuth config
- Create user directly in database

**Option B: OAuth Provider** (Recommended for production)

- Configure Google, GitHub, or other OAuth provider
- First user to sign in gets admin role

### 6.3 Seed Initial Data (Optional)

Create a seed script to populate test data:

```bash
npx tsx prisma/seed.ts
```

## Step 7: Test Workflows

### 7.1 Test Contract Distribution

```typescript
import { runContractDistribution } from './src/lib/workflows/contract-distribution'

// Create a test project first, then:
await runContractDistribution({
  projectId: 'your-project-id',
  templateName: 'Test Contract',
})
```

### 7.2 Test Hours Reminder

```typescript
import { runHoursReminder } from './src/lib/workflows/hours-reminder'

await runHoursReminder({
  period: 'current',
})
```

### 7.3 Test Invoice Generation

```typescript
import { runInvoiceGeneration } from './src/lib/workflows/invoice-generation'

await runInvoiceGeneration({
  projectId: 'your-project-id',
})
```

## Step 8: Deployment

### 8.1 Deploy to Vercel

1. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/simplicate-automations.git
git push -u origin main
```

2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables
4. Deploy!

### 8.2 Configure Production Database

Use a managed PostgreSQL service:

- [Supabase](https://supabase.com) (Recommended)
- [Neon](https://neon.tech)
- [Railway](https://railway.app)
- [Render](https://render.com)

### 8.3 Update Webhook URLs

After deployment, update your Simplicate webhook URL to:

```
https://your-app.vercel.app/api/webhooks/simplicate
```

### 8.4 Configure Cron Jobs

For scheduled workflows (hours reminders, invoice generation), set up cron jobs:

**Option A: Vercel Cron Jobs**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/hours-reminder",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/invoice-generation",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Option B: Upstash Redis with QStash**

Use Upstash QStash for more flexible scheduling.

## Troubleshooting

### Common Issues

**1. Database Connection Failed**

- Verify DATABASE_URL is correct
- Check database server is running
- Ensure database exists

**2. Simplicate API Errors**

- Verify API credentials
- Check API rate limits
- Ensure domain is correct (with or without https://)

**3. Webhooks Not Receiving**

- Verify webhook URL is publicly accessible
- Check webhook logs in Simplicate
- Test with ngrok for local development

**4. Emails Not Sending**

- Verify Resend API key
- Check domain is verified
- Review Resend logs

**5. Slack Messages Failing**

- Verify bot token
- Check bot has correct scopes
- Ensure bot is added to workspace

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
```

Check logs in:

- Browser console (client-side)
- Terminal (server-side)
- Vercel logs (production)

## Next Steps

1. **Customize Workflows**: Modify workflows in `src/lib/workflows/`
2. **Add Dashboard UI**: Build admin dashboard pages
3. **Create User Workspace**: Build team member workspace
4. **Add More Notifications**: Customize email/Slack templates
5. **Implement Auth**: Set up your preferred authentication method

## Support

For issues or questions:

- Check the main [README.md](./README.md)
- Review [API Documentation](./API_DOCUMENTATION.md)
- Open an issue on GitHub

---

**Setup complete!** Your Simplicate automation system is ready to use. 🎉
