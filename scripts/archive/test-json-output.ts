#!/usr/bin/env tsx

/**
 * Test script to validate JSON output from MCP server
 * This helps ensure no malformed JSON is being sent
 */

import { spawn } from 'child_process';
import { join } from 'path';

async function testMcpJsonOutput() {
  console.log('🧪 Testing MCP Server JSON Output...\n');

  const mcpServerPath = join(process.cwd(), 'src/mcp-server.ts');
  
  // Start the MCP server
  const server = spawn('npx', ['tsx', mcpServerPath], {
    env: {
      ...process.env,
      D6_SANDBOX_MODE: 'true',
      NODE_ENV: 'development'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';

  server.stdout.on('data', (data) => {
    stdoutBuffer += data.toString();
  });

  server.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
  });

  // Test 1: Initialize
  const initRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  });

  server.stdin.write(initRequest + '\n');

  // Test 2: List tools
  const listToolsRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });

  server.stdin.write(listToolsRequest + '\n');

  // Test 3: Call a tool
  const toolCallRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_system_health',
      arguments: {}
    }
  });

  server.stdin.write(toolCallRequest + '\n');

  // Wait a bit for responses
  await new Promise(resolve => setTimeout(resolve, 2000));

  server.kill();

  console.log('📤 STDERR Output (expected):');
  console.log(stderrBuffer);
  console.log('\n📤 STDOUT Output (JSON-RPC):');
  console.log(stdoutBuffer);

  // Validate JSON responses
  console.log('\n🔍 JSON Validation:');
  const lines = stdoutBuffer.split('\n').filter(line => line.trim());
  
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    
    try {
      const parsed = JSON.parse(line);
      console.log(`✅ Line ${index + 1}: Valid JSON`);
      console.log(`   Method: ${parsed.method || 'response'}`);
      console.log(`   ID: ${parsed.id || 'none'}`);
    } catch (error) {
      console.log(`❌ Line ${index + 1}: INVALID JSON`);
      console.log(`   Content: ${line.substring(0, 100)}...`);
      console.log(`   Error: ${error.message}`);
    }
  }
}

testMcpJsonOutput().catch(console.error); 