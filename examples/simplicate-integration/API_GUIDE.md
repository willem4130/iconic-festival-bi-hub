# Simplicate API Credentials - Quick Reference

This is a quick visual guide for getting your Simplicate API credentials.

## 🔑 Finding Your API Credentials

### Method 1: Via Simplicate Dashboard

1. **Log into Simplicate**

   ```
   https://yourcompany.simplicate.com
   ```

2. **Navigate to API Settings**

   The location varies by Simplicate version:

   **Option A:**

   ```
   Profile (top right) → Settings → API
   ```

   **Option B:**

   ```
   Settings → System → API Keys
   ```

   **Option C:**

   ```
   Configuration → Integrations → API
   ```

3. **Create/View API Key**
   - Click "Generate API Key" or "Create New Key"
   - Name it: "Automation System"
   - Copy both values:
     - ✅ **API Key**: Long alphanumeric string
     - ✅ **API Secret**: Another long alphanumeric string

⚠️ **IMPORTANT**: The secret is only shown once! Save it immediately.

---

## 📋 What You Need

You need three pieces of information:

### 1. API Key

```
Example: abc123def456ghi789jkl012
```

- This is like your username
- Safe to share with your team
- Visible in the Simplicate dashboard

### 2. API Secret

```
Example: xyz987uvw654rst321opq098
```

- This is like your password
- **NEVER** share publicly
- Only shown once when generated
- Store in `.env` file (which is in `.gitignore`)

### 3. Domain

```
Example: yourcompany.simplicate.com
```

- Your Simplicate URL
- Do NOT include `https://`
- Just the domain part

---

## ✏️ Adding to Your Project

### Edit `.env` File

Open `simplicate-automations/.env` and add:

```env
# Simplicate API Credentials
SIMPLICATE_API_KEY="abc123def456ghi789jkl012"
SIMPLICATE_API_SECRET="xyz987uvw654rst321opq098"
SIMPLICATE_DOMAIN="yourcompany.simplicate.com"
```

### Example (Real Values)

```env
# Simplicate API Credentials
SIMPLICATE_API_KEY="k8h3j2g1f9d7c5b4a0"
SIMPLICATE_API_SECRET="z9y8x7w6v5u4t3s2r1q0"
SIMPLICATE_DOMAIN="scex.simplicate.com"
```

---

## ✅ Testing Your Credentials

After adding your credentials, test the connection:

```bash
cd simplicate-automations
npm run test:simplicate
```

**Expected Output:**

```
✓ API Key: abc12345...
✓ API Secret: ********
✓ Domain: yourcompany.simplicate.com
✓ Connected to Simplicate API successfully!
✓ Found 12 projects
```

---

## 🚨 Troubleshooting

### Problem: "API credentials not configured"

**Solution:**

- Check that you saved the `.env` file
- Restart your terminal/IDE
- Verify no typos in variable names

### Problem: "401 Unauthorized"

**Causes:**

- Wrong API key or secret
- Extra spaces in the values
- Quotes not used correctly

**Solution:**

```env
# ❌ Wrong (no quotes)
SIMPLICATE_API_KEY=abc123

# ❌ Wrong (spaces)
SIMPLICATE_API_KEY = "abc123"

# ✅ Correct
SIMPLICATE_API_KEY="abc123"
```

### Problem: "404 Not Found"

**Cause:** Domain is incorrect

**Solution:**

```env
# ❌ Wrong
SIMPLICATE_DOMAIN="https://scex.simplicate.com"
SIMPLICATE_DOMAIN="scex.simplicate.com/"

# ✅ Correct
SIMPLICATE_DOMAIN="scex.simplicate.com"
```

### Problem: "403 Forbidden"

**Cause:** Your API key doesn't have permissions

**Solution:**

- Contact your Simplicate admin
- Ask them to grant "API Access" permissions
- Or generate a new key with proper permissions

---

## 🔒 Security Best Practices

### ✅ DO:

- Store credentials in `.env` file
- Keep `.env` in `.gitignore`
- Use environment variables in production (Vercel, Railway, etc.)
- Regenerate keys if exposed

### ❌ DON'T:

- Commit `.env` to git
- Share credentials in Slack/email
- Hard-code credentials in source files
- Use production credentials in development

---

## 📞 Need Help from Simplicate?

If you can't find the API settings:

1. **Contact Simplicate Support**
   - Email: support@simplicate.com
   - Or use in-app chat

2. **Ask For:**
   - "Where can I find API credentials?"
   - "How do I generate an API key for integrations?"
   - "I need API access to the REST API"

3. **Provide:**
   - Your company name
   - Your Simplicate domain
   - What you're building (automation system)

---

## 🔗 Useful Links

- [Simplicate API Documentation](https://developer.simplicate.com)
- [Getting Started Guide](./GETTING_STARTED.md)
- [Full Setup Guide](./SIMPLICATE_SETUP.md)
- [Project README](./README.md)

---

## Quick Start Commands

```bash
# 1. Add credentials to .env
vim .env  # or use your editor

# 2. Test connection
npm run test:simplicate

# 3. Start dev server
npm run dev

# 4. Open Prisma Studio (optional)
npm run db:studio
```

That's it! Once you see the ✓ success messages, you're ready to go! 🚀
