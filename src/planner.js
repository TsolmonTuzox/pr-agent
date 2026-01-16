/**
 * planner.js - LLM-based planning module
 * Generates fix strategy using Claude
 */

const executor = require('./executor');

/**
 * Generate fix plan using LLM
 * This uses Claude (the current conversation context) to analyze and propose fixes
 */
function generatePlan(repoPath, goal, testOutput) {
  // In a real implementation, this would call Claude API
  // For the hackathon demo, we'll use a placeholder that returns
  // a structure that the agent can work with
  
  // Read relevant files based on goal
  const files = findRelevantFiles(repoPath, goal);
  
  if (files.length === 0) {
    throw new Error('No relevant files found for goal: ' + goal);
  }
  
  // Read file contents
  const fileContents = {};
  for (const file of files) {
    fileContents[file] = executor.readFile(file);
  }
  
  // For demo: Return a plan structure
  // In real implementation, LLM would analyze and return this
  return {
    files: files,
    fileContents: fileContents,
    testOutput: testOutput,
    goal: goal,
    needsLLM: true
  };
}

/**
 * Find relevant files based on goal
 */
function findRelevantFiles(repoPath, goal) {
  // Extract file path from goal if mentioned
  const fileMatch = goal.match(/(\w+\/[\w.]+)/);
  
  if (fileMatch) {
    const mentionedFile = repoPath + '/' + fileMatch[1];
    if (executor.fileExists(mentionedFile)) {
      return [mentionedFile];
    }
  }
  
  // Fallback: find test files and source files
  const jsFiles = executor.listFiles(repoPath, '.js');
  const relevantFiles = jsFiles.filter(function(file) {
    return file.indexOf('node_modules') === -1 &&
           file.indexOf('.git') === -1;
  });
  
  return relevantFiles.slice(0, 5); // Limit to 5 files
}

/**
 * Fallback: Deterministic patch for demo
 * Used only if LLM is unavailable
 */
function getFallbackPatch(repoPath, goal) {
  // Specific patch for our demo case
  if (goal.indexOf('utils/date.js') !== -1) {
    const targetFile = repoPath + '/utils/date.js';
    
    return {
      file: targetFile,
      oldCode: '  result.setDate(days);',
      newCode: '  result.setDate(result.getDate() + days);',
      summary: 'Fixed addDays function to correctly add days instead of setting day of month'
    };
  }
  
  return null;
}

module.exports = {
  generatePlan: generatePlan,
  getFallbackPatch: getFallbackPatch
};
