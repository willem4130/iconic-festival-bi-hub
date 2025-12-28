---
name: update-app
description: Update dependencies, fix deprecations and warnings
---

# Dependency Update & Deprecation Fix

## Step 1: Check for Updates

```bash
npm outdated
```

Review outdated packages. Pay attention to:

- Major version changes (breaking changes likely)
- Security vulnerabilities
- Deprecated packages

## Step 2: Update Dependencies

```bash
# Update dependencies
npm update

# Fix security vulnerabilities
npm audit fix

# If audit fix doesn't work, try:
# npm audit fix --force (use with caution)
```

## Step 3: Check for Deprecations & Warnings

Run clean installation and check output:

```bash
rm -rf node_modules package-lock.json
npm install
```

Read ALL output carefully. Look for:

- ⚠️ Deprecation warnings
- 🔒 Security vulnerabilities
- ⚙️ Peer dependency warnings
- 💥 Breaking changes
- 🚨 Missing dependencies

## Step 4: Fix Issues

For each warning/deprecation:

1. **Research** the recommended replacement or fix
2. **Update** code/dependencies accordingly
3. **Re-run** installation: `npm install`
4. **Verify** no warnings remain

Common fixes:

- Replace deprecated packages with alternatives
- Update import statements
- Adjust configuration files
- Fix peer dependency mismatches

## Step 5: Run Quality Checks

```bash
# Type check (CRITICAL)
npm run typecheck

# Lint
npm run lint

# Format check
npm run format:check

# Database (if schema changed)
npm run db:generate
npm run db:push
```

Fix ALL errors before completing. Zero tolerance.

## Step 6: Verify Clean Install

Ensure a fresh install works:

```bash
# Delete everything
rm -rf node_modules package-lock.json .next

# Clean install
npm install

# Generate Prisma client
npm run db:generate

# Build to verify everything works
npm run build
```

Verify:

- ✅ ZERO warnings/errors
- ✅ All dependencies resolve correctly
- ✅ Build succeeds
- ✅ Types are valid

## Step 7: Test the Application

```bash
# Start dev server
npm run dev

# Open http://localhost:3000
# Verify core functionality works
```

## Common Issues & Solutions

**"Module not found" errors:**

- Check imports match new package exports
- Update TypeScript paths if needed

**Type errors after update:**

- Run `npm run db:generate` (regenerates Prisma types)
- Check for breaking changes in updated packages

**Peer dependency warnings:**

- Install missing peer dependencies
- Or update parent package to compatible version

**Build failures:**

- Clear `.next` folder
- Regenerate types
- Check Next.js breaking changes

## Final Checklist

- [ ] All dependencies updated
- [ ] Zero deprecation warnings
- [ ] Zero security vulnerabilities
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Dev server starts without errors
- [ ] Application functions correctly
