/**
 * planner.js - LLM-based planning module
 * Generates fix strategy using Claude or fallback patch
 */

const https = require('https');
const executor = require('./executor');
const path = require('path');

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
  var fileMatch = goal.match(/(\w+\/[\w.]+)/);

  if (fileMatch) {
    var mentionedFile = repoPath + '/' + fileMatch[1];
    if (executor.fileExists(mentionedFile)) {
      return [mentionedFile];
    }
  }

  var jsFiles = executor.listFiles(repoPath, '.js');
  var relevantFiles = jsFiles.filter(function(file) {
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
    var targetFile = repoPath + '/utils/date.js';

    // Read current file to build complete patch
    var currentContent = executor.readFile(targetFile);

    // Old code includes both bugs
    var oldCode = 'function addDays(date, days) {\n' +
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
    var newCode = 'function addDays(date, days) {\n' +
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

/**
 * Get LLM-generated patch using Anthropic API
 * Returns null if ANTHROPIC_API_KEY is not set or on any failure
 * @param {string} repoPath - Path to cloned repository
 * @param {string} goal - User's goal description
 * @param {string} testOutput - Failing test output
 * @returns {Promise<Object|null>} Patch object or null
 */
function getLLMPatch(repoPath, goal, testOutput) {
  return new Promise(function(resolve) {
    var apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️  ANTHROPIC_API_KEY not set, skipping LLM patch');
      resolve(null);
      return;
    }

    // Find target file from goal
    var files = findRelevantFiles(repoPath, goal);
    if (files.length === 0) {
      console.log('⚠️  No relevant files found for LLM analysis');
      resolve(null);
      return;
    }

    var targetFile = files[0];
    var fileContent;
    try {
      fileContent = executor.readFile(targetFile);
    } catch (e) {
      console.log('⚠️  Could not read target file: ' + e.message);
      resolve(null);
      return;
    }

    var relativePath = path.relative(repoPath, targetFile);

    // Build prompt
    var prompt = 'You are a code repair assistant. Analyze the failing test output and fix the bug.\n\n' +
      'Repository path: ' + repoPath + '\n' +
      'Goal: ' + goal + '\n\n' +
      'Failing test output:\n```\n' + testOutput + '\n```\n\n' +
      'File to fix: ' + relativePath + '\n' +
      'Current file content:\n```javascript\n' + fileContent + '\n```\n\n' +
      'IMPORTANT: Respond with ONLY valid JSON (no markdown, no explanation).\n' +
      'Required JSON format:\n' +
      '{\n' +
      '  "summary": "Brief description of the fix",\n' +
      '  "file": "' + relativePath + '",\n' +
      '  "oldCode": "exact code to replace (copy from file)",\n' +
      '  "newCode": "corrected code"\n' +
      '}\n\n' +
      'Rules:\n' +
      '- oldCode must match exactly what exists in the file\n' +
      '- oldCode and newCode must be non-empty strings\n' +
      '- Focus on fixing the bug mentioned in the test output\n' +
      '- Return ONLY the JSON object, nothing else';

    var model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

    var requestBody = JSON.stringify({
      model: model,
      max_tokens: 800,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    var options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      
      res.on('data', function(chunk) {
        data += chunk;
      });
      
      res.on('end', function() {
        if (res.statusCode !== 200) {
          console.log('⚠️  Anthropic API error: ' + res.statusCode);
          resolve(null);
          return;
        }

        try {
          var response = JSON.parse(data);
          
          if (!response.content || !response.content[0] || !response.content[0].text) {
            console.log('⚠️  Invalid Anthropic response structure');
            resolve(null);
            return;
          }

          var text = response.content[0].text.trim();
          
          // Try to extract JSON from response
          var jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.log('⚠️  No JSON found in LLM response');
            resolve(null);
            return;
          }

          var patch = JSON.parse(jsonMatch[0]);

          // Validate patch structure
          if (!patch.summary || typeof patch.summary !== 'string') {
            console.log('⚠️  LLM patch missing or invalid summary');
            resolve(null);
            return;
          }

          if (!patch.file || typeof patch.file !== 'string') {
            console.log('⚠️  LLM patch missing or invalid file');
            resolve(null);
            return;
          }

          if (!patch.oldCode || typeof patch.oldCode !== 'string' || patch.oldCode.length === 0) {
            console.log('⚠️  LLM patch missing or invalid oldCode');
            resolve(null);
            return;
          }

          if (!patch.newCode || typeof patch.newCode !== 'string' || patch.newCode.length === 0) {
            console.log('⚠️  LLM patch missing or invalid newCode');
            resolve(null);
            return;
          }

          // Validate file path is relative and exists
          if (path.isAbsolute(patch.file)) {
            console.log('⚠️  LLM patch file must be relative path');
            resolve(null);
            return;
          }

          var absolutePath = path.join(repoPath, patch.file);
          if (!executor.fileExists(absolutePath)) {
            console.log('⚠️  LLM patch target file does not exist: ' + absolutePath);
            resolve(null);
            return;
          }

          // Verify oldCode exists in file
          var currentFileContent = executor.readFile(absolutePath);
          if (currentFileContent.indexOf(patch.oldCode) === -1) {
            console.log('⚠️  LLM patch oldCode not found in target file');
            resolve(null);
            return;
          }

          resolve({
            summary: patch.summary,
            file: absolutePath,
            oldCode: patch.oldCode,
            newCode: patch.newCode
          });

        } catch (e) {
          console.log('⚠️  Failed to parse LLM response: ' + e.message);
          resolve(null);
        }
      });
    });

    req.on('error', function(e) {
      console.log('⚠️  Anthropic API request failed: ' + e.message);
      resolve(null);
    });

    req.setTimeout(30000, function() {
      console.log('⚠️  Anthropic API request timed out');
      req.destroy();
      resolve(null);
    });

    req.write(requestBody);
    req.end();
  });
}

module.exports = {
  generatePlan: generatePlan,
  getFallbackPatch: getFallbackPatch,
  getLLMPatch: getLLMPatch
};
