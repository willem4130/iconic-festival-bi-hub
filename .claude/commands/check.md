# /check - Run all code quality checks

Run TypeScript type checking and ESLint in sequence. Fix all issues found.

## Commands

```bash
npm run typecheck && npm run lint
```

## On Failure

If typecheck fails:

1. Read the error messages carefully
2. Fix each TypeScript error
3. Re-run typecheck until clean

If lint fails:

1. Run `npm run lint -- --fix` to auto-fix what's possible
2. Manually fix remaining issues
3. Re-run lint until clean

## Optional: Format Check

```bash
npm run format:check
```

To auto-fix formatting:

```bash
npm run format
```

## After Database Changes

If you modified `prisma/schema.prisma`:

```bash
npm run db:push && npm run db:generate && npm run typecheck
```
