/**
 * agent.js - Main agent orchestrator
 * Implements observe → plan → act → verify → submit loop
 */

var execSync = require('child_process').execSync;
var path = require('path');
var fs = require('fs');
var executor = require('./executor');
var verifier = require('./verifier');
var planner = require('./planner');
var publisher = require('./publisher');

/**
 * Main agent execution
 */
function run(repoUrl, goal) {
  console.log('\n🤖 PR Agent Starting...\n');
  console.log('📦 Repository: ' + repoUrl);
  console.log('🎯 Goal: ' + goal + '\n');

  var workDir = null;
  var repoPath = null;

  // Clone and setup
  console.log('[1/7] 🔍 Cloning repository...');
  var cloneResult = cloneRepository(repoUrl);
  repoPath = cloneResult.repoPath;
  workDir = cloneResult.workDir;
  console.log('✓ Repository cloned to ' + repoPath + '\n');

  // Run baseline tests
  console.log('[2/7] 🧪 Running baseline tests...');
  var baselineResult = verifier.runTests(repoPath);
  console.log('✓ Tests captured (' + (baselineResult.success ? 'passing' : 'failing') + ')\n');

  // Generate plan - try fallback patch first for demo reliability
  console.log('[3/7] 🧠 Analyzing and planning fix...');
  var fallbackPatch = planner.getFallbackPatch(repoPath, goal);

  if (fallbackPatch) {
    // Demo path: use deterministic fallback patch
    console.log('✓ Plan generated (fallback): ' + fallbackPatch.summary + '\n');
    return executeWithPatch(fallbackPatch, repoPath, workDir, baselineResult);
  }

  // No fallback patch available - try LLM if configured
  console.log('⚠️  No fallback patch available, checking LLM...');
  
  return planner.getLLMPatch(repoPath, goal, baselineResult.output)
    .then(function(llmPatch) {
      if (llmPatch) {
        console.log('✓ Plan generated (LLM): ' + llmPatch.summary + '\n');
        return executeWithPatch(llmPatch, repoPath, workDir, baselineResult);
      }

      // No LLM patch either - return needs_llm status
      console.log('⚠️  LLM intervention required (no API key or LLM failed)');
      var plan = planner.generatePlan(repoPath, goal, baselineResult.output);
      console.log('\nPlease provide the fix patch:');
      console.log('- Target file: ' + (plan.files[0] || 'unknown'));
      console.log('- Test output:\n' + baselineResult.output + '\n');

      return {
        status: 'needs_llm',
        plan: plan,
        repoPath: repoPath,
        workDir: workDir,
        baselineResult: baselineResult
      };
    })
    .catch(function(error) {
      console.error('\n❌ Error occurred. Workspace preserved at: ' + workDir);
      throw error;
    });
}

/**
 * Execute the agent with a given patch (fallback or LLM)
 * @param {Object} patch - Patch with file, oldCode, newCode, summary
 * @param {string} repoPath - Path to repository
 * @param {string} workDir - Working directory
 * @param {Object} baselineResult - Baseline test results
 * @returns {Object} Execution result
 */
function executeWithPatch(patch, repoPath, workDir, baselineResult) {
  // Step 4: Apply fix
  console.log('[4/7] ⚙️  Applying fix...');
  executor.applyChanges(patch.file, patch.oldCode, patch.newCode);
  console.log('✓ File modified: ' + path.basename(patch.file) + '\n');

  // Step 5: Verify fix
  console.log('[5/7] 🧪 Verifying fix...');
  var verifyResult = verifier.runTests(repoPath);

  if (!verifyResult.success) {
    console.log('✗ Tests still failing\n');
    console.log('Verification output:\n' + verifyResult.output);

    // SAFETY GATE: No commit, no push, no PR if tests fail
    // Clean up on verification failure
    if (workDir && fs.existsSync(workDir)) {
      try {
        execSync('rm -rf ' + workDir, { stdio: 'pipe' });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return {
      status: 'verify_failed',
      output: verifyResult.output
    };
  }

  console.log('✓ Tests now passing (' + (baselineResult.success ? 'still passing' : 'fixed') + ')\n');

  // Step 6: Commit and push
  console.log('[6/7] 📤 Committing and pushing...');
  var branchName = publisher.createBranch(repoPath);
  console.log('✓ Branch created: ' + branchName);

  publisher.commitChanges(repoPath, patch.summary);
  console.log('✓ Changes committed');

  publisher.pushBranch(repoPath, branchName);
  console.log('✓ Pushed to GitHub\n');

  // Step 7: Prepare PR data
  console.log('[7/7] 🎉 Preparing pull request...');
  var repoInfo = publisher.getRepoInfo(repoPath);
  var prBody = createPRBody(patch, baselineResult, verifyResult);
  var prData = publisher.createPullRequestActual(
    repoInfo,
    branchName,
    'Fix: ' + patch.summary,
    prBody
  );
  console.log('✓ PR data prepared\n');

  // Clean up on success
  if (workDir && fs.existsSync(workDir)) {
    try {
      execSync('rm -rf ' + workDir, { stdio: 'pipe' });
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  return {
    status: 'success',
    prData: prData,
    branchName: branchName,
    repoInfo: repoInfo
  };
}

/**
 * Clone repository to temp directory
 */
function cloneRepository(repoUrl) {
  var timestamp = Date.now();
  var repoName = path.basename(repoUrl, '.git');
  var workDir = '/tmp/pr-agent-work/' + repoName + '-' + timestamp;
  var repoPath = workDir + '/' + repoName;

  // Create work directory
  execSync('mkdir -p ' + workDir, { stdio: 'pipe' });

  // Check if it's a URL or local path
  if (repoUrl.startsWith('http') || repoUrl.startsWith('git@')) {
    // Clone from remote
    execSync('git clone ' + repoUrl + ' ' + repoPath, { stdio: 'pipe' });
  } else {
    // Copy from local path
    execSync('cp -r ' + repoUrl + ' ' + repoPath, { stdio: 'pipe' });
  }

  return {
    repoPath: repoPath,
    workDir: workDir
  };
}

/**
 * Create PR body with before/after test output
 */
function createPRBody(patch, baselineResult, verifyResult) {
  var body = '## Summary\n\n' + patch.summary + '\n\n';
  body += '## Changes\n\n';
  body += '- File: `' + path.basename(patch.file) + '`\n\n';
  body += '## Test Results\n\n';
  body += '### Before\n```\n' + baselineResult.output + '\n```\n\n';
  body += '### After\n```\n' + verifyResult.output + '\n```\n';

  return body;
}

module.exports = {
  run: run
};
