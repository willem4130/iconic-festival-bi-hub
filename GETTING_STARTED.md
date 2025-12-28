# Getting Started with Simplicate Integration

This guide will walk you through connecting your actual Simplicate account to the automation system and testing the workflows.

## 🎯 What You'll Accomplish

By the end of this guide, you will have:

1. ✅ Connected to your Simplicate account
2. ✅ Verified API access to your projects, employees, and hours
3. ✅ Set up webhooks for real-time automation
4. ✅ Tested the contract distribution workflow
5. ✅ Tested the hours reminder workflow

---

## 📋 Prerequisites

Before starting, make sure you have:

- [x] Access to your Simplicate account with admin privileges
- [x] The automation project installed (`npm install` already run)
- [x] A code editor open (VS Code, etc.)

---

## Step 1: Get Your Simplicate API Credentials

### 1.1 Log into Simplicate

1. Go to your Simplicate domain (e.g., `https://yourcompany.simplicate.com`)
2. Log in with your admin account

### 1.2 Navigate to API Settings

1. Click on your profile/avatar in the top right
2. Go to **Settings** or **Configuration**
3. Look for **API** or **Integrations** section
   - Sometimes it's under: Settings → System → API
   - Or: Configuration → API Keys

### 1.3 Generate API Credentials

1. Click **Create API Key** or **Generate API Key**
2. Give it a name: `Automation System` or similar
3. You'll receive two values:
   - **API Key** (looks like: `abc123...`)
   - **API Secret** (looks like: `xyz789...`)
4. **IMPORTANT**: Copy both immediately - you won't be able to see the secret again!

### 1.4 Save Your Credentials

Keep these values safe - you'll need them in the next step.

---

## Step 2: Configure Your Environment

### 2.1 Open the `.env` File

In your project root (`simplicate-automations`), open the `.env` file.

### 2.2 Add Your Simplicate Credentials

Replace the placeholder values with your actual credentials:

```env
# Simplicate API (Required for real integration)
SIMPLICATE_API_KEY="your-api-key-here"
SIMPLICATE_API_SECRET="your-api-secret-here"
SIMPLICATE_DOMAIN="yourcompany.simplicate.com"
```

**Example:**

```env
SIMPLICATE_API_KEY="abc123def456ghi789"
SIMPLICATE_API_SECRET="xyz987uvw654rst321"
SIMPLICATE_DOMAIN="scex.simplicate.com"
```

**Important Notes:**

- Do NOT include `https://` in the domain
- Just use: `yourcompany.simplicate.com`
- Keep the quotes around the values

### 2.3 Remove Skip Validation (Optional)

If you want strict environment validation, comment out or remove this line:

```env
# SKIP_ENV_VALIDATION=true  ← Comment this out
```

---

## Step 3: Test Your Connection

### 3.1 Run the Connection Test

Open your terminal in the project directory and run:

```bash
npm run test:simplicate
```

### 3.2 What to Expect

You should see output like this:

```
╔═══════════════════════════════════════════════════╗
║     Simplicate API Connection Test               ║
╚═══════════════════════════════════════════════════╝

1. Environment Configuration
─────────────────────────────────────────────────────
✓ API Key: abc12345...
✓ API Secret: ********
✓ Domain: yourcompany.simplicate.com

2. API Client Initialization
─────────────────────────────────────────────────────
✓ Client initialized

3. Testing API Connection
─────────────────────────────────────────────────────
ℹ Fetching projects...
✓ Connected to Simplicate API successfully!
✓ Found 5 projects

Recent projects:
   1. Website Redesign (PRJ-001)
      Organization: Acme Corp
      Manager: John Doe
   2. Mobile App Development (PRJ-002)
      Organization: TechStart Inc
      Manager: Jane Smith
   ...
```

### 3.3 Troubleshooting Connection Issues

If you see errors, check:

**❌ "API credentials not configured"**

- Make sure you've added your API key and secret to `.env`
- Restart your terminal/IDE after editing `.env`

**❌ "401 Unauthorized"**

- Your API key or secret is incorrect
- Verify you copied them correctly from Simplicate
- Make sure there are no extra spaces

**❌ "404 Not Found" or "Failed to fetch"**

