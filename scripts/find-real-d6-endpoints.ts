#!/usr/bin/env tsx
// 🔍 Find Real D6 Endpoints - Comprehensive API Discovery

import axios from 'axios';

const BASE_URL = 'https://integrate.d6plus.co.za/api';
const USERNAME = 'espenaitestapi';
const PASSWORD = 'qUz3mPcRsfSWxKR9qEnm';

const headers = {
  'HTTP-X-USERNAME': USERNAME,
  'HTTP-X-PASSWORD': PASSWORD,
  'Content-Type': 'application/json'
};

async function testEndpoint(url: string, description: string): Promise<any> {
  try {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(url, { headers, timeout: 10000 });
    
    console.log(`   ✅ SUCCESS: ${response.status} - ${response.data?.length || 'N/A'} items`);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log(`   📝 Sample: ${JSON.stringify(response.data[0], null, 2).substring(0, 200)}...`);
      return { success: true, count: response.data.length, sample: response.data[0] };
    } else if (response.data) {
      console.log(`   📝 Data: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
      return { success: true, data: response.data };
    }
    
    return { success: true };
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.response?.status || 'Network'} - ${error.response?.data?.error_description || error.message}`);
    return { success: false, error: error.response?.data || error.message };
  }
}

async function findRealD6Data() {
  console.log('🔍 D6 Real Data Discovery');
  console.log('=========================');
  console.log('Target: 1,270 learners, 77 staff, 1,523 parents from school 1000');
  console.log('Integration: 1694 (activated)');
  
  const results: any[] = [];

  // Test different endpoint patterns for LEARNERS
  console.log('\n📚 LEARNERS ENDPOINT DISCOVERY');
  console.log('==============================');
  
  const learnerEndpoints = [
    `${BASE_URL}/v1/adminplus/learners`,
    `${BASE_URL}/v1/adminplus/learners?school_id=1000`,
    `${BASE_URL}/v1/adminplus/learners?school_login_id=1000`,
    `${BASE_URL}/v2/adminplus/learners`,
    `${BASE_URL}/v2/adminplus/learners?school_id=1000`,
    `${BASE_URL}/adminplus/learners`,
    `${BASE_URL}/adminplus/learners?school_id=1000`,
    `${BASE_URL}/v1/schools/1000/learners`,
    `${BASE_URL}/v2/schools/1000/learners`,
    `${BASE_URL}/v1/learners?school_id=1000`,
    `${BASE_URL}/v2/learners?school_id=1000`,
    `${BASE_URL}/v1/adminplus/schools/1000/learners`,
    `${BASE_URL}/v2/adminplus/schools/1000/learners`,
    `${BASE_URL}/v1/integration/1694/learners`,
    `${BASE_URL}/v2/integration/1694/learners`,
    `${BASE_URL}/v1/clients/1694/learners`,
    `${BASE_URL}/v2/clients/1694/learners`
  ];

  for (const endpoint of learnerEndpoints) {
    const result = await testEndpoint(endpoint, 'Learners Data');
    if (result.success && result.count > 0) {
      results.push({ type: 'learners', endpoint, count: result.count, sample: result.sample });
    }
  }

  // Test different endpoint patterns for STAFF  
  console.log('\n👨‍🏫 STAFF ENDPOINT DISCOVERY');
  console.log('=============================');
  
  const staffEndpoints = [
    `${BASE_URL}/v1/adminplus/staff`,
    `${BASE_URL}/v1/adminplus/staff?school_id=1000`,
    `${BASE_URL}/v1/adminplus/staff?school_login_id=1000`,
    `${BASE_URL}/v2/adminplus/staff`,
    `${BASE_URL}/v2/adminplus/staff?school_id=1000`,
    `${BASE_URL}/adminplus/staff`,
    `${BASE_URL}/adminplus/staff?school_id=1000`,
    `${BASE_URL}/v1/schools/1000/staff`,
    `${BASE_URL}/v2/schools/1000/staff`,
    `${BASE_URL}/v1/staff?school_id=1000`,
    `${BASE_URL}/v2/staff?school_id=1000`,
    `${BASE_URL}/v1/adminplus/schools/1000/staff`,
    `${BASE_URL}/v2/adminplus/schools/1000/staff`,
    `${BASE_URL}/v1/integration/1694/staff`,
    `${BASE_URL}/v2/integration/1694/staff`,
    `${BASE_URL}/v1/clients/1694/staff`,
    `${BASE_URL}/v2/clients/1694/staff`
  ];

  for (const endpoint of staffEndpoints) {
    const result = await testEndpoint(endpoint, 'Staff Data');
    if (result.success && result.count > 0) {
      results.push({ type: 'staff', endpoint, count: result.count, sample: result.sample });
    }
  }

  // Test different endpoint patterns for PARENTS
  console.log('\n👪 PARENTS ENDPOINT DISCOVERY');
  console.log('==============================');
  
  const parentEndpoints = [
    `${BASE_URL}/v1/adminplus/parents`,
    `${BASE_URL}/v1/adminplus/parents?school_id=1000`,
    `${BASE_URL}/v1/adminplus/parents?school_login_id=1000`,
    `${BASE_URL}/v2/adminplus/parents`,
    `${BASE_URL}/v2/adminplus/parents?school_id=1000`,
    `${BASE_URL}/v3/adminplus/parents`,
    `${BASE_URL}/v3/adminplus/parents?school_id=1000`,
    `${BASE_URL}/adminplus/parents`,
    `${BASE_URL}/adminplus/parents?school_id=1000`,
    `${BASE_URL}/v1/schools/1000/parents`,
    `${BASE_URL}/v2/schools/1000/parents`,
    `${BASE_URL}/v1/parents?school_id=1000`,
    `${BASE_URL}/v2/parents?school_id=1000`,
    `${BASE_URL}/v1/adminplus/schools/1000/parents`,
    `${BASE_URL}/v2/adminplus/schools/1000/parents`,
    `${BASE_URL}/v1/integration/1694/parents`,
    `${BASE_URL}/v2/integration/1694/parents`,
    `${BASE_URL}/v1/clients/1694/parents`,
    `${BASE_URL}/v2/clients/1694/parents`
  ];

  for (const endpoint of parentEndpoints) {
    const result = await testEndpoint(endpoint, 'Parents Data');
    if (result.success && result.count > 0) {
      results.push({ type: 'parents', endpoint, count: result.count, sample: result.sample });
    }
  }

  // Test working endpoints for reference
  console.log('\n✅ WORKING ENDPOINTS (for reference)');
  console.log('====================================');
  
  await testEndpoint(`${BASE_URL}/v2/settings/clients`, 'School Information');
  await testEndpoint(`${BASE_URL}/v2/adminplus/lookup/genders`, 'Gender Lookup');

  // Summary
  console.log('\n📊 DISCOVERY RESULTS');
  console.log('====================');
  
  if (results.length === 0) {
    console.log('❌ No working endpoints found for learners, staff, or parents data');
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. Contact D6 support with this endpoint discovery log');
    console.log('2. Request specific API documentation for integration 1694');
    console.log('3. Ask for endpoint activation for school 1000 data access');
    console.log('4. Verify if additional API permissions are needed');
    console.log('\n📧 Contact: support@d6plus.co.za or apidocs@d6.co.za');
    console.log('📝 Include: Integration ID 1694, School ID 1000, endpoint discovery results');
  } else {
    console.log('🎉 SUCCESS! Found working endpoints:');
    results.forEach(result => {
      console.log(`\n✅ ${result.type.toUpperCase()}: ${result.count} records`);
      console.log(`   Endpoint: ${result.endpoint}`);
      if (result.sample) {
        console.log(`   Sample: ${JSON.stringify(result.sample, null, 2).substring(0, 150)}...`);
      }
    });
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Update MCP server with working endpoints');
    console.log('2. Test data access in production mode');
    console.log('3. Verify data counts match D6 expectations');
    console.log('4. Connect to Claude Desktop');
  }

  // Verify expected data counts
  const learnerResults = results.filter(r => r.type === 'learners');
  const staffResults = results.filter(r => r.type === 'staff');
  const parentResults = results.filter(r => r.type === 'parents');

  console.log('\n🎯 DATA COUNT VERIFICATION');
  console.log('===========================');
  console.log(`Expected: 1,270 learners | Found: ${learnerResults.length > 0 ? learnerResults[0].count : 0}`);
  console.log(`Expected: 77 staff       | Found: ${staffResults.length > 0 ? staffResults[0].count : 0}`);
  console.log(`Expected: 1,523 parents  | Found: ${parentResults.length > 0 ? parentResults[0].count : 0}`);

  return results;
}

findRealD6Data()
  .then((results) => {
    console.log('\n🏁 Endpoint discovery completed!');
    process.exit(results.length > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Discovery failed:', error);
    process.exit(1);
  }); 