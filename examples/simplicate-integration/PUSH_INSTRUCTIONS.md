# Push to GitHub Instructions

## Step 1: Create GitHub Repository

Go to: https://github.com/new

Fill in:

- **Repository name**: `nextjs-fullstack-template`
- **Description**: `Production-ready Next.js 16 fullstack template with tRPC, Prisma, shadcn/ui, Vercel Analytics, Sentry, and rate-limited API routes`
- **Public** (recommended for templates)
- **DO NOT** initialize with README (we already have one)
- **DO NOT** add .gitignore (we have one)

Click "Create repository"

## Step 2: Update package.json

Replace `YOUR_USERNAME` in package.json with your actual GitHub username.

Or run this command (replace YOUR_USERNAME):

```bash
sed -i '' 's/YOUR_USERNAME/your-actual-username/g' package.json
sed -i '' 's/YOUR_USERNAME/your-actual-username/g' README.md
```

## Step 3: Push to GitHub

GitHub will show you commands. Run them:

```bash
git remote add origin https://github.com/YOUR_USERNAME/nextjs-fullstack-template.git
git branch -M main
git push -u origin main
```

## Step 4: Enable Template Repository

On GitHub:

1. Go to your repository
2. Click **Settings**
3. Check ✅ **Template repository** (under "General")
4. Save

Now anyone can click "Use this template" button!

## Step 5: Add Topics/Tags

On your repository page:

1. Click ⚙️ icon next to "About"
2. Add topics: `nextjs`, `typescript`, `trpc`, `prisma`, `shadcn-ui`, `template`, `fullstack`
3. Save

## Done! 🎉

Your template is now live and can be used with:

```bash
npx degit YOUR_USERNAME/nextjs-fullstack-template my-app
```

Or click "Use this template" on GitHub!
