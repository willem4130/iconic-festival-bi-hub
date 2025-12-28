---
name: fix
description: Run typechecking and linting, then spawn parallel agents to fix all issues
---

# Project Code Quality Check & Auto-Fix

This command runs all linting and typechecking tools, collects errors, groups them by domain, and spawns parallel agents to fix them.

## Step 1: Run Linting and Typechecking

Run the code quality checks for this Next.js TypeScript project:

```bash
# Type check (MOST IMPORTANT)
npm run typecheck

# Lint
npm run lint

# Format check
npm run format:check
```

## Step 2: Collect and Parse Errors

Parse the output from the commands above. Group errors by domain:

**Type errors** (from `npm run typecheck`):

- TSC type mismatches
- Missing types
- Invalid type assignments
- Type inference issues

**Lint errors** (from `npm run lint`):

- Code quality issues
- Unused variables
- Missing imports
- Incorrect patterns
- React hooks violations

**Format errors** (from `npm run format:check`):

- Indentation issues
- Spacing issues
- Quote style issues

Create a comprehensive list of:

1. All files with issues
2. Specific error messages for each file
3. Line numbers where errors occur

## Step 3: Spawn Parallel Agents to Fix Issues

**CRITICAL**: Use a SINGLE response with MULTIPLE Task tool calls to run agents in parallel.

For each domain that has issues, spawn an agent. Here's the strategy:

### If Type Errors Exist:

Spawn a Task agent with:

- subagent_type: "general-purpose"
- description: "Fix TypeScript type errors"
- prompt: "Fix all TypeScript type errors in the following files: [LIST]. For each error: 1) Read the file, 2) Fix by adding proper types, 3) Verify with npm run typecheck. Do NOT change business logic."

### If Lint Errors Exist:

Spawn a Task agent with:

- subagent_type: "general-purpose"
- description: "Fix ESLint errors"
- prompt: "Fix all ESLint errors in the following files: [LIST]. For each error: 1) Read the file, 2) Fix the lint issue, 3) Verify with npm run lint."

### If Format Errors Exist:

Spawn a Task agent with:

- subagent_type: "general-purpose"
- description: "Fix formatting errors"
- prompt: "Run npm run format to auto-format all files. Then verify with npm run format:check."

**Important**: All agents MUST be spawned in a single message with multiple Task tool calls.

## Step 4: Wait for Agents to Complete

After spawning all agents, wait for them to finish. Each agent will:

1. Receive their assigned errors
2. Fix all issues in their domain
3. Run verification commands
4. Report completion

## Step 5: Verify All Fixes

After all agents complete, run the full check again:

```bash
npm run typecheck && npm run lint && npm run format:check
```

If any errors remain:

- Identify which domain still has issues
- Spawn a new agent to fix remaining errors
- Repeat until all checks pass

## Step 6: Success Criteria

Project is clean when:

- ✅ `npm run typecheck` returns 0 errors
- ✅ `npm run lint` returns 0 errors
- ✅ `npm run format:check` returns 0 errors
- ✅ All files properly formatted
- ✅ No warnings in output

## Common Issues & Fixes

**Type errors persist:**

- Check if Prisma client needs regeneration: `npm run db:generate`
- Check for circular dependencies
- Verify all imports are correct

**Lint errors persist:**

- Check ESLint config for conflicting rules
- Verify all dependencies are installed
- Check for syntax errors

**Format errors persist:**

- Run `npm run format` to auto-fix
- Check .prettierignore for excluded files
- Verify Prettier config is valid

## Emergency Manual Fix

If auto-fix fails, manually fix:

```bash
# Fix formatting manually
npm run format

# Fix auto-fixable lint issues
npm run lint -- --fix

# Check what's left
npm run typecheck
npm run lint
npm run format:check
```

Then address remaining issues manually.
