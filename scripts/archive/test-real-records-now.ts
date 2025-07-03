import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import axios from 'axios';

// Configure to try real API first (no mock fallback initially)
const d6Config = {
  baseUrl: 'https://integrate.d6plus.co.za/api/v2',
  username: 'espenaitestapi',
  password: 'qUz3mPcRsfSWxKR9qEnm',
  enableMockData: false, // Disable mock to force real API attempts
  useMockDataFirst: false
};

console.log('🔍 Testing REAL D6 Records Access');
console.log('================================');
console.log('Target: 1,270 learners, 77 staff, 1,523 parents');
console.log('');

async function testRealRecords() {
  try {
    const d6Service = D6ApiServiceHybrid.getInstance(d6Config);
    
    console.log('1️⃣ Getting School Information...');
    const schools = await d6Service.getClientIntegrations();
    console.log('✅ Schools Found:', schools.length);
    
    for (const school of schools) {
      console.log(`   📚 ${school.school_name} (ID: ${school.school_id})`);
      console.log(`      Login ID: ${school.school_login_id}`);
      console.log(`      Activated: ${school.activated_by_integrator}`);
      console.log('');
    }

    // Get the first activated school or school 1000
    const targetSchool = schools.find(s => s.school_id === 1000) || 
                         schools.find(s => s.activated_by_integrator === 'Yes') ||
                         schools[0];
    
    if (!targetSchool) {
      console.log('❌ No schools found to test');
      return;
    }

    const schoolId = targetSchool.school_id;
    console.log(`🎯 Testing with School ID: ${schoolId} (${targetSchool.school_name})`);
    console.log('');

    // Create direct axios clients to test endpoints
    const clientV1 = axios.create({
      baseURL: 'https://integrate.d6plus.co.za/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'HTTP-X-USERNAME': 'espenaitestapi',
        'HTTP-X-PASSWORD': 'qUz3mPcRsfSWxKR9qEnm',
      },
    });

    const clientV2 = axios.create({
      baseURL: 'https://integrate.d6plus.co.za/api/v2',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'HTTP-X-USERNAME': 'espenaitestapi',
        'HTTP-X-PASSWORD': 'qUz3mPcRsfSWxKR9qEnm',
      },
    });

    // Try multiple endpoint variations for learners
    console.log('2️⃣ Testing Learner Endpoints...');
    const learnerEndpoints = [
      { client: clientV1, path: `adminplus/learners?school_id=${schoolId}` },
      { client: clientV2, path: `adminplus/learners?school_id=${schoolId}` },
      { client: clientV1, path: `learners?school_id=${schoolId}` },
      { client: clientV2, path: `learners?school_id=${schoolId}` },
      { client: clientV1, path: `adminplus/learners` },
      { client: clientV2, path: `adminplus/learners` }
    ];

    for (const endpoint of learnerEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.client.defaults.baseURL}/${endpoint.path}`);
        const response = await endpoint.client.get(endpoint.path);
        console.log(`   ✅ SUCCESS! Response type: ${typeof response.data}`);
        if (Array.isArray(response.data)) {
          console.log(`   📊 Found ${response.data.length} records`);
          if (response.data.length > 0) {
            console.log(`   Sample:`, JSON.stringify(response.data[0], null, 2));
          }
        } else if (response.data && typeof response.data === 'object') {
          console.log(`   📋 Response data:`, JSON.stringify(response.data, null, 2));
        } else {
          console.log(`   📄 Raw response:`, response.data);
        }
        console.log('   🎉 REAL DATA FOUND! Breaking to save output...');
        break;
      } catch (error: any) {
        console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
      }
    }

    console.log('');
    console.log('3️⃣ Testing Staff Endpoints...');
    const staffEndpoints = [
      { client: clientV1, path: `adminplus/staff?school_id=${schoolId}` },
      { client: clientV2, path: `adminplus/staff?school_id=${schoolId}` },
      { client: clientV1, path: `staff?school_id=${schoolId}` },
      { client: clientV2, path: `staff?school_id=${schoolId}` }
    ];

    for (const endpoint of staffEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.client.defaults.baseURL}/${endpoint.path}`);
        const response = await endpoint.client.get(endpoint.path);
        console.log(`   ✅ SUCCESS!`);
        if (Array.isArray(response.data)) {
          console.log(`   📊 Found ${response.data.length} staff records`);
          if (response.data.length > 0) {
            console.log(`   Sample:`, JSON.stringify(response.data[0], null, 2));
          }
        } else {
          console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2));
        }
        break;
      } catch (error: any) {
        console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
      }
    }

    console.log('');
    console.log('4️⃣ Testing Parent Endpoints...');
    const parentEndpoints = [
      { client: clientV1, path: `adminplus/parents?school_id=${schoolId}` },
      { client: clientV2, path: `adminplus/parents?school_id=${schoolId}` },
      { client: clientV1, path: `parents?school_id=${schoolId}` },
      { client: clientV2, path: `parents?school_id=${schoolId}` }
    ];

    for (const endpoint of parentEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.client.defaults.baseURL}/${endpoint.path}`);
        const response = await endpoint.client.get(endpoint.path);
        console.log(`   ✅ SUCCESS!`);
        if (Array.isArray(response.data)) {
          console.log(`   📊 Found ${response.data.length} parent records`);
          if (response.data.length > 0) {
            console.log(`   Sample:`, JSON.stringify(response.data[0], null, 2));
          }
        } else {
          console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2));
        }
        break;
      } catch (error: any) {
        console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
      }
    }

    console.log('');
    console.log('5️⃣ Testing Data Summary Endpoints...');
    
    const summaryEndpoints = [
      { client: clientV1, path: `adminplus/summary?school_id=${schoolId}` },
      { client: clientV2, path: `adminplus/summary?school_id=${schoolId}` },
      { client: clientV1, path: `summary?school_id=${schoolId}` },
      { client: clientV2, path: `summary?school_id=${schoolId}` },
      { client: clientV1, path: `adminplus/counts?school_id=${schoolId}` },
      { client: clientV2, path: `adminplus/counts?school_id=${schoolId}` }
    ];

    for (const endpoint of summaryEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.client.defaults.baseURL}/${endpoint.path}`);
        const response = await endpoint.client.get(endpoint.path);
        console.log(`   ✅ SUMMARY FOUND!`);
        console.log(`   📊 Data:`, JSON.stringify(response.data, null, 2));
        break;
      } catch (error: any) {
        console.log(`   ❌ ${endpoint.path}: ${error.response?.status || 'Error'}`);
      }
    }

  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

testRealRecords();
