#!/usr/bin/env tsx
// 🔍 Detailed Inspection of Working D6 Endpoints

import axios from 'axios';

const BASE_URL = 'https://integrate.d6plus.co.za/api';
const USERNAME = 'espenaitestapi';
const PASSWORD = 'qUz3mPcRsfSWxKR9qEnm';

async function inspectEndpoint(url: string, description: string, authMethod: string, headers: any): Promise<any> {
  try {
    console.log(`\n🔍 ${description} (${authMethod})`);
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(url, { headers, timeout: 15000 });
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Data Type: ${typeof response.data}`);
    console.log(`   📏 Data Length: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
    
    // Full response inspection
    console.log(`   📝 Full Response: ${JSON.stringify(response.data, null, 2)}`);
    
    return { success: true, data: response.data, status: response.status };
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.response?.status || 'Network'} - ${error.response?.data?.error_description || error.message}`);
    
    if (error.response?.data) {
      console.log(`   📝 Error Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return { success: false, error: error.response?.data || error.message };
  }
}

async function inspectD6Endpoints() {
  console.log('🔍 D6 Endpoint Detailed Inspection');
  console.log('===================================');
  console.log('Target: Understanding why endpoints return no data');
  console.log('Integration: 1694, School: 1000, Expected: 1,270 learners, 77 staff, 1,523 parents');
  
  // Standard headers
  const standardHeaders = {
    'HTTP-X-USERNAME': USERNAME,
    'HTTP-X-PASSWORD': PASSWORD,
    'Content-Type': 'application/json'
  };

  // Alternative header formats
  const basicAuthHeaders = {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`,
    'Content-Type': 'application/json'
  };

  const bearerHeaders = {
    'Authorization': `Bearer ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`,
    'Content-Type': 'application/json'
  };

  const altHeaders = {
    'X-USERNAME': USERNAME,
    'X-PASSWORD': PASSWORD,
    'Content-Type': 'application/json'
  };

  console.log('\n🏫 SCHOOL INFO INSPECTION');
  console.log('=========================');
  
  await inspectEndpoint(
    `${BASE_URL}/v2/settings/clients`,
    'School Information',
    'Standard Headers',
    standardHeaders
  );

  console.log('\n📚 LEARNERS ENDPOINT INSPECTION');
  console.log('===============================');
  
  // Test different authentication methods
  const learnerEndpoints = [
    `${BASE_URL}/adminplus/learners`,
    `${BASE_URL}/adminplus/learners?school_id=1000`,
    `${BASE_URL}/adminplus/learners?school_login_id=1694`,
    `${BASE_URL}/adminplus/learners?integration_id=1694`,
    `${BASE_URL}/adminplus/learners?client_id=1694`
  ];

  for (const endpoint of learnerEndpoints) {
    await inspectEndpoint(endpoint, 'Learners Data', 'Standard Headers', standardHeaders);
    await inspectEndpoint(endpoint, 'Learners Data', 'Basic Auth', basicAuthHeaders);
  }

  console.log('\n👨‍🏫 STAFF ENDPOINT INSPECTION');
  console.log('=============================');
  
  const staffEndpoints = [
    `${BASE_URL}/adminplus/staff`,
    `${BASE_URL}/adminplus/staff?school_id=1000`,
    `${BASE_URL}/adminplus/staff?school_login_id=1694`,
    `${BASE_URL}/adminplus/staff?integration_id=1694`,
    `${BASE_URL}/adminplus/staff?client_id=1694`
  ];

  for (const endpoint of staffEndpoints) {
    await inspectEndpoint(endpoint, 'Staff Data', 'Standard Headers', standardHeaders);
  }

  console.log('\n👪 PARENTS ENDPOINT INSPECTION');
  console.log('==============================');
  
  const parentEndpoints = [
    `${BASE_URL}/adminplus/parents`,
    `${BASE_URL}/adminplus/parents?school_id=1000`,
    `${BASE_URL}/adminplus/parents?school_login_id=1694`,
    `${BASE_URL}/adminplus/parents?integration_id=1694`,
    `${BASE_URL}/adminplus/parents?client_id=1694`
  ];

  for (const endpoint of parentEndpoints) {
    await inspectEndpoint(endpoint, 'Parents Data', 'Standard Headers', standardHeaders);
  }

  console.log('\n🔍 ADDITIONAL API EXPLORATION');
  console.log('=============================');
  
  // Try to find other available endpoints
  const explorationEndpoints = [
    `${BASE_URL}/v2/adminplus/schools`,
    `${BASE_URL}/v2/adminplus/schools/1000`,
    `${BASE_URL}/v2/settings/integrations`,
    `${BASE_URL}/v2/settings/integrations/1694`,
    `${BASE_URL}/adminplus/schools`,
    `${BASE_URL}/adminplus/schools/1000`,
    `${BASE_URL}/v2/adminplus/lookup/schools`,
    `${BASE_URL}/adminplus/lookup/schools`,
    `${BASE_URL}/currplus/learnersubjects`,
    `${BASE_URL}/v2/currplus/learnersubjects`,
    `${BASE_URL}/currplus`,
    `${BASE_URL}/adminplus`
  ];

  for (const endpoint of explorationEndpoints) {
    await inspectEndpoint(endpoint, 'API Exploration', 'Standard Headers', standardHeaders);
  }

  console.log('\n📊 SUMMARY & RECOMMENDATIONS');
  console.log('=============================');
  console.log('Based on the inspection results:');
  console.log('');
  console.log('1. If endpoints return empty arrays [] or null:');
  console.log('   → Data exists but needs correct parameters or permissions');
  console.log('');
  console.log('2. If endpoints return error messages:');
  console.log('   → Check the error details for permission/access issues');
  console.log('');
  console.log('3. If some endpoints work with certain parameters:');
  console.log('   → Update MCP server with working parameter combinations');
  console.log('');
  console.log('📧 Next Steps:');
  console.log('• Contact D6 support with this detailed inspection log');
  console.log('• Request specific parameter documentation for integration 1694');
  console.log('• Ask for data access activation for school 1000');
  console.log('• Verify if additional API scopes/permissions are needed');
}

inspectD6Endpoints()
  .then(() => {
    console.log('\n🏁 Detailed inspection completed!');
  })
  .catch((error) => {
    console.error('\n💥 Inspection failed:', error);
  }); 