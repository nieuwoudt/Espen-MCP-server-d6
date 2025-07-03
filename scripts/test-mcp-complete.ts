#!/usr/bin/env tsx
// 🧪 Comprehensive MCP Server Test

import { spawn } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

class MCPTester {
  private process: any;
  private requestId = 1;

  async startServer(): Promise<void> {
    console.log('🚀 Starting MCP server...\n');
    
    this.process = spawn('npx', ['tsx', 'src/mcp-server.ts'], {
      env: {
        ...process.env,
        D6_PRODUCTION_MODE: 'true',
        D6_API_BASE_URL: 'https://integrate.d6plus.co.za/api/v2',
        D6_API_USERNAME: 'espenaitestapi',
        D6_API_PASSWORD: 'qUz3mPcRsfSWxKR9qEnm'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async sendRequest(method: string, params?: any): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let response = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      this.process.stdout.on('data', (data: Buffer) => {
        response += data.toString();
        try {
          const parsed = JSON.parse(response);
          clearTimeout(timeout);
          resolve(parsed);
        } catch (e) {
          // Not complete JSON yet, continue reading
        }
      });

      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testListTools(): Promise<boolean> {
    console.log('📋 Testing list_tools...');
    try {
      const response = await this.sendRequest('tools/list');
      
      if (response.error) {
        console.log('❌ Error:', response.error);
        return false;
      }

      const tools = response.result?.tools || [];
      console.log(`✅ Found ${tools.length} tools:`);
      tools.forEach((tool: any, index: number) => {
        console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
      });
      
      return tools.length > 0;
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
      return false;
    }
  }

  async testGetSchools(): Promise<boolean> {
    console.log('\n🏫 Testing get_schools...');
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'get_schools',
        arguments: {}
      });

      if (response.error) {
        console.log('❌ Error:', response.error);
        return false;
      }

      const content = response.result?.content?.[0]?.text;
      if (content) {
        console.log('✅ Schools data received:');
        console.log(content.substring(0, 200) + '...');
        return true;
      }

      return false;
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
      return false;
    }
  }

  async testGetSystemHealth(): Promise<boolean> {
    console.log('\n🏥 Testing get_system_health...');
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'get_system_health',
        arguments: {}
      });

      if (response.error) {
        console.log('❌ Error:', response.error);
        return false;
      }

      const content = response.result?.content?.[0]?.text;
      if (content) {
        console.log('✅ Health check data received:');
        console.log(content.substring(0, 300) + '...');
        return true;
      }

      return false;
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
      return false;
    }
  }

  async testGetIntegrationInfo(): Promise<boolean> {
    console.log('\n🔗 Testing get_integration_info...');
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'get_integration_info',
        arguments: {}
      });

      if (response.error) {
        console.log('❌ Error:', response.error);
        return false;
      }

      const content = response.result?.content?.[0]?.text;
      if (content) {
        console.log('✅ Integration info received:');
        console.log(content.substring(0, 300) + '...');
        return true;
      }

      return false;
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.process) {
      this.process.kill();
    }
  }

  async runAllTests(): Promise<void> {
    const results: boolean[] = [];

    try {
      await this.startServer();

      results.push(await this.testListTools());
      results.push(await this.testGetSchools());
      results.push(await this.testGetSystemHealth());
      results.push(await this.testGetIntegrationInfo());

      const passed = results.filter(r => r).length;
      const total = results.length;

      console.log('\n📊 Test Results:');
      console.log('==================');
      console.log(`✅ Passed: ${passed}/${total}`);
      console.log(`❌ Failed: ${total - passed}/${total}`);
      
      if (passed === total) {
        console.log('\n🎉 All tests passed! MCP server is working correctly.');
      } else {
        console.log('\n⚠️  Some tests failed. Check the errors above.');
      }

    } catch (error: any) {
      console.log('\n💥 Test suite failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
const tester = new MCPTester();
tester.runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test suite error:', error);
    process.exit(1);
  }); 