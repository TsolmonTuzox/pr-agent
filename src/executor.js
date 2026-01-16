/**
 * executor.js - File operations module
 * Handles reading and writing files
 */

const fs = require('fs');
const path = require('path');

/**
 * Read file contents
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error('Failed to read file ' + filePath + ': ' + error.message);
  }
}

/**
 * Write file contents
 */
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error('Failed to write file ' + filePath + ': ' + error.message);
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * List files in directory recursively
 */
function listFiles(dirPath, extension) {
  const results = [];
  
  function walk(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          walk(filePath);
        }
      } else {
        if (!extension || filePath.endsWith(extension)) {
          results.push(filePath);
        }
      }
    }
  }
  
  walk(dirPath);
  return results;
}

/**
 * Apply code changes to a file
 */
function applyChanges(filePath, oldCode, newCode) {
  const content = readFile(filePath);
  
  if (content.indexOf(oldCode) === -1) {
    throw new Error('Old code not found in file: ' + filePath);
  }
  
  const newContent = content.replace(oldCode, newCode);
  writeFile(filePath, newContent);
  
  return true;
}

module.exports = {
  readFile: readFile,
  writeFile: writeFile,
  fileExists: fileExists,
  listFiles: listFiles,
  applyChanges: applyChanges
};
