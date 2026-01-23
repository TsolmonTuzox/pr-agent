/**
 * publisher.js - Git operations and GitHub PR creation
 * Uses external tools for PR creation (called from agent context)
 */

const { execSync } = require('child_process');
const https = require('https');

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
 * Create PR info for external tool usage
 * Returns the data structure needed for PR creation
 */
function createPullRequestData(repoInfo, branchName, title, body) {
  // Return info that will be used by external PR creation
  return {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    head: branchName,
    base: 'main',
    title: title,
    body: body
  };
}

/**
 * Create Pull Request via GitHub API
 * @param {Object} repoInfo - Repository info with owner and repo
 * @param {string} branchName - Branch name to create PR from
 * @param {string} title - PR title
 * @param {string} body - PR body/description
 * @returns {Promise<Object>} Promise that resolves to PR data or null
 */
function createPullRequestActual(repoInfo, branchName, title, body) {
  return new Promise(function(resolve) {
    var token = process.env.GITHUB_TOKEN;

    // Graceful fallback: if no token, return data structure only
    if (!token) {
      console.log('⚠️  GITHUB_TOKEN not set, returning PR data only (manual creation required)');
      resolve({
        prData: createPullRequestData(repoInfo, branchName, title, body),
        url: null,
        createdViaAPI: false
      });
      return;
    }

    // Prepare GitHub API request
    var requestBody = JSON.stringify({
      title: title,
      head: branchName,
      base: 'main',
      body: body
    });

    var options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/repos/' + repoInfo.owner + '/' + repoInfo.repo + '/pulls',
      method: 'POST',
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'pr-agent',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';

      res.on('data', function(chunk) {
        data += chunk;
      });

      res.on('end', function() {
        if (res.statusCode === 201) {
          // PR created successfully
          try {
            var response = JSON.parse(data);
            resolve({
              prData: createPullRequestData(repoInfo, branchName, title, body),
              url: response.html_url,
              number: response.number,
              createdViaAPI: true
            });
          } catch (e) {
            console.log('⚠️  Failed to parse GitHub API response: ' + e.message);
            resolve({
              prData: createPullRequestData(repoInfo, branchName, title, body),
              url: null,
              createdViaAPI: false
            });
          }
        } else {
          // API error - log details and fallback
          console.log('⚠️  GitHub API error: ' + res.statusCode);
          try {
            var errBody = JSON.parse(data);
            if (errBody.message) {
              console.log('⚠️  Error details: ' + errBody.message);
            }
            if (errBody.errors) {
              console.log('⚠️  Errors: ' + JSON.stringify(errBody.errors));
            }
          } catch (e) {
            // Ignore parse errors
          }
          resolve({
            prData: createPullRequestData(repoInfo, branchName, title, body),
            url: null,
            createdViaAPI: false
          });
        }
      });
    });

    req.on('error', function(e) {
      console.log('⚠️  GitHub API request failed: ' + e.message);
      resolve({
        prData: createPullRequestData(repoInfo, branchName, title, body),
        url: null,
        createdViaAPI: false
      });
    });

    req.setTimeout(30000, function() {
      console.log('⚠️  GitHub API request timed out');
      req.destroy();
      resolve({
        prData: createPullRequestData(repoInfo, branchName, title, body),
        url: null,
        createdViaAPI: false
      });
    });

    req.write(requestBody);
    req.end();
  });
}

module.exports = {
  createBranch: createBranch,
  commitChanges: commitChanges,
  pushBranch: pushBranch,
  getRepoInfo: getRepoInfo,
  createPullRequestData: createPullRequestData,
  createPullRequestActual: createPullRequestActual
};
