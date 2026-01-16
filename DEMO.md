# PR Agent – 90-Second Demo Script

## Overview

This demo shows PR Agent autonomously fixing a bug and creating a Pull Request.

**Duration**: ~90 seconds
**Requirements**: Node.js v12+, Git configured, GitHub auth

---

## Demo Command

```bash
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"
```

---

## What Happens

1. **Clone** – Agent clones the demo repository
2. **Test** – Runs `npm test`, captures 0/2 failing
3. **Plan** – Generates fix using fallback patch
4. **Apply** – Modifies `utils/date.js`
5. **Verify** – Re-runs tests, now 2/2 passing
6. **Push** – Creates branch, commits, pushes
7. **PR** – Opens Pull Request with test evidence

---

## Expected Output

```
🤖 PR Agent Starting...

📦 Repository: https://github.com/TsolmonTuzox/pr-agent-demo
🎯 Goal: Fix the failing test in utils/date.js

[1/7] 🔍 Cloning repository...
✓ Repository cloned to /tmp/pr-agent-work/pr-agent-demo-<timestamp>/pr-agent-demo

[2/7] 🧪 Running baseline tests...
✓ Tests captured (failing)

[3/7] 🧠 Analyzing and planning fix...
✓ Plan generated (fallback): Fixed addDays to add days correctly and formatDate to use UTC getters

[4/7] ⚙️  Applying fix...
✓ File modified: date.js

[5/7] 🧪 Verifying fix...
✓ Tests now passing (fixed)

[6/7] 📤 Committing and pushing...
✓ Branch created: fix/YYYYMMDD-HHMMSS
✓ Changes committed
✓ Pushed to GitHub

[7/7] 🎉 Preparing pull request...
✓ PR data prepared

✅ Agent execution complete!
```

---

## Key Highlights

| Step | What to Show |
|------|--------------|
| Baseline tests | `0/2 passing` (failing) |
| After fix | `2/2 passing` (fixed) |
| Safety gate | Tests MUST pass before PR |
| Real PR | Link to GitHub PR |

---

## Created PR

**Pull Request #2**: https://github.com/TsolmonTuzox/pr-agent-demo/pull/2

The PR includes:
- Summary of the fix
- File changed: `utils/date.js`
- Before/after test output
- Verification evidence

---

## Demo Talking Points

1. **"One command"** – No manual steps required
2. **"Test-driven safety"** – PR only created if tests pass
3. **"Real GitHub PR"** – Not a simulation
4. **"Before/after evidence"** – Test output in PR body
5. **"Zero dependencies"** – Pure Node.js

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Git auth fails | Check GitHub SSH keys or token |
| Tests don't run | Ensure demo repo has `npm test` configured |
| PR already exists | Branch name includes timestamp, should be unique |

---

## Advanced: LLM Mode

For non-demo repositories, set `ANTHROPIC_API_KEY` to enable LLM-powered fixes:

```bash
export ANTHROPIC_API_KEY=your-key
node src/cli.js --repo <other-repo> --goal "Fix the bug in ..."
```

The demo always uses the deterministic fallback patch for reliability.
