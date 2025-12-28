# Simplicate Automations - Vercel Deployment Guide

## Overview

This guide will walk you through deploying your Simplicate Automations app to Vercel with a PostgreSQL database.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed globally: `npm install -g vercel`
- Git repository (recommended but not required)

## Step 1: Create Vercel Postgres Database

1. Go to https://vercel.com/dashboard
2. Click on the "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose a name (e.g., "simplicate-automations-db")
6. Select a region close to your users
7. Click "Create"

After creation, you'll see connection strings. We'll use these in the next step.

## Step 2: Deploy to Vercel via CLI

### First Time Deployment

1. Navigate to your project directory:

   ```bash
   cd /Users/willemvandenberg/simplicate-automations
   ```

2. Login to Vercel (if not already logged in):

   ```bash
   vercel login
   ```

3. Deploy the project:

   ```bash
   vercel
   ```

4. Answer the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? **simplicate-automations** (or your preferred name)
   - Directory? **./** (press Enter)
   - Override settings? **N**

5. Vercel will deploy your app and provide a preview URL

## Step 3: Configure Environment Variables

### Required Environment Variables

Go to your Vercel project dashboard > Settings > Environment Variables and add:

#### Database (Required)

```
DATABASE_URL=<your-postgres-connection-string-from-step-1>
DIRECT_URL=<your-postgres-direct-url-from-step-1>
```

#### Authentication (Required)

Generate a secret with: `openssl rand -base64 32`

```
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://your-app.vercel.app
```

#### Simplicate API (Required)

```
SIMPLICATE_API_KEY=<your-api-key>
SIMPLICATE_API_SECRET=<your-api-secret>
SIMPLICATE_DOMAIN=your-company.simplicate.nl
```

#### Email (Optional - for notifications)

```
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM=noreply@yourdomain.com
```

#### Other Optional Variables

```
UPSTASH_REDIS_REST_URL=<upstash-redis-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-redis-token>
SLACK_BOT_TOKEN=<slack-bot-token>
```

**Important:** Make sure to select "Production", "Preview", and "Development" for each environment variable.

## Step 4: Run Database Migrations

After setting environment variables, you need to push your Prisma schema to the database.

### Option A: Via Vercel CLI (Recommended)

1. Pull your environment variables locally:

   ```bash
   vercel env pull .env.production
   ```

2. Run Prisma migrations using the production database:
   ```bash
   DATABASE_URL="<your-postgres-url>" npx prisma db push
   ```

### Option B: Via Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click on "Deployments"
3. Click on the latest deployment
4. Click "Visit" to open your site
5. The first visit will trigger Prisma Client generation

## Step 5: Redeploy to Production

After configuring environment variables:

```bash
vercel --prod
```

This will deploy your app to production with the environment variables.

## Step 6: Verify Deployment

1. Visit your production URL
2. Navigate to Settings page
3. Check Database connection status (should show "Connected" with "PostgreSQL")
4. Click "Sync Now" to import projects from Simplicate
5. Navigate to Workflows page to configure automation

## Updating Your Deployment

For subsequent deployments:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Troubleshooting

### Database Connection Issues

If you see "Disconnected" in the Database settings:

1. Verify DATABASE_URL and DIRECT_URL are set correctly
2. Check that your Vercel Postgres database is active
3. Ensure you've run `prisma db push` to create tables

### Prisma Generation Errors

If you see Prisma client errors:

1. Check that `postinstall` script runs: `"postinstall": "prisma generate"`
2. Verify your prisma/schema.prisma file is correct
3. Clear build cache and redeploy:
   ```bash
   vercel --force
   ```

### Environment Variable Issues

If environment variables aren't working:

1. Verify they're set for all environments (Production, Preview, Development)
2. Check for typos in variable names
3. Redeploy after adding new variables

### Build Failures

If the build fails:

1. Check build logs in Vercel dashboard
2. Run `npm run build` locally to test
3. Ensure all dependencies are in package.json (not devDependencies)
4. Check that vercel.json is configured correctly

## Local Development with Production Database

If you want to use the production database locally:

1. Pull environment variables:

   ```bash
   vercel env pull .env.local
   ```

2. Run your dev server:
   ```bash
   npm run dev
   ```

**Warning:** Be careful when developing against production data!

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel project dashboard > Settings > Domains
2. Add your domain
3. Configure DNS records as instructed
4. Update NEXTAUTH_URL environment variable to use your custom domain

## Monitoring and Analytics

Your deployment includes:

- Vercel Analytics: Automatic performance monitoring
- Error tracking: Built-in error logs in Vercel dashboard
- Database metrics: Available in Vercel Storage dashboard

## Security Checklist

Before going live:

- [ ] All environment variables are set
- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] Database access is restricted
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] API credentials are not exposed in client code
- [ ] Rate limiting is configured (if using Upstash Redis)

## Support

- Vercel Documentation: https://vercel.com/docs
- Prisma Documentation: https://www.prisma.io/docs
- Next.js Documentation: https://nextjs.org/docs
- Project Issues: Create an issue in your GitHub repository

## Quick Reference Commands

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull

# View deployment logs
vercel logs

# Open project in browser
vercel open
```

---

**Congratulations!** Your Simplicate Automations app is now live on Vercel! 🎉
