# 🚀 Start Here - Simplicate Integration

Welcome! This guide will get your Simplicate automation system connected to your real Simplicate account in under 10 minutes.

---

## 📖 Overview

This system automates three main workflows:

1. **Contract Distribution** 📄
   - Automatically create and send contracts when team members join projects

2. **Hours Reminders** ⏰
   - Remind team members to submit their hours on schedule

3. **Invoice Generation** 💰
   - Generate invoices based on approved hours (coming soon)

---

## ⚡ Quick Start (3 Steps)

### Step 1: Get Your API Credentials (2 minutes)

1. Log into your Simplicate account
2. Go to Settings → API
3. Generate a new API key
4. Copy the **API Key** and **API Secret**

**Need help?** See [SIMPLICATE_API_GUIDE.md](./SIMPLICATE_API_GUIDE.md) for screenshots and detailed instructions.

### Step 2: Add Credentials to .env (1 minute)

Open the `.env` file in your project root and add:

```env
# Simplicate API
SIMPLICATE_API_KEY="your-api-key-here"
SIMPLICATE_API_SECRET="your-api-secret-here"
SIMPLICATE_DOMAIN="yourcompany.simplicate.com"
```

Replace with your actual values from Step 1.

### Step 3: Test the Connection (1 minute)

Run this command:

```bash
npm run test:simplicate
```

You should see:

```
✓ Connected to Simplicate API successfully!
✓ Found 12 projects
```

**That's it!** You're connected. 🎉

---

## 📚 What to Read Next

Depending on what you want to do:

### Just Getting Started?

👉 **[GETTING_STARTED.md](./GETTING_STARTED.md)**

- Complete walkthrough of the entire setup
- Set up webhooks for automation
- Test all workflows
- Deploy to production

### Need Help with API Credentials?

👉 **[SIMPLICATE_API_GUIDE.md](./SIMPLICATE_API_GUIDE.md)**

- Visual guide for getting credentials
- Troubleshooting common issues
- Security best practices

### Want Technical Details?

👉 **[SIMPLICATE_SETUP.md](./SIMPLICATE_SETUP.md)**

- Full technical setup guide
- Advanced configuration
- Database setup
- Email and Slack integration

### Need API Reference?

👉 **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

- Complete API documentation
- Available endpoints
- Request/response examples

---

## 🎯 What Works Right Now

After connecting your Simplicate account, you can:

✅ **View Projects**

- See all your Simplicate projects in the admin dashboard
- View project details, team members, and status

✅ **Test Connection**

- Run `npm run test:simplicate` anytime
- Verify API access to projects, employees, hours

✅ **Monitor Activity**

- View automation logs in the dashboard
- Track contract distribution events
- See hours reminder history

---

## 🔜 What You Need to Set Up Next

To enable full automation:

### 1. Webhooks (Required for Automation)

Without webhooks, automation won't trigger automatically.

**What you need:**

- A public URL (use ngrok for local testing)
- Configure webhook in Simplicate dashboard

**How long:** 5 minutes

