#!/usr/bin/env tsx
// 🧪 D6 API Connection Test Script

import { config } from 'dotenv';
import { D6ApiService } from '../src/services/d6ApiService.js';
import { logger } from '../src/utils/logger.js';

// Load environment variables
config();

async function testD6Connection() {
  console.log('🧪 Testing D6 API Connection...\n');

  // Check if required environment variables are set
  const requiredVars = {
    'D6_API_BASE_URL': process.env.D6_API_BASE_URL,
    'D6_API_USERNAME': process.env.D6_API_USERNAME,
    'D6_API_PASSWORD': process.env.D6_API_PASSWORD,
  };

  console.log('📋 Checking environment variables:');
  let missingVars = [];
  
  for (const [varName, value] of Object.entries(requiredVars)) {
    const status = value ? '✅' : '❌';
    const displayValue = value ? 
      (varName === 'D6_API_PASSWORD' ? '***hidden***' : value) : 
      'NOT SET';
    
    console.log(`   ${status} ${varName}: ${displayValue}`);
    
    if (!value) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.log('\n❌ Missing required environment variables:');
    console.log(`   Please set: ${missingVars.join(', ')}`);
    console.log('\n💡 To set up D6 API credentials:');
    console.log('   1. Copy env.example to .env: cp env.example .env');
    console.log('   2. Edit .env file with your D6 credentials');
    console.log('   3. Your D6 API URL should be: https://[school-name].d6.co.za/api');
    console.log('   4. Use your D6 system login username and password\n');
    
    console.log('📝 Example .env content:');
    console.log('   D6_API_BASE_URL=https://myschool.d6.co.za/api');
    console.log('   D6_API_USERNAME=teacher@myschool.edu');
    console.log('   D6_API_PASSWORD=your-password');
    console.log('   D6_REQUEST_TIMEOUT=30000\n');
    
    return false;
  }

  try {
    console.log('\n🔌 Attempting to connect to D6 API...');
    
    // Initialize D6 API service
    const d6Api = D6ApiService.getInstance({
      baseUrl: process.env.D6_API_BASE_URL!,
      username: process.env.D6_API_USERNAME!,
      password: process.env.D6_API_PASSWORD!,
      timeout: parseInt(process.env.D6_REQUEST_TIMEOUT || '30000'),
      retryAttempts: 3,
      retryDelay: 1000,
    });

    // Test connection
    const connectionTest = await d6Api.testConnection();
    
    if (connectionTest.connected) {
      console.log('✅ D6 API connection successful!');
      console.log(`   Response time: ${connectionTest.responseTime}ms`);
      if (connectionTest.version) {
        console.log(`   API version: ${connectionTest.version}`);
      }
    } else {
      console.log('❌ D6 API connection failed');
      console.log(`   Error: ${connectionTest.error}`);
      console.log(`   Response time: ${connectionTest.responseTime}ms`);
      return false;
    }

    // Test authentication
    console.log('\n🔐 Testing authentication...');
    const healthInfo = await d6Api.getHealthInfo();
    
    if (healthInfo.authenticated) {
      console.log('✅ Authentication successful!');
      console.log(`   Token expires: ${healthInfo.tokenExpiry}`);
    } else {
      console.log('❌ Authentication failed');
      console.log(`   Error: ${healthInfo.lastError}`);
      return false;
    }

    // Test basic data fetch
    console.log('\n📊 Testing data fetch...');
    try {
      const learnersResponse = await d6Api.getLearners({ limit: 5 });
      
      if (learnersResponse.success && learnersResponse.data) {
        console.log(`✅ Successfully fetched ${learnersResponse.data.length} learners`);
        console.log('   Sample learner data:');
        if (learnersResponse.data.length > 0) {
          const sample = learnersResponse.data[0];
          console.log(`   - ID: ${sample.LearnerID}`);
          console.log(`   - Name: ${sample.FirstName} ${sample.LastName}`);
          console.log(`   - Grade: ${sample.Grade}`);
          console.log(`   - Class: ${sample.Class}`);
        }
      } else {
        console.log('⚠️  Data fetch returned no results');
        console.log(`   Error: ${learnersResponse.error}`);
      }
    } catch (error: any) {
      console.log('⚠️  Data fetch test failed (this might be normal)');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n🎉 D6 API connection test completed successfully!');
    console.log('\nNext steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Test sync endpoint: POST http://localhost:3000/sync/d6');
    console.log('   3. Check health: GET http://localhost:3000/health');
    
    return true;

  } catch (error: any) {
    console.log('\n❌ D6 API connection test failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Network troubleshooting:');
      console.log('   - Check if the D6_API_BASE_URL is correct');
      console.log('   - Verify you have internet connectivity');
      console.log('   - Confirm the D6 server is accessible from your network');
    } else if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('\n💡 Authentication troubleshooting:');
      console.log('   - Verify your D6_API_USERNAME is correct');
      console.log('   - Check if your D6_API_PASSWORD is correct');
      console.log('   - Ensure the account has API access permissions');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Timeout troubleshooting:');
      console.log('   - Try increasing D6_REQUEST_TIMEOUT value');
      console.log('   - Check if D6 server is responding slowly');
    }
    
    return false;
  }
}

// Run the test
testD6Connection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 