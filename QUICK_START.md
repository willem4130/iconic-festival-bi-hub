# Quick Start Guide

Get your Simplicate Automation System up and running in 10 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database ready
- [ ] Simplicate account with API access
- [ ] (Optional) Resend account for emails
- [ ] (Optional) Slack workspace

## 5-Minute Setup

### 1. Install & Configure (2 minutes)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your favorite editor
```

**Required environment variables:**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/simplicate_automations"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
SIMPLICATE_API_KEY="your-api-key"
SIMPLICATE_API_SECRET="your-api-secret"
SIMPLICATE_DOMAIN="your-company.simplicate.com"
```

### 2. Database Setup (1 minute)

```bash
# Push schema to database
npm run db:push

# Open Prisma Studio to verify
npm run db:studio
```

### 3. Start Development Server (1 minute)

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

### 4. Test Simplicate Connection (1 minute)

Create `test.ts`:

```typescript
import { getSimplicateClient } from './src/lib/simplicate'

async function test() {
  const client = getSimplicateClient()
  const projects = await client.getProjects({ limit: 5 })
  console.log('✅ Connected! Found projects:', projects.length)
}

test()
```

Run:

```bash
npx tsx test.ts
```

## Testing Workflows

### Test Contract Distribution

```bash
npx tsx scripts/test-workflows.ts contracts
```

### Test Hours Reminder

```bash
npx tsx scripts/test-workflows.ts hours
```

### Test Invoice Generation

```bash
npx tsx scripts/test-workflows.ts invoices
```

### Check System Status

```bash
npx tsx scripts/test-workflows.ts status
```

## Common First-Time Tasks

### Create Test Project

```typescript
// create-test-project.ts
import { prisma } from './src/lib/db'

async function createTestProject() {
  const project = await prisma.project.create({
    data: {
      simplicateId: 'test-001',
      name: 'Test Project',
      description: 'A test project for development',
      status: 'ACTIVE',
    },
  })

  console.log('✅ Created project:', project.id)
}

createTestProject()
```

### Create Test User

```typescript
// create-test-user.ts
import { prisma } from './src/lib/db'

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'TEAM_MEMBER',
    },
  })

  console.log('✅ Created user:', user.id)
}

createTestUser()
```

### Create Admin User

```typescript
// create-admin.ts
import { prisma } from './src/lib/db'

async function createAdmin() {
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  console.log('✅ Created admin:', admin.id)
}

createAdmin()
```

## Enable Features

### Enable Email Notifications

1. Sign up at [resend.com](https://resend.com)
2. Add to `.env`:
   ```env
   RESEND_API_KEY="re_your_key"
   EMAIL_FROM="noreply@yourdomain.com"
   ```
3. Restart server

### Enable Slack Notifications

1. Create Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add bot token to `.env`:
   ```env
   SLACK_BOT_TOKEN="xoxb-your-token"
   ```
3. Restart server

### Set Up Webhooks

1. Deploy to Vercel or use ngrok for local testing:

   ```bash
   ngrok http 3000
   ```

2. In Simplicate, add webhook:
   - URL: `https://your-domain.com/api/webhooks/simplicate`
   - Events: `project.created`, `project.updated`, `hours.*`, `invoice.*`

## Project Structure Overview

```
simplicate-automations/
├── src/
│   ├── app/api/              # API routes & webhooks
│   ├── lib/
│   │   ├── simplicate/       # API client
│   │   ├── notifications/    # Email/Slack
│   │   └── workflows/        # Automation logic
│   └── env.js               # Config validation
├── prisma/
│   └── schema.prisma        # Database schema
├── scripts/
│   └── test-workflows.ts    # Testing script
└── .env                     # Your config
```

## Next Steps

1. **Read the full setup guide**: [SIMPLICATE_SETUP.md](./SIMPLICATE_SETUP.md)
2. **Review the project summary**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
3. **Build the UI**: Start with admin dashboard or user workspace
4. **Deploy**: Push to Vercel when ready

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:push          # Push schema changes
npm run db:studio        # Open database GUI
npm run db:migrate       # Create migration

# Testing
npm test                 # Run tests
npm run lint             # Check code quality
npm run typecheck        # Check types

# Workflows (custom)
npx tsx scripts/test-workflows.ts status
npx tsx scripts/test-workflows.ts contracts
npx tsx scripts/test-workflows.ts hours
npx tsx scripts/test-workflows.ts invoices
```

## Troubleshooting

**"Database connection failed"**

- Check DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify database exists

**"Simplicate API error"**

- Check API credentials in `.env`
- Verify domain is correct
- Test with: `npx tsx test.ts`

**"Module not found"**

- Run: `npm install`
- Delete `node_modules` and reinstall

**"Prisma Client not generated"**

- Run: `npm run db:generate`

## Getting Help

- 📚 [Full Documentation](./README.md)
- ⚙️ [Setup Guide](./SIMPLICATE_SETUP.md)
- 📊 [Project Summary](./PROJECT_SUMMARY.md)
- 🐛 [Open an Issue](https://github.com/your-repo/issues)

---

**Ready to automate!** 🚀

Start with `npm run dev` and visit [http://localhost:3000](http://localhost:3000)