**Guide:** See [GETTING_STARTED.md - Step 5](./GETTING_STARTED.md#step-5-set-up-webhooks-for-automation)

### 2. Email Notifications (Optional)

Send contract emails and hours reminders via email.

**What you need:**

- Resend account (free tier available)
- Verified domain (or use test mode)

**How long:** 10 minutes

**Setup:**

```env
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@yourdomain.com"
```

### 3. Slack Notifications (Optional)

Send notifications to Slack channels.

**What you need:**

- Slack workspace admin access
- Create a Slack app

**How long:** 15 minutes

**Guide:** See [SIMPLICATE_SETUP.md - Step 5](./SIMPLICATE_SETUP.md#step-5-slack-integration-optional)

---

## 🛠️ Useful Commands

### Development

```bash
# Start development server
npm run dev

# Test Simplicate connection
npm run test:simplicate

# Open database viewer
npm run db:studio
```

### Database

```bash
# Push schema to database
npm run db:push

# Create migration
npm run db:migrate

# View/edit data
npm run db:studio
```

### Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e
```

---

## 🔍 Project Structure

```
simplicate-automations/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── admin/              # Admin dashboard pages
│   │   └── api/                # API routes
│   │       └── webhooks/       # Webhook endpoints
│   ├── lib/
│   │   ├── simplicate/         # Simplicate API client
│   │   ├── workflows/          # Automation workflows
│   │   └── notifications/      # Email/Slack
│   └── server/
│       └── api/                # tRPC API
├── prisma/
│   └── schema.prisma           # Database schema
├── scripts/
│   └── test-simplicate.ts      # Connection test script
└── .env                        # Your credentials (keep secret!)
```

---

## 📊 Dashboard Overview

After starting the dev server (`npm run dev`), visit:

**http://localhost:3000/admin/dashboard**

You'll see:

1. **Stats Overview**
   - Total projects
   - Active contracts
   - Recent hours

2. **Recent Projects**
   - Synced from Simplicate
   - Click to view details

3. **Automation Logs**
   - Contract distribution events
   - Hours reminders sent
   - Any errors

---

## ❓ Common Questions

### "Do I need a production database?"

**For testing:** No, SQLite (already set up) works fine.

**For production:** Yes, switch to PostgreSQL (Supabase, Neon, etc.)

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### "Can I use this without webhooks?"

Technically yes, but you'll lose automation benefits. Without webhooks, you need to manually trigger workflows.

### "Is my data safe?"

Yes:

- Credentials stored in `.env` (not committed to git)
- All API calls use HTTPS
- Database is local (or your own hosted instance)
- No third-party data storage

### "What if I don't have Simplicate access?"

You can still develop using mock data. The system will warn but won't crash. Just skip the real API tests.

---

## 🆘 Getting Help

### Something not working?

1. **Check the logs**

   ```bash
   npm run dev
   # Watch the terminal for errors
   ```

2. **Test your connection**

   ```bash
   npm run test:simplicate
   ```

3. **Check environment variables**
   ```bash
   cat .env | grep SIMPLICATE
   ```

### Common Issues

| Issue                   | Solution                                |
| ----------------------- | --------------------------------------- |
| "Cannot connect to API" | Check credentials in `.env`             |
| "Webhooks not working"  | Verify webhook URL in Simplicate        |
| "Database locked"       | Close Prisma Studio, restart dev server |
| "Email not sending"     | Check Resend API key                    |

### Documentation

- 📖 [GETTING_STARTED.md](./GETTING_STARTED.md) - Complete setup guide
- 🔑 [SIMPLICATE_API_GUIDE.md](./SIMPLICATE_API_GUIDE.md) - Get API credentials
- ⚙️ [SIMPLICATE_SETUP.md](./SIMPLICATE_SETUP.md) - Technical setup
- 📡 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference

---

## ✅ Checklist

Use this checklist to track your progress:

- [ ] Installed dependencies (`npm install`)
- [ ] Got Simplicate API credentials
- [ ] Added credentials to `.env`
- [ ] Tested connection (`npm run test:simplicate`)
- [ ] Started dev server (`npm run dev`)
- [ ] Viewed admin dashboard (http://localhost:3000/admin/dashboard)
- [ ] Set up webhooks (optional for now)
- [ ] Configured email (optional for now)
- [ ] Configured Slack (optional for now)
- [ ] Tested contract distribution workflow
- [ ] Tested hours reminder workflow

---

## 🎉 You're Ready!

Once you've completed the 3-step Quick Start above, you're all set to explore the system.

**Recommended next steps:**

1. ✅ Complete this: [GETTING_STARTED.md](./GETTING_STARTED.md)
2. 🔗 Set up webhooks for real-time automation
3. 🎨 Explore the admin dashboard
4. 🚀 Deploy to production (Vercel)

---

**Happy automating! 🚀**

Questions? Open an issue or check the docs folder.
