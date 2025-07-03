#!/usr/bin/env tsx

/**
 * Test script to validate both sandbox and production modes
 */

import { spawn } from 'child_process';
import { join } from 'path';

async function testMcpModes() {
  console.log('🧪 Testing MCP Server Modes\n');

  const modes = [
    {
      name: 'Sandbox Mode',
      env: { D6_SANDBOX_MODE: 'true' },
      script: 'src/mcp-server.ts'
    },
    {
      name: 'Production Mode', 
      env: { D6_PRODUCTION_MODE: 'true' },
      script: 'src/mcp-server-hybrid.ts'
    }
  ];

  for (const mode of modes) {
    console.log(`\n🔍 Testing ${mode.name}:`);
    console.log('='.repeat(50));

    const server = spawn('npx', ['tsx', mode.script], {
      env: {
        ...process.env,
        ...mode.env,
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

    // Test 2: Get system health
    const healthRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_system_health',
        arguments: {}
      }
    });

    server.stdin.write(healthRequest + '\n');

    // Test 3: Get integration info
    const infoRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_integration_info',
        arguments: {}
      }
    });

    server.stdin.write(infoRequest + '\n');

    // Test 4: Get schools
    const schoolsRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_schools',
        arguments: {}
      }
    });

    server.stdin.write(schoolsRequest + '\n');

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 3000));

    server.kill();

    console.log(`📊 ${mode.name} Results:`);
    console.log('STDERR:', stderrBuffer.substring(0, 500));
    
    // Validate JSON responses
    const lines = stdoutBuffer.split('\n').filter(line => line.trim());
    console.log(`📤 JSON Responses: ${lines.length}`);
    
    let validResponses = 0;
    for (const [index, line] of lines.entries()) {
      if (!line.trim()) continue;
      
      try {
        const parsed = JSON.parse(line);
        validResponses++;
        console.log(`✅ Response ${index + 1}: Valid (ID: ${parsed.id})`);
      } catch (error) {
        console.log(`❌ Response ${index + 1}: Invalid JSON`);
      }
    }
    
    console.log(`📈 Summary: ${validResponses}/${lines.length} valid responses`);
  }

  console.log('\n🎯 Recommendations:');
  console.log('1. Use sandbox mode for development and testing');
  console.log('2. Use production mode to access real D6 school data');
  console.log('3. Hybrid mode automatically falls back to sandbox when D6 is unavailable');
  console.log('4. Update Claude Desktop config to use desired mode');
}

testMcpModes().catch(console.error); 