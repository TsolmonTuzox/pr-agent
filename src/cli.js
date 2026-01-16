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
    
    if (result.status === 'success') {
      console.log('✅ Agent execution complete!');
      console.log('\nPR Data:');
      console.log(JSON.stringify(result.prData, null, 2));
      console.log('\nReady for PR creation via GitHub API');
      process.exit(0);
    }
    
    if (result.status === 'verify_failed') {
      console.log('\n❌ Verification failed. Tests did not pass after applying fix.');
      console.log('No PR will be created.');
      process.exit(1);
    }
    
    if (result.status === 'needs_llm') {
      console.log('⚠️  No fallback patch available. LLM intervention required.');
      process.exit(1);
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
