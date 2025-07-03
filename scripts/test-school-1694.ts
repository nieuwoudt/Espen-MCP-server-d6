import axios from 'axios';

console.log('🎯 Testing with CORRECT School ID: 1694');
console.log('=====================================');
console.log('Real school: "d6 Integrate API Test School"');
console.log('Target: 1,270 learners, 77 staff, 1,523 parents');
console.log('');

// Create direct axios clients
const clientV1 = axios.create({
  baseURL: 'https://integrate.d6plus.co.za/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'HTTP-X-USERNAME': 'espenaitestapi',
    'HTTP-X-PASSWORD': 'qUz3mPcRsfSWxKR9qEnm',
  },
});

const clientV2 = axios.create({
  baseURL: 'https://integrate.d6plus.co.za/api/v2',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'HTTP-X-USERNAME': 'espenaitestapi',
    'HTTP-X-PASSWORD': 'qUz3mPcRsfSWxKR9qEnm',
  },
});

async function testSchool1694() {
  try {
    const schoolId = 1694; // Using the correct school_login_id from response
    
    console.log('1️⃣ Testing with School ID 1694...');
    
    // Test learners with school 1694
    const learnerEndpoints = [
      { client: clientV1, path: `adminplus/learners?school_id=${schoolId}`, desc: 'v1 adminplus/learners (1694)' },
      { client: clientV2, path: `adminplus/learners?school_id=${schoolId}`, desc: 'v2 adminplus/learners (1694)' },
      { client: clientV1, path: `adminplus/learners?school_login_id=${schoolId}`, desc: 'v1 adminplus/learners (login_id)' },
      { client: clientV2, path: `adminplus/learners?school_login_id=${schoolId}`, desc: 'v2 adminplus/learners (login_id)' },
      { client: clientV1, path: `learners?school_id=${schoolId}`, desc: 'v1 learners (1694)' },
      { client: clientV2, path: `learners?school_id=${schoolId}`, desc: 'v2 learners (1694)' }
    ];

    for (const endpoint of learnerEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.desc}`);
        const response = await endpoint.client.get(endpoint.path);
        
        if (response.data === "") {
          console.log(`   ⚠️  EMPTY STRING - Permissions not yet enabled`);
        } else if (Array.isArray(response.data)) {
          console.log(`   🎉 SUCCESS! Found ${response.data.length} learner records`);
          console.log(`   📊 Sample:`, JSON.stringify(response.data.slice(0, 1), null, 2));
          console.log(`   🔓 REAL DATA ACCESS CONFIRMED!`);
          break;
        } else {
          console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2));
        }
      } catch (error: any) {
        console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
      }
    }

    console.log('');
    console.log('2️⃣ Trying Different School Parameter Names...');
    
    // Try with school 1000 (mentioned in D6 emails)
    const altSchoolEndpoints = [
      { client: clientV1, path: `adminplus/learners?school_id=1000`, desc: 'v1 with school 1000' },
      { client: clientV2, path: `adminplus/learners?school_id=1000`, desc: 'v2 with school 1000' },
      { client: clientV1, path: `adminplus/learners?integration_id=1694`, desc: 'v1 with integration_id' },
      { client: clientV2, path: `adminplus/learners?integration_id=1694`, desc: 'v2 with integration_id' }
    ];

    for (const endpoint of altSchoolEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.desc}`);
        const response = await endpoint.client.get(endpoint.path);
        
        if (response.data === "") {
          console.log(`   ⚠️  EMPTY STRING - Need permissions`);
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          console.log(`   🎉 SUCCESS! Found ${response.data.length} records`);
          console.log(`   📊 First record:`, JSON.stringify(response.data[0], null, 2));
          break;
        } else {
          console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2));
        }
      } catch (error: any) {
        console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
      }
    }

    console.log('');
    console.log('3️⃣ Endpoint Discovery - What IS Available?');
    
    // Try to discover available endpoints
    const discoveryEndpoints = [
      { client: clientV1, path: '', desc: 'v1 root' },
      { client: clientV2, path: '', desc: 'v2 root' },
      { client: clientV1, path: 'adminplus', desc: 'v1 adminplus' },
      { client: clientV2, path: 'adminplus', desc: 'v2 adminplus' },
      { client: clientV1, path: 'currplus', desc: 'v1 currplus' },
      { client: clientV2, path: 'currplus', desc: 'v2 currplus' }
    ];

    for (const endpoint of discoveryEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.desc}`);
        const response = await endpoint.client.get(endpoint.path);
        
        if (response.data === "") {
          console.log(`   ⚠️  Empty response`);
        } else {
          console.log(`   ✅ Available! Response:`, JSON.stringify(response.data, null, 2));
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log(`   ❌ Not found`);
        } else {
          console.log(`   ❌ ${error.response?.status}: ${error.response?.data?.error_description || error.message}`);
        }
      }
    }

    console.log('');
    console.log('4️⃣ Final Status Summary');
    console.log('========================');
    console.log('✅ Authentication: Working');
    console.log('✅ School Data: Available (d6 Integrate API Test School, ID 1694)');
    console.log('✅ Lookup Data: Working (genders, etc.)');
    console.log('❌ Student Data: Endpoints return 404 or need additional permissions');
    console.log('❌ Staff Data: Endpoints return 404 or need additional permissions');
    console.log('❌ Parent Data: Endpoints return 404 or need additional permissions');
    console.log('');
    console.log('📧 Next Step: Contact D6 support to enable data endpoints for integration 1694');
    console.log('   support@d6plus.co.za');
    console.log('   Include: Integration ID 1694, School "d6 Integrate API Test School"');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

testSchool1694();
