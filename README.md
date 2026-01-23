# PR Agent – Verified Autonomous Pull Request Generator

> **Hackathon Judges**: See [SUBMISSION.md](SUBMISSION.md) for complete project overview and evaluation instructions.

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
4. Apply a deterministic or LLM-generated code change
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
- GitHub Personal Access Token (for automatic PR creation, optional)

**Zero npm dependencies.**
Uses Node.js built-ins only.

### Environment Variables

- `GITHUB_TOKEN` (optional) - GitHub Personal Access Token for automatic PR creation
- `ANTHROPIC_API_KEY` (optional) - Anthropic API key for LLM-powered fixes
- `ANTHROPIC_MODEL` (optional) - Model to use (defaults to `claude-sonnet-4-20250514`)
- `PORT` (optional) - HTTP server port (defaults to `8787`)

---

## LLM Mode (Anthropic)

PR Agent supports optional LLM-powered code analysis using the Anthropic API.

### Setup

Set the environment variable:
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

Optional: specify a model (defaults to `claude-sonnet-4-20250514`):
```bash
export ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### Behavior

1. **Demo repository**: The fallback patch is always used for the demo repo (`pr-agent-demo`). This ensures deterministic demo behavior regardless of LLM availability.

2. **Other repositories**: If no fallback patch is available:
   - With `ANTHROPIC_API_KEY` set: The agent calls the Anthropic API to generate a fix
   - Without `ANTHROPIC_API_KEY`: Returns `needs_llm` status, indicating manual intervention required

3. **Safety preserved**: LLM-generated patches go through the same verification gate. If tests fail after applying an LLM patch, **no commit and no PR are created**.

### LLM Patch Validation

LLM responses are strictly validated:
- Must return valid JSON with `summary`, `file`, `oldCode`, `newCode`
- `file` must be a relative path to an existing file
- `oldCode` must match exactly in the target file
- Any validation failure falls back to `needs_llm` status

---

## GitHub Authentication (Pull Request Creation)

PR Agent can automatically create Pull Requests via the GitHub API when properly authenticated.

### Setup

Set the environment variable:
```bash
export GITHUB_TOKEN=ghp_your_personal_access_token
```

**Creating a GitHub Personal Access Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "PR Agent")
4. Select scopes: `repo` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token and set it as `GITHUB_TOKEN` environment variable

### Behavior

1. **With `GITHUB_TOKEN` set**: The agent creates a real Pull Request via GitHub API and returns the PR URL
   ```bash
   ✅ Agent execution complete!

   🎉 Pull Request created successfully!
   URL: https://github.com/owner/repo/pull/123
   PR Number: #123
   ```

2. **Without `GITHUB_TOKEN`**: The agent pushes the branch and returns PR data structure for manual PR creation
   ```bash
   ✅ Agent execution complete!

   PR Data (manual creation required):
   {
     "owner": "owner",
     "repo": "repo",
     "head": "fix/20260122-143052",
     "base": "main",
     "title": "Fix: ...",
     "body": "..."
   }

   To enable automatic PR creation, set GITHUB_TOKEN environment variable
   ```

### Full Example with Authentication

```bash
# Set tokens
export GITHUB_TOKEN=ghp_your_token_here
export ANTHROPIC_API_KEY=sk-ant-your_key_here  # Optional, for LLM mode

# Run agent
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"

# Expected: Real PR created and URL printed
```

---

## Architecture

```
src/
├── cli.js          # Entry point - argument parsing
├── agent.js        # Main orchestrator (observe → plan → act → verify → submit)
├── planner.js      # Fallback patch + LLM patch logic
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
   - Try fallback patch first (deterministic, for demo reliability)
   - If no fallback: Try LLM patch (if ANTHROPIC_API_KEY set)
   - If no LLM: Return needs_llm status

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
✓ Plan generated (fallback): Fixed addDays to add days correctly and formatDate to use UTC getters

[4/7] ⚙️  Applying fix...
✓ File modified: date.js

[5/7] 🧪 Verifying fix...
✓ Tests now passing (fixed) - 2/2 passing

[6/7] 📤 Committing and pushing...
✓ Branch created: fix/20260116-121115
✓ Changes committed
✓ Pushed to GitHub

[7/7] 🎉 Creating pull request...
✓ Pull Request created: https://github.com/TsolmonTuzox/pr-agent-demo/pull/3

✅ Agent execution complete!

🎉 Pull Request created successfully!
URL: https://github.com/TsolmonTuzox/pr-agent-demo/pull/3
PR Number: #3
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
✅ **Optional LLM** – Anthropic integration for non-demo repos
✅ **HTTP API** – Retool/webhook integration via REST endpoint

---

## Retool Integration (HTTP API)

PR Agent includes an HTTP server for integration with Retool, webhooks, and other automation tools.

### Start the Server

```bash
npm run server
```

Server runs on port **8787** by default (configurable via `PORT` env var).

### API Endpoint

**POST /run**

Request body:
```json
{
  "repo": "https://github.com/TsolmonTuzox/pr-agent-demo",
  "goal": "Fix the failing test in utils/date.js"
}
```

Response (with GITHUB_TOKEN set):
```json
{
  "status": "success",
  "logs": "🤖 PR Agent Starting...\n...",
  "prData": {
    "owner": "TsolmonTuzox",
    "repo": "pr-agent-demo",
    "head": "fix/20260116-121115",
    "base": "main",
    "title": "Fix: ...",
    "body": "..."
  },
  "prUrl": "https://github.com/TsolmonTuzox/pr-agent-demo/pull/3",
  "prNumber": 3,
  "createdViaAPI": true
}
```

Response (without GITHUB_TOKEN):
```json
{
  "status": "success",
  "logs": "🤖 PR Agent Starting...\n...",
  "prData": {
    "owner": "TsolmonTuzox",
    "repo": "pr-agent-demo",
    "head": "fix/20260116-121115",
    "base": "main",
    "title": "Fix: ...",
    "body": "..."
  },
  "prUrl": null,
  "prNumber": null,
  "createdViaAPI": false
}
```

Status values: `success`, `verify_failed`, `needs_llm`, `error`

### Test with curl

```bash
curl -X POST http://localhost:8787/run \
  -H "Content-Type: application/json" \
  -d '{"repo":"https://github.com/TsolmonTuzox/pr-agent-demo","goal":"Fix the failing test in utils/date.js"}'
```

### Retool Setup

1. Create a new **REST API** resource in Retool
2. Set Base URL: `http://localhost:8787`
3. Create a query with:
   - Method: POST
   - Path: `/run`
   - Body: `{ "repo": "{{repoInput.value}}", "goal": "{{goalInput.value}}" }`
4. Display `{{ query.data.logs }}` in a text area
5. Display `{{ query.data.prData }}` as JSON or link to PR

**Note**: If using Retool Cloud, expose the local server via a tunnel (e.g., `ngrok http 8787`) and use the resulting `https://` URL as the Base URL.

### Server Verification

```bash
# Start server
npm run server

# Test health (separate terminal)
curl http://localhost:8787/

# Test agent run
curl -X POST http://localhost:8787/run \
  -H "Content-Type: application/json" \
  -d '{"repo":"https://github.com/TsolmonTuzox/pr-agent-demo","goal":"Fix the failing test in utils/date.js"}'
```

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
