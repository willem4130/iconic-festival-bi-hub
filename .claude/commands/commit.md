# /commit - Safe commit and push

## CRITICAL: Repository Safety Check

Before ANY git operation, verify the remote:

```bash
git remote -v
```

**ALLOWED remote**: `iconic-festival-bi-hub`
**FORBIDDEN remote**: `nextjs-fullstack-template`

If remote contains `nextjs-fullstack-template`, STOP IMMEDIATELY and alert the user.

## Workflow

1. **Verify remote is safe** (MANDATORY):

   ```bash
   git remote get-url origin
   ```

   - Must contain `iconic-festival-bi-hub`
   - If it contains `template`, ABORT and warn user

2. **Run quality checks**:

   ```bash
   npm run typecheck && npm run lint
   ```

   - Fix ALL errors before proceeding
   - Do not skip this step

3. **Check git status**:

   ```bash
   git status
   git diff --stat
   ```

4. **Stage and commit**:

   ```bash
   git add .
   git commit -m "<type>: <description>

   <optional body>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
   ```

5. **Push to origin**:
   ```bash
   git push origin main
   ```

## Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `docs`: Documentation
- `style`: Formatting
- `test`: Tests
- `chore`: Maintenance

## Safety Rules

- NEVER use `--force` push
- NEVER commit to template repo
- ALWAYS run checks before commit
- ALWAYS verify remote before push
