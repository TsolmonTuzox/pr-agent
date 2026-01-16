/**
 * agent.js - Main agent orchestrator
 * Implements observe → plan → act → verify → submit loop
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const executor = require('./executor');
const verifier = require('./verifier');
const planner = require('./planner');
const publisher = require('./publisher');

/**
 * Main agent execution
 */
function run(repoUrl, goal) {
  console.log('\n🤖 PR Agent Starting...\n');
  console.log('📦 Repository: ' + repoUrl);
  console.log('🎯 Goal: ' + goal + '\n');
  
  let workDir = null;
  let repoPath = null;
  
  try {
    // Step 1: Clone or open repository
    console.log('[1/7] 🔍 Cloning repository...');
    const cloneResult = cloneRepository(repoUrl);
    repoPath = cloneResult.repoPath;
    workDir = cloneResult.workDir;
    console.log('✓ Repository cloned to ' + repoPath + '\n');
    
    // Step 2: Run baseline tests
    console.log('[2/7] 🧪 Running baseline tests...');
    const baselineResult = verifier.runTests(repoPath);
    console.log('✓ Tests captured (' + (baselineResult.success ? 'passing' : 'failing') + ')\n');
    
    // Step 3: Generate plan and try fallback patch
    console.log('[3/7] 🧠 Analyzing and planning fix...');
    const fallbackPatch = planner.getFallbackPatch(repoPath, goal);
    
    if (!fallbackPatch) {
      console.log('⚠️  LLM intervention required');
      const plan = planner.generatePlan(repoPath, goal, baselineResult.output);
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
    }
    
    console.log('✓ Plan generated: ' + fallbackPatch.summary + '\n');
    
    // Step 4: Apply fix
    console.log('[4/7] ⚙️  Applying fix...');
    executor.applyChanges(fallbackPatch.file, fallbackPatch.oldCode, fallbackPatch.newCode);
    console.log('✓ File modified: ' + path.basename(fallbackPatch.file) + '\n');
    
    // Step 5: Verify fix
    console.log('[5/7] 🧪 Verifying fix...');
    const verifyResult = verifier.runTests(repoPath);
    console.log('✓ Tests ' + (verifyResult.success ? 'now passing' : 'still failing') + '\n');
    
    // Step 6: Commit and push
    console.log('[6/7] 📤 Committing and pushing...');
    const branchName = publisher.createBranch(repoPath);
    console.log('✓ Branch created: ' + branchName);
    
    publisher.commitChanges(repoPath, fallbackPatch.summary);
    console.log('✓ Changes committed');
    
    publisher.pushBranch(repoPath, branchName);
    console.log('✓ Pushed to GitHub\n');
    
    // Step 7: Prepare PR data
    console.log('[7/7] 🎉 Preparing pull request...');
    const repoInfo = publisher.getRepoInfo(repoPath);
    const prBody = createPRBody(fallbackPatch, baselineResult, verifyResult);
    const prData = publisher.createPullRequestActual(
      repoInfo,
      branchName,
      'Fix: ' + fallbackPatch.summary,
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
    
  } catch (error) {
    // Keep workDir on error for debugging
    console.error('\n❌ Error occurred. Workspace preserved at: ' + workDir);
    throw error;
  }
}

/**
 * Clone repository to temp directory
 */
function cloneRepository(repoUrl) {
  const timestamp = Date.now();
  const repoName = path.basename(repoUrl, '.git');
  const workDir = '/tmp/pr-agent-work/' + repoName + '-' + timestamp;
  const repoPath = workDir + '/' + repoName;
  
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
  let body = '## Summary\n\n' + patch.summary + '\n\n';
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
