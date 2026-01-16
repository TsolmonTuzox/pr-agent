/**
 * publisher.js - Git operations and GitHub PR creation
 */

const { execSync } = require('child_process');

/**
 * Create a new branch with timestamp
 */
function createBranch(repoPath) {
  const timestamp = getTimestamp();
  const branchName = 'fix/' + timestamp;
  
  try {
    execSync('git checkout -b ' + branchName, {
      cwd: repoPath,
      stdio: 'pipe'
    });
    
    return branchName;
  } catch (error) {
    throw new Error('Failed to create branch: ' + error.message);
  }
}

/**
 * Commit changes
 */
function commitChanges(repoPath, message) {
  try {
    execSync('git add -A', {
      cwd: repoPath,
      stdio: 'pipe'
    });
    
    execSync('git commit -m "' + message + '"', {
      cwd: repoPath,
      stdio: 'pipe'
    });
    
    return true;
  } catch (error) {
    throw new Error('Failed to commit: ' + error.message);
  }
}

/**
 * Push branch to remote
 */
function pushBranch(repoPath, branchName) {
  try {
    execSync('git push -u origin ' + branchName, {
      cwd: repoPath,
      stdio: 'pipe'
    });
    
    return true;
  } catch (error) {
    throw new Error('Failed to push branch: ' + error.message);
  }
}

/**
 * Get repository owner and name from remote URL
 */
function getRepoInfo(repoPath) {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: repoPath,
      encoding: 'utf8'
    }).trim();
    
    // Parse GitHub URL: https://github.com/owner/repo.git or git@github.com:owner/repo.git
    let match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    
    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
    
    throw new Error('Could not parse repository info from: ' + remoteUrl);
  } catch (error) {
    throw new Error('Failed to get repo info: ' + error.message);
  }
}

/**
 * Get current timestamp for branch naming
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return year + month + day + '-' + hour + minute + second;
}

/**
 * Create GitHub PR
 * Note: This is a placeholder that returns the structure needed
 * The actual PR creation will be done via Claude's tools
 */
function createPullRequest(repoInfo, branchName, title, body) {
  return {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    head: branchName,
    base: 'main',
    title: title,
    body: body
  };
}

module.exports = {
  createBranch: createBranch,
  commitChanges: commitChanges,
  pushBranch: pushBranch,
  getRepoInfo: getRepoInfo,
  createPullRequest: createPullRequest
};
