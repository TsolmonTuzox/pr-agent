#!/usr/bin/env node

/**
 * server.js - HTTP wrapper for PR Agent CLI
 * Allows Retool and other tools to trigger PR Agent via REST API
 * 
 * POST /run
 * Body: { "repo": "<url>", "goal": "<text>" }
 * Response: { "status": "...", "logs": "...", "prData": {...} }
 */

var http = require('http');
var spawn = require('child_process').spawn;
var path = require('path');

var PORT = process.env.PORT || 8787;

/**
 * Parse JSON body from request
 */
function parseBody(req, callback) {
  var body = '';
  req.on('data', function(chunk) {
    body += chunk.toString();
  });
  req.on('end', function() {
    try {
      var parsed = body ? JSON.parse(body) : {};
      callback(null, parsed);
    } catch (e) {
      callback(new Error('Invalid JSON: ' + e.message), null);
    }
  });
}

/**
 * Send JSON response
 */
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Extract PR Data JSON from logs
 */
function extractPRData(logs) {
  var marker = 'PR Data:';
  var idx = logs.indexOf(marker);
  if (idx === -1) {
    return null;
  }

  var afterMarker = logs.substring(idx + marker.length);
  var jsonMatch = afterMarker.match(/\{[\s\S]*?\n\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    return null;
  }
}

/**
 * Determine status from logs
 */
function determineStatus(logs, exitCode) {
  if (logs.indexOf('Agent execution complete') !== -1) {
    return 'success';
  }
  if (logs.indexOf('verify_failed') !== -1 || logs.indexOf('Verification failed') !== -1) {
    return 'verify_failed';
  }
  if (logs.indexOf('needs_llm') !== -1 || logs.indexOf('LLM intervention required') !== -1) {
    return 'needs_llm';
  }
  if (exitCode !== 0) {
    return 'error';
  }
  return 'success';
}

/**
 * Run PR Agent CLI
 */
function runAgent(repo, goal, callback) {
  var cliPath = path.join(__dirname, 'cli.js');
  var args = ['--repo', repo, '--goal', goal];
  
  var proc = spawn('node', [cliPath].concat(args), {
    cwd: path.dirname(__dirname),
    env: process.env
  });

  var logs = '';

  proc.stdout.on('data', function(data) {
    logs += data.toString();
  });

  proc.stderr.on('data', function(data) {
    logs += data.toString();
  });

  proc.on('close', function(code) {
    var status = determineStatus(logs, code);
    var prData = extractPRData(logs);

    callback(null, {
      status: status,
      logs: logs,
      prData: prData
    });
  });

  proc.on('error', function(err) {
    callback(err, null);
  });
}

/**
 * Handle POST /run
 */
function handleRun(req, res) {
  parseBody(req, function(err, body) {
    if (err) {
      sendJSON(res, 400, { error: err.message });
      return;
    }

    // Validate input
    if (!body.repo || typeof body.repo !== 'string') {
      sendJSON(res, 400, { error: 'Missing or invalid "repo" field' });
      return;
    }

    if (!body.goal || typeof body.goal !== 'string') {
      sendJSON(res, 400, { error: 'Missing or invalid "goal" field' });
      return;
    }

    console.log('[' + new Date().toISOString() + '] Running agent:');
    console.log('  repo: ' + body.repo);
    console.log('  goal: ' + body.goal);

    runAgent(body.repo, body.goal, function(err, result) {
      if (err) {
        console.log('[' + new Date().toISOString() + '] Agent error: ' + err.message);
        sendJSON(res, 500, {
          status: 'error',
          logs: err.message,
          prData: null
        });
        return;
      }

      console.log('[' + new Date().toISOString() + '] Agent complete: ' + result.status);
      sendJSON(res, 200, result);
    });
  });
}

/**
 * Main request handler
 */
function handleRequest(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    sendJSON(res, 200, {});
    return;
  }

  // Route: POST /run
  if (req.method === 'POST' && req.url === '/run') {
    handleRun(req, res);
    return;
  }

  // Route: GET / (health check)
  if (req.method === 'GET' && req.url === '/') {
    sendJSON(res, 200, {
      service: 'PR Agent API',
      version: '1.0.0',
      endpoints: {
        'POST /run': 'Run PR Agent with { repo, goal }'
      }
    });
    return;
  }

  // 404 for unknown routes
  sendJSON(res, 404, { error: 'Not found' });
}

/**
 * Start server
 */
var server = http.createServer(handleRequest);

server.listen(PORT, function() {
  console.log('');
  console.log('🚀 PR Agent API Server');
  console.log('========================');
  console.log('Port: ' + PORT);
  console.log('Endpoint: POST /run');
  console.log('');
  console.log('Test with:');
  console.log('  curl -X POST http://localhost:' + PORT + '/run \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"repo":"https://github.com/TsolmonTuzox/pr-agent-demo","goal":"Fix the failing test in utils/date.js"}\'');
  console.log('');
});
