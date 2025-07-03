import axios from 'axios';

console.log('🔍 Direct D6 API Testing for Real Records');
console.log('=========================================');
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

async function testDirectAPI() {
  try {
    // First get schools to know which school to query
    console.log('1️⃣ Getting School Information...');
    try {
      const schoolsResponse = await clientV2.get('settings/clients');
      console.log('✅ Schools Response:', JSON.stringify(schoolsResponse.data, null, 2));
      
      if (Array.isArray(schoolsResponse.data) && schoolsResponse.data.length > 0) {
        const school = schoolsResponse.data[0];
        const schoolId = school.school_id || 1000;
        console.log(`🎯 Using School ID: ${schoolId}`);
        console.log('');
        
        // Now test learners endpoints
        console.log('2️⃣ Testing Learner Endpoints...');
        const learnerEndpoints = [
          { client: clientV1, path: `adminplus/learners?school_id=${schoolId}`, desc: 'v1 adminplus/learners' },
          { client: clientV2, path: `adminplus/learners?school_id=${schoolId}`, desc: 'v2 adminplus/learners' },
          { client: clientV1, path: `learners?school_id=${schoolId}`, desc: 'v1 learners' },
          { client: clientV2, path: `learners?school_id=${schoolId}`, desc: 'v2 learners' },
          { client: clientV1, path: `adminplus/learners`, desc: 'v1 adminplus/learners (no params)' },
          { client: clientV2, path: `adminplus/learners`, desc: 'v2 adminplus/learners (no params)' },
          { client: clientV1, path: `currplus/learners?school_id=${schoolId}`, desc: 'v1 currplus/learners' },
          { client: clientV2, path: `currplus/learners?school_id=${schoolId}`, desc: 'v2 currplus/learners' }
        ];

        for (const endpoint of learnerEndpoints) {
          try {
            console.log(`   Testing: ${endpoint.desc}`);
            const response = await endpoint.client.get(endpoint.path);
            
            if (response.data === "") {
              console.log(`   ⚠️  Empty string response (permissions issue)`);
            } else if (Array.isArray(response.data)) {
              console.log(`   ✅ SUCCESS! Found ${response.data.length} learner records`);
              if (response.data.length > 0) {
                console.log(`   📊 Sample learner:`, JSON.stringify(response.data[0], null, 2));
              }
              console.log(`   🎉 REAL LEARNER DATA ACCESSED!`);
              break;
            } else if (response.data && typeof response.data === 'object') {
              console.log(`   ✅ SUCCESS! Response object:`, JSON.stringify(response.data, null, 2));
              break;
            } else {
              console.log(`   📄 Response:`, response.data);
            }
          } catch (error: any) {
            console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
          }
        }

        console.log('');
        console.log('3️⃣ Testing Staff Endpoints...');
        const staffEndpoints = [
          { client: clientV1, path: `adminplus/staff?school_id=${schoolId}`, desc: 'v1 adminplus/staff' },
          { client: clientV2, path: `adminplus/staff?school_id=${schoolId}`, desc: 'v2 adminplus/staff' },
          { client: clientV1, path: `staff?school_id=${schoolId}`, desc: 'v1 staff' },
          { client: clientV2, path: `staff?school_id=${schoolId}`, desc: 'v2 staff' }
        ];

        for (const endpoint of staffEndpoints) {
          try {
            console.log(`   Testing: ${endpoint.desc}`);
            const response = await endpoint.client.get(endpoint.path);
            
            if (response.data === "") {
              console.log(`   ⚠️  Empty string response (permissions issue)`);
            } else if (Array.isArray(response.data)) {
              console.log(`   ✅ SUCCESS! Found ${response.data.length} staff records`);
              if (response.data.length > 0) {
                console.log(`   📊 Sample staff:`, JSON.stringify(response.data[0], null, 2));
              }
              break;
            } else {
              console.log(`   📄 Response:`, response.data);
            }
          } catch (error: any) {
            console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
          }
        }

        console.log('');
        console.log('4️⃣ Testing Lookup Endpoints (Known to Work)...');
        const lookupEndpoints = [
          { client: clientV1, path: `adminplus/lookup/genders`, desc: 'v1 genders' },
          { client: clientV2, path: `adminplus/lookup/genders`, desc: 'v2 genders' }
        ];

        for (const endpoint of lookupEndpoints) {
          try {
            console.log(`   Testing: ${endpoint.desc}`);
            const response = await endpoint.client.get(endpoint.path);
            
            if (response.data === "") {
              console.log(`   ⚠️  Empty string response`);
            } else {
              console.log(`   ✅ SUCCESS! Lookup data:`, JSON.stringify(response.data, null, 2));
              break;
            }
          } catch (error: any) {
            console.log(`   ❌ ${error.response?.status || 'Error'}: ${error.response?.data?.error_description || error.message}`);
          }
        }
      }
    } catch (error: any) {
      console.log('❌ Failed to get schools:', error.response?.data || error.message);
    }

    console.log('');
    console.log('5️⃣ Testing Alternative Endpoints...');
    
    // Try some alternative endpoints that might give us data counts
    const altEndpoints = [
      { client: clientV1, path: 'adminplus/dashboard', desc: 'v1 dashboard' },
      { client: clientV2, path: 'adminplus/dashboard', desc: 'v2 dashboard' },
      { client: clientV1, path: 'adminplus/summary', desc: 'v1 summary' },
      { client: clientV2, path: 'adminplus/summary', desc: 'v2 summary' },
      { client: clientV1, path: 'adminplus/stats', desc: 'v1 stats' },
      { client: clientV2, path: 'adminplus/stats', desc: 'v2 stats' }
    ];

    for (const endpoint of altEndpoints) {
      try {
        console.log(`   Testing: ${endpoint.desc}`);
        const response = await endpoint.client.get(endpoint.path);
        
        if (response.data === "") {
          console.log(`   ⚠️  Empty string response`);
        } else if (response.data && typeof response.data === 'object') {
          console.log(`   ✅ SUCCESS! Found data:`, JSON.stringify(response.data, null, 2));
          break;
        } else {
          console.log(`   📄 Response:`, response.data);
        }
      } catch (error: any) {
        console.log(`   ❌ ${endpoint.desc}: ${error.response?.status || 'Error'}`);
      }
    }

  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

testDirectAPI();
