# PR Agent – Verified Autonomous Pull Request Generator

PR Agent is an autonomous, safety-aware coding agent that:
- Inspects a repository
- Applies a targeted code fix based on a user goal
- Verifies the fix by running tests
- **Stops if tests fail**
- Creates a Pull Request **only when verification passes**

This is not a script.  
This is a controlled agent loop with explicit safety gates.

---

## What This Agent Does (Guaranteed)

The agent performs the following steps **every run**:

1. Clone or open a repository
2. Run baseline tests and capture failures
3. Analyze the user goal
4. Apply a deterministic or planned code change
5. Re-run tests
6. **Stop immediately if tests fail**
7. Create a Git branch, commit the fix, and open a Pull Request

If verification fails, **no commit and no PR are created**.

---

## One-Command Demo

```bash
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"
```

**Expected outcome:**
- Creates branch `fix/YYYYMMDD-HHMMSS`
- Fixes `utils/date.js` (addDays and formatDate timezone bug)
- Tests pass (2/2)
- Opens Pull Request with before/after test output

**Actual PR created:**  
https://github.com/TsolmonTuzox/pr-agent-demo/pull/2

---

## Requirements

- Node.js v12+ (verified on v12.22.9)
- Git configured
- GitHub authentication via MCP tools

**Zero npm dependencies.**  
Uses Node.js built-ins only.

---

## Architecture

```
src/
├── cli.js          # Entry point - argument parsing
├── agent.js        # Main orchestrator (observe → plan → act → verify → submit)
├── planner.js      # Fallback patch logic (demo-specific)
├── executor.js     # File read/write operations
├── verifier.js     # Test execution and output capture
└── publisher.js    # Git operations + GitHub PR creation
```

---

## Agent Loop (Implemented)

1. **Observe**  
   - Clone repository to `/tmp/pr-agent-work/<repo>-<timestamp>`
   - Run baseline tests via `npm test`
   - Capture failing test output

2. **Plan**  
   - Apply fallback patch (deterministic for demo)
   - Future: LLM-based analysis

3. **Act**  
   - Apply code changes to target file
   - Use string replacement

4. **Verify**  
   - Re-run tests via `npm test`
   - **If tests fail: STOP. No commit, no PR.**
   - Capture passing test output

5. **Submit**  
   - Create branch: `fix/YYYYMMDD-HHMMSS`
   - Commit changes
   - Push to GitHub
   - Create Pull Request with before/after test output

---

## Safety Gates (Enforced)

- **Test verification required**: PR is created **only** if tests pass after applying the fix
- **No auto-merge**: PR is opened for human review
- **Isolated workspace**: `/tmp/pr-agent-work/<repo>-<timestamp>`
- **Cleanup on success**: Workspace removed after PR creation
- **Preserved on failure**: Workspace kept for debugging if verification fails

---

## Example Output (Verified)

```
🤖 PR Agent Starting...

[1/7] 🔍 Cloning repository...
✓ Repository cloned

[2/7] 🧪 Running baseline tests...
✓ Tests captured (failing) - 0/2 passing

[3/7] 🧠 Analyzing and planning fix...
✓ Plan generated: Fixed addDays to add days correctly and formatDate to use UTC getters

[4/7] ⚙️  Applying fix...
✓ File modified: date.js

[5/7] 🧪 Verifying fix...
✓ Tests now passing (fixed) - 2/2 passing

[6/7] 📤 Committing and pushing...
✓ Branch created: fix/20260116-121115
✓ Changes committed
✓ Pushed to GitHub

[7/7] 🎉 Preparing pull request...
✓ PR data prepared

✅ Agent execution complete!
```

---

## Demo Repository

- **Repository**: https://github.com/TsolmonTuzox/pr-agent-demo
- **Issue**: Failing tests in `utils/date.js`
  - Bug 1: `addDays` incorrectly sets date (missing `getDate()`)
  - Bug 2: `formatDate` uses local time instead of UTC
- **Agent Fix**: Both bugs fixed in single PR
- **Result**: Pull Request #2 (tests passing 2/2)

---

## Verified Capabilities

✅ **Autonomous execution** – No human intervention required  
✅ **Test-driven safety** – Stops if tests fail  
✅ **GitHub integration** – Creates real Pull Requests  
✅ **Before/after evidence** – Test output included in PR body  
✅ **Clean workspace** – Isolated temporary directories  
✅ **Zero dependencies** – Pure Node.js (v12 compatible)

---

## Project Status

- **Repository**: https://github.com/TsolmonTuzox/pr-agent
- **Demo**: https://github.com/TsolmonTuzox/pr-agent-demo
- **Verified PR**: https://github.com/TsolmonTuzox/pr-agent-demo/pull/2
- **Tests**: Passing (2/2)
- **Status**: Demo-ready

---

## License

MIT
