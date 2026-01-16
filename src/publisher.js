/**
 * publisher.js - Git operations and GitHub PR creation
 */

const { execSync } = require('child_process');
const fs = require('fs');

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
    
    // Parse GitHub URL
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
 * Create GitHub PR using curl and GitHub API
 */
function createPullRequestActual(repoInfo, branchName, title, body) {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable not set');
  }
  
  // Escape body for JSON
  const escapedBody = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  
  // Create JSON payload file
  const payloadPath = '/tmp/pr-payload-' + Date.now() + '.json';
  const payload = {
    title: escapedTitle,
    body: escapedBody,
    head: branchName,
    base: 'main'
  };
  
  fs.writeFileSync(payloadPath, JSON.stringify(payload));
  
  try {
    const apiUrl = 'https://api.github.com/repos/' + repoInfo.owner + '/' + repoInfo.repo + '/pulls';
    
    const curlCommand = 'curl -s -X POST ' +
      '-H "Authorization: token ' + token + '" ' +
      '-H "Accept: application/vnd.github.v3+json" ' +
      '-d @' + payloadPath + ' ' +
      apiUrl;
    
    const response = execSync(curlCommand, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Clean up payload file
    try {
      fs.unlinkSync(payloadPath);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    const prData = JSON.parse(response);
    
    if (prData.html_url) {
      return prData.html_url;
    }
    
    if (prData.message) {
      throw new Error('GitHub API error: ' + prData.message);
    }
    
    throw new Error('Failed to create PR: ' + response);
    
  } catch (error) {
    // Clean up payload file
    try {
      fs.unlinkSync(payloadPath);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    throw new Error('Failed to create PR: ' + error.message);
  }
}

module.exports = {
  createBranch: createBranch,
  commitChanges: commitChanges,
  pushBranch: pushBranch,
  getRepoInfo: getRepoInfo,
  createPullRequestActual: createPullRequestActual
};
