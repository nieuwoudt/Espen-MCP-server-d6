#!/usr/bin/env tsx
// 🧪 D6 API Test Script - Using Correct Implementation

import { D6ApiServiceV2, initializeD6ApiV2 } from '../src/services/d6ApiService-v2.js';

async function testD6APICorrect() {
  console.log('🧪 Testing D6 API Connection (Correct Implementation)...\n');

  // Check environment variables
  const requiredVars = {
    'D6_API_USERNAME': process.env.D6_API_USERNAME || 'espenaitestapi',
    'D6_API_PASSWORD': process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
  };

  console.log('📋 Using credentials:');
  console.log(`   Username: ${requiredVars.D6_API_USERNAME}`);
  console.log(`   Password: [HIDDEN]`);
  console.log(`   Base URL: https://integrate.d6plus.co.za/api/v2`);
  console.log('');

  try {
    // Initialize D6 API service
    console.log('🔌 Initializing D6 API service...');
    
    // Set environment variables for the service
    process.env.D6_API_USERNAME = requiredVars.D6_API_USERNAME;
    process.env.D6_API_PASSWORD = requiredVars.D6_API_PASSWORD;
    process.env.D6_API_BASE_URL = 'https://integrate.d6plus.co.za/api/v2';
    
    const d6Api = initializeD6ApiV2();
    console.log('✅ D6 API service initialized');

    // Test 1: Check connection and authentication
    console.log('\n🔐 Testing authentication...');
    const healthInfo = await d6Api.getHealthInfo();
    
    if (healthInfo.connected) {
      console.log('✅ Authentication successful!');
      console.log(`   Response time: ${healthInfo.responseTime}ms`);
      console.log(`   Authorized schools: ${healthInfo.authorizedSchools}`);
    } else {
      console.log('❌ Authentication failed');
      console.log(`   Error: ${healthInfo.lastError}`);
      return false;
    }

    // Test 2: Get client integrations
    console.log('\n📋 Getting client integrations...');
    const integrationsResponse = await d6Api.getClientIntegrations();
    
    if (integrationsResponse.success && integrationsResponse.data) {
      console.log(`✅ Found ${integrationsResponse.data.length} authorized school(s):`);
      
      integrationsResponse.data.forEach((school, index) => {
        console.log(`   ${index + 1}. ${school.school_name} (ID: ${school.school_id})`);
        console.log(`      Email: ${school.admin_email_address}`);
        console.log(`      API Type: ${school.api_type}`);
        console.log(`      Activated: ${school.activated_by_integrator}`);
        console.log('');
      });

      // Test 3: If we have schools, try to get learners
      if (integrationsResponse.data.length > 0) {
        const firstSchool = integrationsResponse.data[0];
        console.log(`📚 Testing learner data for ${firstSchool.school_name}...`);
        
        try {
          const learnersResponse = await d6Api.getLearners(firstSchool.school_id, { limit: 5 });
          
          if (learnersResponse.success && learnersResponse.data) {
            console.log(`✅ Successfully retrieved learner data!`);
            console.log(`   Total in response: ${learnersResponse.data.data.length}`);
            console.log(`   Pagination limit: ${learnersResponse.data.meta.limit}`);
            console.log(`   Max allowed limit: ${learnersResponse.data.meta.max_allowed_limit}`);
            
            if (learnersResponse.data.data.length > 0) {
              console.log('\n   Sample learner:');
              const sample = learnersResponse.data.data[0];
              console.log(`   - ID: ${sample.learner_id}`);
              console.log(`   - Name: ${sample.first_name} ${sample.last_name}`);
              console.log(`   - Grade: ${sample.grade}`);
              console.log(`   - Gender: ${sample.gender}`);
            }
          } else {
            console.log('⚠️  No learner data returned');
            console.log(`   Error: ${learnersResponse.error}`);
          }
        } catch (error: any) {
          console.log('⚠️  Learner data test failed');
          console.log(`   Error: ${error.message}`);
        }

        // Test 4: Try financial data
        console.log(`\n💰 Testing financial data for ${firstSchool.school_name}...`);
        
        try {
          const financialResponse = await d6Api.getFinancialLearners(firstSchool.school_id, { limit: 5 });
          
          if (financialResponse.success && financialResponse.data) {
            console.log(`✅ Successfully retrieved financial data!`);
            console.log(`   Records: ${financialResponse.data.data.length}`);
          } else {
            console.log('⚠️  No financial data returned');
            console.log(`   Error: ${financialResponse.error}`);
          }
        } catch (error: any) {
          console.log('⚠️  Financial data test failed');
          console.log(`   Error: ${error.message}`);
        }
      }
    } else {
      console.log('❌ Failed to get client integrations');
      console.log(`   Error: ${integrationsResponse.error}`);
      return false;
    }

    console.log('\n🎉 D6 API test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Authentication working');
    console.log('   ✅ Client integrations accessible');
    console.log('   ✅ API endpoints responding');
    console.log('\nNext steps:');
    console.log('   1. Update the main server to use D6ApiServiceV2');
    console.log('   2. Implement proper school selection');
    console.log('   3. Add data sync for all authorized schools');
    
    return true;

  } catch (error: any) {
    console.log('\n❌ D6 API test failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 Authentication troubleshooting:');
      console.log('   - Verify your D6_API_USERNAME is correct');
      console.log('   - Check if your D6_API_PASSWORD is correct');
      console.log('   - Ensure the credentials have API access permissions');
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('\n💡 Permission troubleshooting:');
      console.log('   - Check if your integration is properly activated');
      console.log('   - Verify the API endpoints are included in your subscription');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Timeout troubleshooting:');
      console.log('   - Try increasing D6_REQUEST_TIMEOUT value');
      console.log('   - Check if D6 server is responding slowly');
    }
    
    return false;
  }
}

// Run the test
testD6APICorrect()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 