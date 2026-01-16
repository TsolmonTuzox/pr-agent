#!/usr/bin/env node

/**
 * cli.js - CLI entry point for PR Agent
 * Usage: node src/cli.js --repo <url_or_path> --goal "<text>"
 */

const agent = require('./agent');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' && args[i + 1]) {
      parsed.repo = args[i + 1];
      i++;
    } else if (args[i] === '--goal' && args[i + 1]) {
      parsed.goal = args[i + 1];
      i++;
    }
  }
  
  return parsed;
}

/**
 * Validate arguments
 */
function validateArgs(args) {
  if (!args.repo) {
    console.error('Error: --repo is required');
    console.error('Usage: node src/cli.js --repo <url_or_path> --goal "<text>"');
    process.exit(1);
  }
  
  if (!args.goal) {
    console.error('Error: --goal is required');
    console.error('Usage: node src/cli.js --repo <url_or_path> --goal "<text>"');
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  const args = parseArgs();
  validateArgs(args);
  
  try {
    const result = agent.run(args.repo, args.goal);
    
    if (result.status === 'needs_llm') {
      console.log('⏸️  Agent paused for LLM intervention');
      console.log('\nTo continue, call agent.continueWithPatch() with:');
      console.log(JSON.stringify({
        file: result.plan.files[0] || 'unknown',
        oldCode: '<code to replace>',
        newCode: '<new code>',
        summary: '<description>'
      }, null, 2));
      process.exit(0);
    }
    
    if (result.status === 'success') {
      console.log('✅ Done! PR is ready for review.');
      console.log('\nPR Info:');
      console.log('- Owner: ' + result.prInfo.owner);
      console.log('- Repo: ' + result.prInfo.repo);
      console.log('- Branch: ' + result.prInfo.head);
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Error: ' + error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main: main };
