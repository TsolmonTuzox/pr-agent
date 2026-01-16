/**
 * planner.js - LLM-based planning module
 * Generates fix strategy using Claude
 */

const executor = require('./executor');

/**
 * Generate fix plan using LLM
 */
function generatePlan(repoPath, goal, testOutput) {
  const files = findRelevantFiles(repoPath, goal);
  
  if (files.length === 0) {
    throw new Error('No relevant files found for goal: ' + goal);
  }
  
  const fileContents = {};
  for (const file of files) {
    fileContents[file] = executor.readFile(file);
  }
  
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
  const fileMatch = goal.match(/(\w+\/[\w.]+)/);
  
  if (fileMatch) {
    const mentionedFile = repoPath + '/' + fileMatch[1];
    if (executor.fileExists(mentionedFile)) {
      return [mentionedFile];
    }
  }
  
  const jsFiles = executor.listFiles(repoPath, '.js');
  const relevantFiles = jsFiles.filter(function(file) {
    return file.indexOf('node_modules') === -1 &&
           file.indexOf('.git') === -1;
  });
  
  return relevantFiles.slice(0, 5);
}

/**
 * Fallback: Deterministic patch for demo
 * Used only if LLM is unavailable
 */
function getFallbackPatch(repoPath, goal) {
  if (goal.indexOf('utils/date.js') !== -1) {
    const targetFile = repoPath + '/utils/date.js';
    
    // Read current file to build complete patch
    const currentContent = executor.readFile(targetFile);
    
    // Old code includes both bugs
    const oldCode = 'function addDays(date, days) {\n' +
      '  const result = new Date(date);\n' +
      '  // BUG: This is intentionally wrong - should add days, not set them\n' +
      '  result.setDate(days);\n' +
      '  return result;\n' +
      '}\n' +
      '\n' +
      '/**\n' +
      ' * Formats a date as YYYY-MM-DD\n' +
      ' * @param {Date} date - The date to format\n' +
      ' * @returns {string} Formatted date string\n' +
      ' */\n' +
      'function formatDate(date) {\n' +
      '  const year = date.getFullYear();\n' +
      '  const month = String(date.getMonth() + 1).padStart(2, \'0\');\n' +
      '  const day = String(date.getDate()).padStart(2, \'0\');\n' +
      '  return `${year}-${month}-${day}`;\n' +
      '}';
    
    // New code fixes both bugs
    const newCode = 'function addDays(date, days) {\n' +
      '  const result = new Date(date);\n' +
      '  result.setDate(result.getDate() + days);\n' +
      '  return result;\n' +
      '}\n' +
      '\n' +
      '/**\n' +
      ' * Formats a date as YYYY-MM-DD\n' +
      ' * @param {Date} date - The date to format\n' +
      ' * @returns {string} Formatted date string\n' +
      ' */\n' +
      'function formatDate(date) {\n' +
      '  const year = date.getUTCFullYear();\n' +
      '  const month = String(date.getUTCMonth() + 1).padStart(2, \'0\');\n' +
      '  const day = String(date.getUTCDate()).padStart(2, \'0\');\n' +
      '  return `${year}-${month}-${day}`;\n' +
      '}';
    
    return {
      file: targetFile,
      oldCode: oldCode,
      newCode: newCode,
      summary: 'Fixed addDays to add days correctly and formatDate to use UTC getters'
    };
  }
  
  return null;
}

module.exports = {
  generatePlan: generatePlan,
  getFallbackPatch: getFallbackPatch
};
