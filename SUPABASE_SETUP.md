# Quick Supabase Setup (2 minutes)

## Why Supabase?

- ✅ **Free tier**: Perfect for testing (500MB database, 2GB bandwidth)
- ✅ **Production ready**: Easy to upgrade when needed
- ✅ **Zero migration**: Same PostgreSQL, just change connection string
- ✅ **Instant setup**: No local installation needed
- ✅ **Great UI**: Built-in table editor and SQL runner

## Setup Steps

### 1. Create Supabase Account (30 seconds)

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub

### 2. Create New Project (1 minute)

1. Click "New Project"
2. Fill in:
   - **Name**: `simplicate-automations-test`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
3. Click "Create new project"
4. Wait ~2 minutes for setup

### 3. Get Connection String (30 seconds)

1. Go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual password

### 4. Update .env (10 seconds)

Replace in your `.env` file:

```env
DATABASE_URL="your-copied-connection-string"
DIRECT_URL="your-copied-connection-string"
```

### 5. Run Database Setup

```bash
cd simplicate-automations
npm run db:push
```

Done! Your database is ready. 🎉

## What You Get (Free Tier)

- 500 MB database space
- Unlimited API requests
- 50,000 monthly active users
- Community support
- Automatic backups (7 days)

## When to Upgrade

The free tier is perfect for testing and small production apps. Upgrade to Pro ($25/month) when you need:

- 8 GB database
- 250 GB bandwidth
- Email support
- Daily backups (30 days)

## Troubleshooting

**Can't connect?**

- Check password is correct (no special characters that need escaping)
- Ensure connection string format is exact
- Try the "Session" mode connection string instead

**Database creation failed?**

- Wait a few more minutes (first-time setup can take 3-5 minutes)
- Refresh the Supabase dashboard

## Alternative: Neon (Also Free & Great)

If Supabase doesn't work, try [Neon](https://neon.tech):

1. Sign up at neon.tech
2. Create project
3. Copy connection string
4. Same process!

---

**Ready?** Let me know when you have your connection string and I'll test the system!
