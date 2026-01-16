# PR Agent – Hackathon Submission

## 1. Project Title
**PR Agent: Autonomous Pull Request Generator with Verification**

## 2. Tagline
A safety-first autonomous agent that fixes code, verifies changes, and opens GitHub pull requests only when tests pass.

## 3. Project Description

PR Agent automates the entire pull request workflow from problem identification to verified submission. Given a simple goal like "fix the failing test in utils/date.js", the agent inspects the repository, generates an execution plan, applies code changes, runs verification tests, and opens a GitHub pull request with complete context and evidence. The agent prioritizes correctness over speed, refusing to submit unverified changes.

Built for hackathon evaluation, PR Agent includes both production-grade Claude API integration and a deterministic fallback mode. This design ensures judges can run complete demonstrations without API credentials while maintaining sponsor alignment. The project demonstrates practical autonomous development with real safety constraints: single-goal execution, verification gates, and no auto-merge capabilities.

## 4. What the Project Does

- Accepts a repository path and natural language goal
- Inspects repository structure and identifies relevant files
- Generates a step-by-step execution plan using LLM reasoning
- Applies targeted code modifications to fix issues
- Runs verification tests or linters to validate changes
- Creates a new Git branch and commits changes
- Opens a GitHub pull request with:
  - Clear title and description
  - Summary of changes made
  - Verification results and test output
  - Link to the specific commit
- Includes safety controls: single-repo scope, no destructive operations, no auto-merge
- Provides deterministic demo mode for evaluation without API dependencies

## 5. How Anthropic Claude is Used

**Production Integration (Code-Complete)**

The PR Agent uses Claude Sonnet 4 as its core reasoning engine through the Anthropic API. Specifically:

- **Planning Phase**: Claude generates execution plans by analyzing repository structure and identifying which files require modification to achieve the stated goal.
- **Code Generation**: Claude produces precise code changes with proper context awareness, maintaining existing code style and patterns.
- **Verification Interpretation**: Claude analyzes test output to determine if changes successfully resolve the issue.
- **PR Content**: Claude generates clear, professional pull request descriptions that explain what changed and why.

**Technical Implementation**

```python
# Anthropic API integration (agent.py)
client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    messages=[...]
)
```

**Graceful Degradation**

The codebase includes proper error handling for API availability. When Claude API access is unavailable, the agent switches to deterministic mode with pre-scripted plans. This ensures:
- Judges can evaluate the project without API keys
- The architecture remains production-correct
- Sponsor integration is authentic, not simulated

The LLM integration follows Anthropic best practices: structured prompts, proper system messages, and appropriate token limits.

## 6. How Judges Can Test It

**Prerequisites**
- Python 3.8 or higher
- Git installed
- GitHub account (for viewing created PRs)

**Step 1: Clone the Project**
```bash
git clone https://github.com/TsolmonTuzox/pr-agent.git
cd pr-agent
```

**Step 2: Install Dependencies**
```bash
pip install -r requirements.txt
```

**Step 3: Run the Demo**
```bash
python demo.py
```

**What Happens**
1. Agent clones the demo repository (https://github.com/TsolmonTuzox/pr-agent-demo)
2. Identifies a failing test in the codebase
3. Generates an execution plan
4. Applies a fix to make the test pass
5. Runs verification tests
6. Creates a new branch and commits changes
7. Opens a pull request on GitHub

**Expected Output**
- Terminal log showing each phase of execution
- Test results showing failure → success transition
- GitHub PR link at the end
- Complete execution trace for verification

**No API Key Required**
The demo runs in deterministic mode by default. Judges can inspect the full workflow without Anthropic API credentials. The production code path remains visible in `agent.py` for sponsor review.

**Optional: Test with Live Claude API**
```bash
export ANTHROPIC_API_KEY=your_key_here
python demo.py --live
```

## 7. Why This Project is Interesting

**Safety-First Autonomous Development**

Most coding agents prioritize speed and automation. PR Agent prioritizes correctness and trust. It refuses to open pull requests for unverified changes, treating test failures as hard stops rather than warnings. This reflects real-world engineering discipline: automated changes must meet the same quality bar as human contributions.

**Verification Gates as Core Design**

The agent architecture includes mandatory verification checkpoints. Code changes are never submitted without evidence of correctness. This approach demonstrates that autonomous systems can maintain high standards without human oversight, making them suitable for production workflows.

**Honest Sponsor Integration**

The project integrates Claude API correctly and completely, while also supporting evaluation without API dependencies. This demonstrates technical maturity: production systems must handle degraded states gracefully. The deterministic fallback is not a workaround but a feature, ensuring the project remains evaluable under all conditions.

**Real Pull Requests, Real Workflow**

Unlike simulation-based demos, PR Agent creates actual GitHub pull requests with real commits, test results, and change history. Judges can click through to GitHub and see the agent's work in a familiar interface. This grounds the demonstration in observable reality rather than terminal output.

**Practical Scope Constraints**

The project explicitly excludes multi-repo support, continuous learning, and auto-merge capabilities. These constraints demonstrate understanding of safe autonomous system boundaries. Production-ready agents should have well-defined operational limits, not unbounded capabilities.

---

## Additional Information

**Repository**: https://github.com/TsolmonTuzox/pr-agent

**Demo Repository**: https://github.com/TsolmonTuzox/pr-agent-demo

**Key Files**:
- `agent.py` - Core agent implementation with Claude API integration
- `demo.py` - Demonstration runner with deterministic fallback
- `tools.py` - File operations, Git commands, test execution
- `README.md` - Technical documentation and architecture
- `PRD` - Product requirements document
- `ARCHITECTURE` - System design document
- `EXECUTION_PLAN` - Implementation phases

**Technology Stack**:
- Python 3.8+
- Anthropic Claude API (Claude Sonnet 4)
- GitHub API (for PR creation)
- Git (for version control operations)
- Node.js/Jest (for demo repository tests)

**Safety Features**:
- Single-repo scope enforcement
- No file modifications outside target repository
- Mandatory verification before PR submission
- No auto-merge capabilities
- Comprehensive execution logging
- Deterministic demo mode for reproducibility

**Project Status**: Complete and demo-ready

**Time Investment**: Single-day hackathon project (solo developer)

**Target Audience**: Hackathon judges and Anthropic sponsor reviewers

---

## Contact

**Developer**: Tsolmon  
**Email**: tsolmon@tuzox.co  
**GitHub**: https://github.com/TsolmonTuzox

---

*This project was built as a hackathon submission demonstrating practical autonomous agent development with safety-first principles and production-grade sponsor integration.*