- Your domain is incorrect
- Check the domain format: `yourcompany.simplicate.com` (no https://)
- Verify your Simplicate instance is accessible

**❌ "403 Forbidden"**

- Your API key doesn't have the required permissions
- Contact your Simplicate admin to grant access

---

## Step 4: Explore Your Data

### 4.1 Check What You Have Access To

The test script will check these endpoints:

1. **Projects** ✓
   - Your projects and their details
   - Project managers and organizations

2. **Employees** ✓
   - Team members in Simplicate
   - Names and emails

3. **Hours** ✓
   - Time entries
   - Hours per project

4. **Documents** ✓
   - Uploaded contracts and files

5. **Webhooks** ℹ
   - Currently configured webhooks (if any)

### 4.2 Review the Output

Take note of:

- How many projects you have
- Which employees are in the system
- Whether you have existing hours logged

This helps you understand what data is available for automation.

---

## Step 5: Set Up Webhooks for Automation

Webhooks allow Simplicate to notify your system when things happen (like a new project being created).

### 5.1 For Local Development (Using ngrok)

Since Simplicate needs a public URL to send webhooks, and you're running locally, you need a tunnel:

#### Install ngrok

```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com
```

#### Start Your Dev Server

```bash
npm run dev
```

#### Create Tunnel in Another Terminal

```bash
ngrok http 3000
```

You'll see output like:

```
Forwarding https://abc123.ngrok.io -> http://localhost:3000
```

**Copy that `https://abc123.ngrok.io` URL - you'll need it!**

### 5.2 Configure Webhook in Simplicate

1. In Simplicate, go to **Settings → Webhooks**
2. Click **Add Webhook** or **Create New Webhook**
3. Fill in:
   - **URL**: `https://abc123.ngrok.io/api/webhooks/simplicate`
   - **Events** (select these):
     - `project.created`
     - `project.updated`
     - `project.employee.added`
     - `hours.created`
     - `hours.updated`
   - **Active**: ✓ Enabled
4. Save the webhook

### 5.3 Test Webhook Reception

1. Keep `ngrok` running
2. In Simplicate, create a test project or update an existing one
3. Watch your terminal - you should see a webhook request!

Look for log output like:

```
POST /api/webhooks/simplicate
Received webhook: project.created
```

---

## Step 6: Test the Workflows

Now that everything is connected, let's test the actual automation workflows.

### 6.1 Test Contract Distribution

This workflow sends contracts to team members when they join a project.

#### Open Prisma Studio (to see database changes)

```bash
npm run db:studio
```

#### Create a Test in Simplicate

1. Create or open a project in Simplicate
2. Add a team member to the project
3. Check Prisma Studio → `Contract` table
4. You should see a new contract record created!

**What happened behind the scenes:**

1. Simplicate sent a webhook: `project.employee.added`
2. The system received it at `/api/webhooks/simplicate`
3. The `contract-distribution` workflow ran
4. A contract record was created in your database
5. (If email is configured) An email was sent to the team member

### 6.2 Test Hours Reminder

This workflow reminds team members to submit their hours.

You can manually trigger it using the API:

```bash
curl -X POST http://localhost:3000/api/cron/hours-reminder
```

Or call it from the browser console while on the admin dashboard:

```javascript
fetch('/api/cron/hours-reminder', { method: 'POST' })
  .then((r) => r.json())
  .then(console.log)
```

**What should happen:**

1. System checks for team members with missing hours
2. Notifications are sent (email/Slack if configured)
3. Check the `HoursReminder` table in Prisma Studio

### 6.3 View Automation Logs in Dashboard

1. Go to http://localhost:3000/admin/dashboard
2. Scroll to **Recent Activity**
3. You'll see logs of:
   - Contracts distributed
   - Hours reminders sent
   - Any errors that occurred

---

## Step 7: Monitor and Debug

### 7.1 Check the Logs

Watch your terminal while the system is running:

```bash
npm run dev
```

Look for:

- `✓` Success messages (green)
- `⚠` Warning messages (yellow)
- `✗` Error messages (red)

### 7.2 Use Prisma Studio

Keep Prisma Studio open in another tab:

```bash
npm run db:studio
```

**Tables to watch:**

- `Project` - Projects synced from Simplicate
- `Employee` - Team members
- `Contract` - Distributed contracts
- `HoursReminder` - Hours reminder logs
- `AutomationLog` - All automation activity

### 7.3 Check Webhook Logs in Simplicate

In Simplicate → Settings → Webhooks:

- View webhook delivery logs
- See which webhooks succeeded/failed
- Retry failed webhooks

---

## 🎉 You're All Set!

Your Simplicate integration is now live and working!

### What Works Now:

✅ **Automatic Contract Distribution**

- When team members join projects
- Contracts are created and sent automatically

✅ **Hours Reminders**

- Triggered manually or via cron job
- Reminds team members to log hours

✅ **Real-time Sync**

- Webhooks keep your database in sync with Simplicate
- Changes in Simplicate reflect immediately

✅ **Admin Dashboard**

- View all projects, contracts, and activity
- Monitor automation status

---

## 🔄 Next Steps

Now that the integration is working, you can:

### 1. Configure Email Notifications

Set up Resend for email sending:

```env
# In .env
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="automations@yourdomain.com"
```

Sign up at [resend.com](https://resend.com)

### 2. Add Slack Notifications

Set up a Slack bot for notifications:

```env
# In .env
SLACK_BOT_TOKEN="xoxb-your-token"
```

See `SIMPLICATE_SETUP.md` for full Slack setup.

### 3. Schedule Automated Hours Reminders

Set up a cron job to run hours reminders weekly:

**Option A: Vercel Cron (after deployment)**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/hours-reminder",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

**Option B: Manual Trigger**

Run it yourself when needed:

```bash
curl -X POST http://localhost:3000/api/cron/hours-reminder
```

### 4. Deploy to Production

Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Update webhook URL in Simplicate to production URL
```

### 5. Build More Features

Check out the [main README](./README.md) for ideas:

- Project detail pages
- Contract management interface
- Invoice generation automation
- Analytics dashboard

---

## 🆘 Need Help?

### Common Issues

**Webhooks not arriving**

- Check ngrok is running
- Verify webhook URL in Simplicate
- Check Simplicate webhook logs

**Data not syncing**

- Verify API credentials
- Check database connection
- Look at automation logs in dashboard

**Emails not sending**

- Check Resend API key
- Verify domain is configured
- Check Resend dashboard logs

### Documentation

- [SIMPLICATE_SETUP.md](./SIMPLICATE_SETUP.md) - Full setup guide
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [README.md](./README.md) - Project overview

### Support

- Open an issue on GitHub
- Check the logs in your terminal
- Review Prisma Studio for data issues

---

**Happy automating! 🚀**
