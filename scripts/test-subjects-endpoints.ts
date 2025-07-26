
#!/usr/bin/env tsx

/**
 * Script to test different endpoint patterns for subjects and marks
 * Based on Patrick's clarification about URL formats
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSubjectsEndpoints() {
  console.log('🔍 Testing Different Subjects/Marks Endpoint Patterns\n');

  const schoolId = '1694';
  const baseUrlV1 = 'https://integrate.d6plus.co.za/api/v1';
  const baseUrlV2 = 'https://integrate.d6plus.co.za/api/v2';
  const username = process.env.D6_API_USERNAME || 'espenaitestapi';
  const password = process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm';

  // Create auth
  const auth = {
    username,
    password
  };

  // Test different endpoint patterns
  const endpointsToTest = [
    // Based on learners pattern: /v1/adminplus/learners/1694
    `${baseUrlV1}/adminplus/subjects/${schoolId}`,
    `${baseUrlV1}/adminplus/marks/${schoolId}`,
    `${baseUrlV1}/adminplus/grades/${schoolId}`,
    `${baseUrlV1}/adminplus/assessments/${schoolId}`,
    `${baseUrlV1}/adminplus/curriculum/${schoolId}`,
    `${baseUrlV1}/adminplus/classes/${schoolId}`,
    
    // CurrPlus module patterns
    `${baseUrlV1}/currplus/subjects/${schoolId}`,
    `${baseUrlV1}/currplus/marks/${schoolId}`,
    `${baseUrlV1}/currplus/learnermarks/${schoolId}`,
    `${baseUrlV1}/currplus/learnersubjects/${schoolId}`,
    
    // V2 API patterns
    `${baseUrlV2}/currplus/subjects/${schoolId}`,
    `${baseUrlV2}/currplus/marks/${schoolId}`,
    `${baseUrlV2}/currplus/learnermarks/${schoolId}`,
    `${baseUrlV2}/currplus/learnersubjects/${schoolId}`,
    
    // Alternative patterns (maybe without school ID for lookup data)
    `${baseUrlV1}/adminplus/lookup/subjects`,
    `${baseUrlV1}/adminplus/lookup/grades`,
    `${baseUrlV1}/currplus/lookup/subjects`,
    `${baseUrlV1}/currplus/lookup/grades`,
    
    // Settings patterns (like /settings/clients)
    `${baseUrlV1}/settings/subjects`,
    `${baseUrlV1}/settings/grades`,
    `${baseUrlV1}/settings/curriculum`,
  ];

  console.log(`🎯 Testing ${endpointsToTest.length} potential endpoints...\n`);

  const results: {
    success: Array<{endpoint: string, status: number, dataLength: number, sample: string}>,
    notFound: string[],
    errors: Array<{endpoint: string, status?: number, error: string}>
  } = {
    success: [],
    notFound: [],
    errors: []
  };

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`Testing: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        auth,
        timeout: 10000,
        validateStatus: (status) => status < 500 // Don't throw for 4xx errors
      });
      
      if (response.status === 200) {
        const dataLength = Array.isArray(response.data) ? response.data.length : 
                          typeof response.data === 'object' ? Object.keys(response.data).length : 1;
        
        console.log(`✅ SUCCESS: ${response.status} - ${dataLength} records`);
        results.success.push({
          endpoint,
          status: response.status,
          dataLength,
          sample: Array.isArray(response.data) && response.data.length > 0 ? 
                  JSON.stringify(response.data[0], null, 2) : 
                  JSON.stringify(response.data, null, 2).substring(0, 200)
        });
      } else if (response.status === 404) {
        console.log(`❌ NOT FOUND: ${response.status}`);
        results.notFound.push(endpoint);
      } else {
        console.log(`⚠️  OTHER: ${response.status} - ${response.statusText}`);
        results.errors.push({
          endpoint,
          status: response.status,
          error: response.statusText
        });
      }
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`❌ NOT FOUND: 404`);
        results.notFound.push(endpoint);
      } else {
        console.log(`❌ ERROR: ${error.message}`);
        results.errors.push({
          endpoint,
          error: error.message
        });
      }
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 RESULTS SUMMARY');
  console.log('═'.repeat(50));
  
  if (results.success.length > 0) {
    console.log(`\n✅ SUCCESSFUL ENDPOINTS (${results.success.length}):`);
    results.success.forEach(result => {
      console.log(`   ${result.endpoint}`);
      console.log(`   Status: ${result.status}, Records: ${result.dataLength}`);
      if (result.sample) {
        console.log(`   Sample data: ${result.sample.substring(0, 100)}...`);
      }
      console.log('');
    });
  }

  if (results.errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${results.errors.length}):`);
    results.errors.forEach(result => {
      console.log(`   ${result.endpoint}: ${result.error}`);
    });
  }

  console.log(`\n❌ NOT FOUND (${results.notFound.length}):`);
  console.log(`   ${results.notFound.length} endpoints returned 404`);

  if (results.success.length === 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Subjects/marks endpoints may need activation by D6');
    console.log('   2. Check D6 API documentation for correct endpoint patterns');
    console.log('   3. Contact Patrick for subjects/curriculum endpoint activation');
  }
}

// Run the test
testSubjectsEndpoints().catch(console.error); 