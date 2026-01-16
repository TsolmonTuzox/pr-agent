/**
 * verifier.js - Test execution module
 * Runs tests and captures output
 */

const { execSync } = require('child_process');
const executor = require('./executor');

/**
 * Detect test command from package.json
 */
function detectTestCommand(repoPath) {
  const packagePath = repoPath + '/package.json';
  
  if (!executor.fileExists(packagePath)) {
    return null;
  }
  
  try {
    const packageContent = executor.readFile(packagePath);
    const packageJson = JSON.parse(packageContent);
    
    if (packageJson.scripts && packageJson.scripts.test) {
      return 'npm test';
    }
  } catch (error) {
    // Ignore parse errors
  }
  
  return null;
}

/**
 * Run tests and capture output
 */
function runTests(repoPath) {
  const testCommand = detectTestCommand(repoPath);
  
  if (!testCommand) {
    return {
      success: false,
      output: 'No test command found',
      command: null
    };
  }
  
  try {
    const output = execSync(testCommand, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    
    return {
      success: true,
      output: output,
      command: testCommand
    };
  } catch (error) {
    return {
      success: false,
      output: error.stdout + '\n' + error.stderr,
      command: testCommand
    };
  }
}

module.exports = {
  detectTestCommand: detectTestCommand,
  runTests: runTests
};
