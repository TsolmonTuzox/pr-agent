# CLAUDE.md - AI Assistant Guide

> **Purpose**: This file provides comprehensive guidance for AI assistants (like Claude) working with the PR Agent codebase. It documents the architecture, conventions, workflows, and best practices to enable effective code understanding and modifications.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Codebase Structure](#codebase-structure)
4. [Code Conventions](#code-conventions)
5. [Development Workflows](#development-workflows)
6. [Key Design Principles](#key-design-principles)
7. [Module Reference](#module-reference)
8. [Testing & Verification](#testing--verification)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

**PR Agent** is an autonomous, safety-aware coding agent that:
- Inspects a repository
- Applies targeted code fixes based on user goals
- Verifies fixes by running tests
- Creates Pull Requests **only when verification passes**

**Key Characteristics**:
- Pure Node.js implementation (zero npm dependencies)
- Node.js v12+ compatible
- Safety-first design with mandatory verification gates
- Dual-mode operation: deterministic fallback + LLM-powered
- HTTP API wrapper for external integrations (Retool, webhooks)

**Technology Stack**:
- Language: JavaScript (ES5 style)
- Runtime: Node.js v12+
- External APIs: Anthropic Claude API (optional), GitHub (via git CLI)
- Testing: npm test (target repositories)

---

## Architecture

### Agent Loop (7 Steps)

The agent follows a strict observe → plan → act → verify → submit loop:

```
1. OBSERVE  → Clone repository, run baseline tests
2. PLAN     → Generate fix using fallback patch or LLM
3. ACT      → Apply code changes to target file
4. VERIFY   → Re-run tests (CRITICAL SAFETY GATE)
5. SUBMIT   → Create branch, commit, push, prepare PR data
```

**Safety Gates**:
- Step 4 (Verify) is mandatory - if tests fail, execution stops
- No commit, no push, no PR if verification fails
- Workspace preserved on failure for debugging
- Workspace cleaned up on success

### Execution Modes

1. **Fallback Mode** (Deterministic)
   - Used for demo repository (`pr-agent-demo`)
   - Pre-scripted patches ensure reliable demonstrations
   - No external API dependencies required

2. **LLM Mode** (Anthropic Claude)
   - Used when `ANTHROPIC_API_KEY` is set and no fallback exists
   - Calls Anthropic API to generate fix patches
   - Validates LLM responses rigorously
   - Falls back to `needs_llm` status if unavailable

3. **Manual Mode**
   - Returns `needs_llm` status when neither fallback nor LLM available
   - Provides plan and test output for manual intervention

---

## Codebase Structure

```
pr-agent/
├── src/
│   ├── cli.js          # CLI entry point, argument parsing
│   ├── agent.js        # Main orchestrator (7-step loop)
│   ├── planner.js      # Fallback patches + LLM integration
│   ├── executor.js     # File read/write operations
│   ├── verifier.js     # Test execution and output capture
│   ├── publisher.js    # Git operations (branch, commit, push)
│   └── server.js       # HTTP API wrapper for Retool
├── package.json        # Project metadata (no dependencies)
├── README.md           # User-facing documentation
├── SUBMISSION.md       # Hackathon submission details
├── DEMO.md             # Quick demo script
└── CLAUDE.md           # This file (AI assistant guide)
```

**Key Directories**:
- `/tmp/pr-agent-work/` - Temporary workspace for cloned repositories
- `working-memory/` - Local scratch space (gitignored)

---

## Code Conventions

### JavaScript Style (ES5)

**Variable Declarations**:
```javascript
// Use 'var' for all declarations (ES5 compatibility)
var result = doSomething();
var config = { key: 'value' };
```

**Module System**:
```javascript
// CommonJS modules (not ES6 imports)
var executor = require('./executor');
module.exports = { functionName: functionName };
```

**Async Patterns**:
```javascript
// Callback-style for async operations
function getLLMPatch(repoPath, goal, testOutput) {
  return new Promise(function(resolve) {
    // async work
    resolve(result);
  });
}

// Sync operations with execSync
var output = execSync('npm test', { cwd: repoPath, stdio: 'pipe' });
```

**String Concatenation**:
```javascript
// Use + operator for string concatenation (no template literals in most places)
var message = 'Hello ' + name + '!';
var path = repoPath + '/' + fileName;

// Template literals used sparingly
var body = `${year}-${month}-${day}`;  // Only in newer functions
```

**Error Handling**:
```javascript
// Try-catch for sync operations
try {
  var content = fs.readFileSync(filePath, 'utf8');
} catch (error) {
  throw new Error('Failed to read file: ' + error.message);
}

// .catch() for promises
return planner.getLLMPatch(repoPath, goal, output)
  .catch(function(error) {
    console.error('Error: ' + error.message);
    throw error;
  });
```

### Naming Conventions

- **Functions**: camelCase (`runTests`, `createBranch`)
- **Variables**: camelCase (`repoPath`, `baselineResult`)
- **Constants**: camelCase (no UPPER_CASE, since using `var`)
- **Files**: lowercase with hyphens for docs (`CLAUDE.md`), lowercase.js for code

### Code Organization

- **One primary export per module**: Each file exports related functions
- **Dependencies at top**: All requires at the top of the file
- **JSDoc comments**: Use for function documentation
- **Console logging**: Emoji-prefixed for user feedback (🤖, 🔍, 🧪, ⚙️, 📤, 🎉)

---

## Development Workflows

### Running the CLI

```bash
# Basic usage
node src/cli.js --repo <url_or_path> --goal "<description>"

# Demo repository
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"

# Local repository
node src/cli.js \
  --repo /path/to/local/repo \
  --goal "Fix the bug in utils/helper.js"
```

### Running the HTTP Server

```bash
# Start server (default port 8787)
npm run server

# Or with custom port
PORT=3000 node src/server.js

# Test the API
curl -X POST http://localhost:8787/run \
  -H "Content-Type: application/json" \
  -d '{"repo":"https://github.com/TsolmonTuzox/pr-agent-demo","goal":"Fix the failing test in utils/date.js"}'
```

### Environment Variables

```bash
# GitHub Personal Access Token (optional, for automatic PR creation via API)
export GITHUB_TOKEN=ghp_...

# Anthropic API (optional, for LLM mode)
export ANTHROPIC_API_KEY=sk-ant-...

# Custom model (optional, defaults to claude-sonnet-4-20250514)
export ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Server port (optional, defaults to 8787)
export PORT=8787
```

### Working with Git

**Branch Naming**: `fix/YYYYMMDD-HHMMSS` (timestamp-based)

```bash
# Example branch
fix/20260122-143052
```

**Commit Message Format**: Uses the patch summary directly

```bash
# Example commit
"Fixed addDays to add days correctly and formatDate to use UTC getters"
```

**Push Command**: Always uses `-u origin <branch>`

```javascript
execSync('git push -u origin ' + branchName, { cwd: repoPath, stdio: 'pipe' });
```

---

## Key Design Principles

### 1. Zero Dependencies

**Rationale**: Ensures maximum compatibility and minimal setup
- No `node_modules` required
- Uses only Node.js built-in modules
- Reduces attack surface and dependency vulnerabilities

**Built-in Modules Used**:
- `fs` - File system operations
- `path` - Path manipulation
- `child_process` - Command execution (git, npm)
- `http`/`https` - HTTP server and API calls

### 2. Safety-First Verification

**Core Principle**: Never create a PR for unverified changes

```javascript
// SAFETY GATE in agent.js
if (!verifyResult.success) {
  console.log('✗ Tests still failing');
  // No commit, no push, no PR
  return { status: 'verify_failed', output: verifyResult.output };
}
```

**Verification Flow**:
1. Run baseline tests (capture failures)
2. Apply fix
3. Re-run tests
4. **STOP if tests fail** → return `verify_failed` status
5. Only proceed to commit/push if tests pass

### 3. Deterministic Demo Mode

**Purpose**: Enable reliable demonstrations without API dependencies

```javascript
// Fallback patch for demo repo
function getFallbackPatch(repoPath, goal) {
  if (goal.indexOf('utils/date.js') !== -1) {
    // Return pre-scripted patch with exact oldCode and newCode
    return { file: targetFile, oldCode: '...', newCode: '...', summary: '...' };
  }
  return null;  // No fallback for other repos
}
```

**Priority Order**:
1. Fallback patch (if available) - always used for demo repo
2. LLM patch (if `ANTHROPIC_API_KEY` set) - for other repos
3. Manual mode (returns `needs_llm` status)

### 4. Isolated Workspaces

**Temporary Directory Pattern**:
```javascript
var timestamp = Date.now();
var workDir = '/tmp/pr-agent-work/' + repoName + '-' + timestamp;
```

**Cleanup Strategy**:
- Success: Remove workspace after PR creation
- Failure: Preserve workspace for debugging
- Each run gets a unique timestamp-based directory

### 5. Synchronous Execution

**Rationale**: Simpler flow control, better error handling

```javascript
// Prefer execSync over spawn for sequential operations
var output = execSync('git status', { cwd: repoPath, stdio: 'pipe' });

// Exception: server.js uses spawn to capture streaming output
var proc = spawn('node', [cliPath].concat(args));
```

---

## Module Reference

### cli.js - Entry Point

**Purpose**: Parse command-line arguments and invoke agent

**Key Functions**:
- `parseArgs()` - Extract `--repo` and `--goal` from process.argv
- `validateArgs()` - Ensure required arguments present
- `main()` - Execute agent and handle result status

**Exit Codes**:
- `0` - Success (tests passed, PR created)
- `1` - Failure (verification failed, needs LLM, or error)

**Usage**:
```bash
node src/cli.js --repo <url> --goal "<text>"
```

---

### agent.js - Main Orchestrator

**Purpose**: Implement the 7-step agent loop

**Key Functions**:

#### `run(repoUrl, goal)`
Main execution function, returns result object.

**Returns**:
```javascript
// Success case
{ status: 'success', prData: {...}, branchName: 'fix/...', repoInfo: {...} }

// Verification failed
{ status: 'verify_failed', output: 'test output...' }

// Needs manual intervention
{ status: 'needs_llm', plan: {...}, repoPath: '...', workDir: '...', baselineResult: {...} }
```

#### `executeWithPatch(patch, repoPath, workDir, baselineResult)`
Executes steps 4-7 (apply, verify, commit, prepare PR).

**Safety Check**:
```javascript
if (!verifyResult.success) {
  // CRITICAL: Stop execution, clean up, return verify_failed
}
```

#### `cloneRepository(repoUrl)`
Clone or copy repository to temp workspace.

**Returns**:
```javascript
{ repoPath: '/tmp/pr-agent-work/...', workDir: '/tmp/pr-agent-work/...' }
```

#### `createPRBody(patch, baselineResult, verifyResult)`
Generate PR description with before/after test output.

**Format**:
```markdown
## Summary
<patch.summary>

## Changes
- File: `<filename>`

## Test Results
### Before
```
<failing test output>
```

### After
```
<passing test output>
```
```

---

### planner.js - Fix Generation

**Purpose**: Generate fix patches using fallback or LLM

**Key Functions**:

#### `getFallbackPatch(repoPath, goal)`
Returns deterministic patch for demo repository.

**Returns**:
```javascript
{
  file: '/absolute/path/to/file.js',
  oldCode: 'exact code to replace',
  newCode: 'corrected code',
  summary: 'Brief description of fix'
}
// or null if no fallback available
```

#### `getLLMPatch(repoPath, goal, testOutput)`
Generate patch using Anthropic API.

**Validation**:
- Checks for `ANTHROPIC_API_KEY` environment variable
- Validates response structure (summary, file, oldCode, newCode)
- Verifies file exists and oldCode is present
- Returns `null` on any failure (never throws)

**API Call**:
```javascript
var requestBody = JSON.stringify({
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  max_tokens: 800,
  messages: [{ role: 'user', content: prompt }]
});

https.request({
  hostname: 'api.anthropic.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  }
});
```

#### `generatePlan(repoPath, goal, testOutput)`
Fallback planning (used when needs_llm).

**Returns**:
```javascript
{
  files: ['file1.js', 'file2.js'],
  fileContents: { 'file1.js': 'content...' },
  testOutput: 'failing test output',
  goal: 'user goal',
  needsLLM: true
}
```

---

### executor.js - File Operations

**Purpose**: Handle all file system operations

**Key Functions**:

#### `readFile(filePath)`
Read file contents as UTF-8 string.
- Throws on error with descriptive message

#### `writeFile(filePath, content)`
Write content to file as UTF-8.
- Throws on error with descriptive message

#### `fileExists(filePath)`
Check if file exists.
- Returns boolean, never throws

#### `listFiles(dirPath, extension)`
Recursively list files in directory.
- Filters out `node_modules` and `.git`
- Optional extension filter (e.g., '.js')

#### `applyChanges(filePath, oldCode, newCode)`
Replace oldCode with newCode in file.
- Throws if oldCode not found
- Uses simple string replacement (first occurrence)

**Usage Example**:
```javascript
var content = executor.readFile('/path/to/file.js');
executor.applyChanges('/path/to/file.js', 'old code', 'new code');
```

---

### verifier.js - Test Execution

**Purpose**: Run tests and capture output

**Key Functions**:

#### `detectTestCommand(repoPath)`
Read package.json and extract test script.

**Returns**:
```javascript
'npm test'  // if scripts.test exists
null        // if no package.json or no test script
```

#### `runTests(repoPath)`
Execute test command and capture output.

**Returns**:
```javascript
{
  success: true/false,   // true if exit code 0
  output: 'test output',  // stdout + stderr
  command: 'npm test'     // or null
}
```

**Error Handling**:
- Uses execSync with `stdio: 'pipe'` to capture output
- Catches errors and returns `success: false` (doesn't throw)

---

### publisher.js - Git Operations

**Purpose**: Handle all git operations

**Key Functions**:

#### `createBranch(repoPath)`
Create timestamped branch and check it out.

**Branch Format**: `fix/YYYYMMDD-HHMMSS`

```javascript
execSync('git checkout -b ' + branchName, { cwd: repoPath, stdio: 'pipe' });
```

#### `commitChanges(repoPath, message)`
Stage all changes and commit with message.

```javascript
execSync('git add -A', { cwd: repoPath, stdio: 'pipe' });
execSync('git commit -m "' + message + '"', { cwd: repoPath, stdio: 'pipe' });
```

#### `pushBranch(repoPath, branchName)`
Push branch to origin with upstream tracking.

```javascript
execSync('git push -u origin ' + branchName, { cwd: repoPath, stdio: 'pipe' });
```

#### `getRepoInfo(repoPath)`
Extract owner/repo from git remote URL.

**Returns**:
```javascript
{ owner: 'TsolmonTuzox', repo: 'pr-agent-demo' }
```

**Parses**:
- HTTPS: `https://github.com/owner/repo.git`
- SSH: `git@github.com:owner/repo.git`

#### `createPullRequestData(repoInfo, branchName, title, body)`
Prepare PR data structure for external use.

**Returns**:
```javascript
{
  owner: 'TsolmonTuzox',
  repo: 'pr-agent-demo',
  head: 'fix/20260122-143052',
  base: 'main',
  title: 'Fix: ...',
  body: 'PR description...'
}
```

#### `createPullRequestActual(repoInfo, branchName, title, body)`
Create Pull Request via GitHub API (if `GITHUB_TOKEN` is set).

**Returns Promise**:
```javascript
{
  prData: { owner, repo, head, base, title, body },
  url: 'https://github.com/owner/repo/pull/123',  // or null
  number: 123,  // or undefined
  createdViaAPI: true  // or false
}
```

**Behavior**:
- **With `GITHUB_TOKEN`**: Makes HTTPS POST request to GitHub API `/repos/{owner}/{repo}/pulls`
- **Without `GITHUB_TOKEN`**: Returns prData only with `createdViaAPI: false`
- **API Error**: Logs error details and falls back to prData only
- **Timeout**: 30 seconds

**GitHub API Request**:
```javascript
POST https://api.github.com/repos/{owner}/{repo}/pulls
Headers:
  Authorization: token {GITHUB_TOKEN}
  Accept: application/vnd.github.v3+json
  User-Agent: pr-agent
Body:
  { title, head, base, body }
```

**Error Handling**:
- Validates response status (201 = success)
- Logs API errors with status code and message
- Gracefully falls back on any failure
- Never throws, always resolves Promise

---

### server.js - HTTP API Wrapper

**Purpose**: Expose agent functionality via REST API

**Endpoints**:

#### `GET /`
Health check and API info.

**Response**:
```json
{
  "service": "PR Agent API",
  "version": "1.0.0",
  "endpoints": {
    "POST /run": "Run PR Agent with { repo, goal }"
  }
}
```

#### `POST /run`
Execute agent with repo and goal.

**Request**:
```json
{
  "repo": "https://github.com/TsolmonTuzox/pr-agent-demo",
  "goal": "Fix the failing test in utils/date.js"
}
```

**Response**:
```json
{
  "status": "success",  // or "verify_failed", "needs_llm", "error"
  "logs": "🤖 PR Agent Starting...\n...",
  "prData": {
    "owner": "TsolmonTuzox",
    "repo": "pr-agent-demo",
    "head": "fix/20260122-143052",
    "base": "main",
    "title": "Fix: ...",
    "body": "..."
  }
}
```

**Implementation Details**:
- Uses `spawn` to run cli.js as child process
- Captures stdout/stderr as logs
- Extracts PR data from logs using regex
- CORS enabled for browser access
- Timeout: 30 seconds per request

**Starting Server**:
```bash
npm run server  # or node src/server.js
```

---

## Testing & Verification

### Manual Testing

**Demo Repository**:
```bash
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"
```

**Expected Outcome**:
- Branch created: `fix/YYYYMMDD-HHMMSS`
- Tests pass: 2/2 (was 0/2)
- PR data printed to console

**Verification Checklist**:
- [ ] Repository cloned to `/tmp/pr-agent-work/`
- [ ] Baseline tests run and captured
- [ ] Fallback patch applied
- [ ] Tests re-run and passing
- [ ] Git branch created and pushed
- [ ] PR data structure valid

### HTTP Server Testing

```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Test health
curl http://localhost:8787/

# Terminal 3: Test agent run
curl -X POST http://localhost:8787/run \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "https://github.com/TsolmonTuzox/pr-agent-demo",
    "goal": "Fix the failing test in utils/date.js"
  }'
```

### LLM Mode Testing

```bash
# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Test with non-demo repository
node src/cli.js \
  --repo https://github.com/user/other-repo \
  --goal "Fix the bug in src/utils.js"
```

**Expected Behavior**:
- Should call Anthropic API
- Generate patch based on LLM response
- Validate patch structure before applying

### GitHub PR Creation Testing

```bash
# Set GitHub token for automatic PR creation
export GITHUB_TOKEN=ghp_your_token_here

# Run agent
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"
```

**Expected Behavior (with GITHUB_TOKEN)**:
- Creates real PR via GitHub API
- Prints PR URL: `https://github.com/owner/repo/pull/123`
- Returns `createdViaAPI: true`

**Expected Behavior (without GITHUB_TOKEN)**:
- Pushes branch to GitHub
- Returns PR data structure
- Prints: "To enable automatic PR creation, set GITHUB_TOKEN environment variable"
- Returns `createdViaAPI: false`

---

## Common Tasks

### Adding a New Fallback Patch

**File**: `src/planner.js`

**Location**: `getFallbackPatch()` function

```javascript
function getFallbackPatch(repoPath, goal) {
  // Existing demo patch
  if (goal.indexOf('utils/date.js') !== -1) {
    // ... existing code
  }

  // Add new fallback patch
  if (goal.indexOf('utils/math.js') !== -1) {
    var targetFile = repoPath + '/utils/math.js';
    var currentContent = executor.readFile(targetFile);

    var oldCode = 'function add(a, b) {\n' +
      '  return a - b;  // BUG: should be +\n' +
      '}';

    var newCode = 'function add(a, b) {\n' +
      '  return a + b;\n' +
      '}';

    return {
      file: targetFile,
      oldCode: oldCode,
      newCode: newCode,
      summary: 'Fixed add function to use + instead of -'
    };
  }

  return null;
}
```

### Modifying the LLM Prompt

**File**: `src/planner.js`

**Location**: `getLLMPatch()` function, around line 156

```javascript
var prompt = 'You are a code repair assistant. Analyze the failing test output and fix the bug.\n\n' +
  'Repository path: ' + repoPath + '\n' +
  'Goal: ' + goal + '\n\n' +
  'Failing test output:\n```\n' + testOutput + '\n```\n\n' +
  // ... add your custom instructions here
  'IMPORTANT: Respond with ONLY valid JSON (no markdown, no explanation).\n';
```

**Tips**:
- Keep prompt focused and structured
- Emphasize JSON-only output (no markdown wrappers)
- Include strict validation rules
- Provide examples if needed

### Adding New Agent Steps

**File**: `src/agent.js`

**Location**: `executeWithPatch()` function

**Pattern**: Follow the existing step structure

```javascript
// Existing steps 4-7 are already implemented
// To add a new step 8, for example:

console.log('[8/8] 🔔 Notifying team...');
notifyTeam(prData);
console.log('✓ Team notified\n');
```

**Important**: Update step numbers in all console.log messages.

### Extending File Operations

**File**: `src/executor.js`

**Pattern**: Add new function following existing style

```javascript
/**
 * Copy file from source to destination
 */
function copyFile(sourcePath, destPath) {
  try {
    var content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destPath, content, 'utf8');
    return true;
  } catch (error) {
    throw new Error('Failed to copy file: ' + error.message);
  }
}

// Add to exports
module.exports = {
  readFile: readFile,
  writeFile: writeFile,
  fileExists: fileExists,
  listFiles: listFiles,
  applyChanges: applyChanges,
  copyFile: copyFile  // Add here
};
```

---

## Troubleshooting

### Common Issues

#### 1. Git Authentication Fails

**Symptom**:
```
Error: Failed to push branch: ...
```

**Solutions**:
- Ensure GitHub SSH keys configured: `ssh -T git@github.com`
- Or use HTTPS with personal access token
- Check git credentials: `git config --list`

#### 2. Tests Don't Run

**Symptom**:
```
No test command found
```

**Solutions**:
- Ensure target repository has `package.json`
- Ensure `scripts.test` exists in package.json
- Try running `npm test` manually in the repo

#### 3. Workspace Cleanup Fails

**Symptom**:
```
Warning: Could not clean up /tmp/pr-agent-work/...
```

**Solutions**:
- This is non-critical (logged but doesn't fail execution)
- Manually remove: `rm -rf /tmp/pr-agent-work/`
- Check disk space: `df -h /tmp`

#### 4. LLM API Errors

**Symptom**:
```
⚠️  Anthropic API error: 401
```

**Solutions**:
- Check `ANTHROPIC_API_KEY` is set correctly
- Verify API key is valid (not expired)
- Check API quota/rate limits
- Agent gracefully falls back to `needs_llm` status

#### 5. Old Code Not Found

**Symptom**:
```
Error: Old code not found in file: ...
```

**Solutions**:
- Fallback patch's `oldCode` doesn't match file
- File may have been modified since patch was written
- Update the fallback patch in `planner.js`
- Or let LLM generate fresh patch

### Debugging Tips

#### Enable Verbose Logging

Add more console.log statements:

```javascript
console.log('🔍 Debug: repoPath =', repoPath);
console.log('🔍 Debug: fileContent length =', content.length);
```

#### Preserve Workspace

Comment out cleanup in `agent.js`:

```javascript
// Clean up on success
// if (workDir && fs.existsSync(workDir)) {
//   try {
//     execSync('rm -rf ' + workDir, { stdio: 'pipe' });
//   } catch (e) {
//     // Ignore cleanup errors
//   }
// }
```

Then manually inspect `/tmp/pr-agent-work/`

#### Test Individual Modules

```javascript
// Test executor directly
var executor = require('./src/executor');
var content = executor.readFile('/path/to/file.js');
console.log(content);
```

#### Check Git State

```bash
cd /tmp/pr-agent-work/repo-name-timestamp/repo-name
git status
git log
git diff
```

---

## Best Practices for AI Assistants

### When Reading This Codebase

1. **Respect ES5 Conventions**: Don't suggest const/let, template literals everywhere, or ES6 imports
2. **Maintain Zero Dependencies**: Don't add npm packages
3. **Preserve Safety Gates**: Never bypass the verification step
4. **Follow Existing Patterns**: Match the style of surrounding code
5. **Use Synchronous Operations**: Prefer execSync for sequential tasks

### When Modifying Code

1. **Test Your Changes**: Run the demo command after modifications
2. **Update Documentation**: If changing behavior, update README.md and this file
3. **Maintain Backward Compatibility**: Node v12+ must still work
4. **Add Comments**: Explain non-obvious logic
5. **Follow DRY**: Extract repeated patterns into functions

### When Debugging

1. **Read Error Messages**: Error messages are descriptive (includes file paths, operations)
2. **Check Workspace**: Files in `/tmp/pr-agent-work/` show actual state
3. **Verify Git State**: Use `git status` in workspace to understand branch/commit state
4. **Test Incrementally**: Test each module individually before integration
5. **Preserve Evidence**: Don't clean up workspace when debugging

### When Adding Features

1. **Safety First**: New features must respect verification gates
2. **Deterministic Fallbacks**: Provide fallback for demo scenarios
3. **Error Handling**: All external operations (git, npm, file I/O) must handle errors
4. **Logging**: Add emoji-prefixed console logs for user feedback
5. **Documentation**: Update this file with new patterns/conventions

---

## Useful Commands Reference

### Development

```bash
# Run agent (CLI)
node src/cli.js --repo <url> --goal "<text>"

# Run server
npm run server

# Run with LLM
ANTHROPIC_API_KEY=<key> node src/cli.js --repo <url> --goal "<text>"
```

### Testing

```bash
# Test demo repository
node src/cli.js \
  --repo https://github.com/TsolmonTuzox/pr-agent-demo \
  --goal "Fix the failing test in utils/date.js"

# Test HTTP endpoint
curl -X POST http://localhost:8787/run \
  -H "Content-Type: application/json" \
  -d '{"repo":"...","goal":"..."}'

# Health check
curl http://localhost:8787/
```

### Debugging

```bash
# Check temporary workspaces
ls -la /tmp/pr-agent-work/

# Inspect workspace
cd /tmp/pr-agent-work/pr-agent-demo-*/pr-agent-demo
git status
npm test

# Clean up all workspaces
rm -rf /tmp/pr-agent-work/
```

### Git Operations

```bash
# Check current branch
git branch

# View recent commits
git log --oneline -5

# Check remote URL
git remote get-url origin

# Push branch
git push -u origin fix/20260122-143052
```

---

## Related Documentation

- **README.md** - User-facing documentation and quick start
- **SUBMISSION.md** - Hackathon submission details and project overview
- **DEMO.md** - 90-second demo script for presentations
- **package.json** - Project metadata and npm scripts

---

## Maintenance Notes

### When to Update This File

- New modules added to `src/`
- Major architectural changes
- New conventions adopted
- Breaking changes to APIs
- New environment variables
- Changed dependencies (if zero-dependency policy changes)

### File Version

- **Last Updated**: 2026-01-22
- **Agent Version**: 1.0.0
- **Node.js Compatibility**: v12+

---

## Quick Reference Card

**Core Agent Loop**: observe → plan → act → verify → submit (7 steps)

**Safety Gate**: Tests must pass at step 5 (verify) or execution stops

**Execution Modes**: Fallback (demo) → LLM (API) → Manual (needs_llm)

**Temp Workspace**: `/tmp/pr-agent-work/<repo>-<timestamp>`

**Branch Format**: `fix/YYYYMMDD-HHMMSS`

**Key Env Vars**: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `PORT`

**Zero Dependencies**: Pure Node.js, no npm packages

**ES5 Style**: `var`, CommonJS, callbacks, string concatenation

**Exit Codes**: 0 = success, 1 = failure/needs_llm/error

---

*This guide is maintained for AI assistants working with the PR Agent codebase. For user-facing documentation, see README.md.*
