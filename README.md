# PR Agent

Autonomous PR Agent that creates pull requests automatically.

## Overview
PR Agent is a command-line tool that:
1. Clones a repository
2. Runs baseline tests
3. Analyzes failing tests using LLM
4. Applies fixes
5. Verifies fixes
6. Creates a GitHub pull request

## Requirements
- Node.js v12+
- Git configured
- GitHub authentication

## Usage

### Basic Command
```bash
node src/cli.js --repo <git_url_or_path> --goal "<text>"
```

### Example
```bash
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"
```

### With Local Repository
```bash
node src/cli.js \
  --repo /home/mootsoo/github-workspace/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"
```

## Architecture

```
src/
├── cli.js          # Entry point - parses arguments
├── agent.js        # Main orchestrator (observe → plan → act → verify → submit)
├── planner.js      # LLM-based planning
├── executor.js     # File operations
├── verifier.js     # Test execution
└── publisher.js    # Git operations + GitHub PR
```

## Agent Loop

1. **Observe**: Clone repo, run tests, capture output
2. **Plan**: Analyze with LLM, generate fix strategy
3. **Act**: Apply code changes
4. **Verify**: Re-run tests, capture output
5. **Submit**: Create branch, commit, push, open PR

## Features

- ✅ Zero dependencies (Node.js built-ins only)
- ✅ Node v12 compatible
- ✅ Clean temp workspace
- ✅ Before/after test output in PR
- ✅ Timestamp-based branch naming
- ✅ Automatic cleanup on success

## Safety

- Single-goal execution
- File modification limits
- No destructive operations
- No auto-merge
- Cleanup on error (keeps workspace for debugging)

## Example Output

```
🤖 PR Agent Starting...

📦 Repository: https://github.com/TsolmonTuzox/pr-agent-demo
🎯 Goal: Fix the failing test in utils/date.js

[1/7] 🔍 Cloning repository...
✓ Repository cloned to /tmp/pr-agent-work/pr-agent-demo-1234567890

[2/7] 🧪 Running baseline tests...
✓ Tests captured (failing)

[3/7] 🧠 Analyzing and planning fix...
⚠️  LLM intervention required

[4/7] ⚙️  Applying fix...
✓ File modified: utils/date.js

[5/7] 🧪 Verifying fix...
✓ Tests now passing

[6/7] 📤 Committing and pushing...
✓ Branch created: fix/20260116-134522
✓ Changes committed
✓ Pushed to GitHub

[7/7] 🎉 Creating pull request...
✓ PR created

✅ Done! PR is ready for review.
```

## License

MIT
