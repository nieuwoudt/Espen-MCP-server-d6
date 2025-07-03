import axios from 'axios';

console.log('🏫 D6 Dual School Environment Test');
console.log('==================================');
console.log('Testing BOTH schools D6 gave us access to:');
console.log('1. "d6 + Primary School" (ID: 1000) - Internal demo tenant');
console.log('2. "d6 Integrate API Test School" (ID: 1694) - Authorized test environment');
console.log('');

// Create D6 API clients
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

async function testBothSchools() {
  try {
    console.log('🔍 Step 1: Basic API Connectivity Test');
    console.log('=====================================');
    
    // Test basic connectivity
    try {
      const healthV1 = await clientV1.get('/settings/systemhealth');
      console.log('✅ V1 API: Connected');
    } catch (error) {
      console.log('❌ V1 API: Failed');
    }
    
    try {
      const healthV2 = await clientV2.get('/settings/systemhealth');
      console.log('✅ V2 API: Connected');
    } catch (error) {
      console.log('❌ V2 API: Failed');
    }
    
    console.log('\n🏢 Step 2: Client Integrations Available');
    console.log('========================================');
    
    try {
      const integrations = await clientV1.get('/settings/clients');
      console.log('✅ Integrations endpoint working');
      console.log('📋 Available integrations:', JSON.stringify(integrations.data, null, 2));
    } catch (error: any) {
      console.log('❌ Failed to get integrations:', error.response?.data || error.message);
    }
    
    console.log('\n🎯 Step 3: Testing School 1000 ("d6 + Primary School")');
    console.log('======================================================');
    
    const school1000Tests = [
      { desc: 'Learners V1', url: '/adminplus/learners?school_id=1000' },
      { desc: 'Learners V2', url: '/adminplus/learners?school_id=1000' },
      { desc: 'Staff V1', url: '/adminplus/staffmembers?school_id=1000' },
      { desc: 'Staff V2', url: '/adminplus/staffmembers?school_id=1000' },
      { desc: 'Parents V1', url: '/adminplus/parents?school_id=1000' },
      { desc: 'Parents V2', url: '/adminplus/parents?school_id=1000' },
    ];
    
    for (const test of school1000Tests) {
      try {
        const client = test.desc.includes('V2') ? clientV2 : clientV1;
        const response = await client.get(test.url);
        console.log(`✅ ${test.desc}: SUCCESS - ${response.data.length || 'Data available'}`);
        if (response.data.length > 0) {
          console.log(`   📊 Sample: ${JSON.stringify(response.data[0], null, 2)}`);
        }
      } catch (error: any) {
        console.log(`❌ ${test.desc}: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n🎯 Step 4: Testing School 1694 ("d6 Integrate API Test School")');
    console.log('===============================================================');
    
    const school1694Tests = [
      { desc: 'Learners V1', url: '/adminplus/learners?school_id=1694' },
      { desc: 'Learners V2', url: '/adminplus/learners?school_id=1694' },
      { desc: 'Staff V1', url: '/adminplus/staffmembers?school_id=1694' },
      { desc: 'Staff V2', url: '/adminplus/staffmembers?school_id=1694' },
      { desc: 'Parents V1', url: '/adminplus/parents?school_id=1694' },
      { desc: 'Parents V2', url: '/adminplus/parents?school_id=1694' },
    ];
    
    for (const test of school1694Tests) {
      try {
        const client = test.desc.includes('V2') ? clientV2 : clientV1;
        const response = await client.get(test.url);
        console.log(`✅ ${test.desc}: SUCCESS - ${response.data.length || 'Data available'}`);
        if (response.data.length > 0) {
          console.log(`   📊 Sample: ${JSON.stringify(response.data[0], null, 2)}`);
        }
      } catch (error: any) {
        console.log(`❌ ${test.desc}: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n📊 Step 5: Summary & Next Steps');
    console.log('===============================');
    console.log('🎯 School 1000 (d6 + Primary School): Internal demo tenant');
    console.log('🎯 School 1694 (d6 Integrate API Test School): Authorized test environment');
    console.log('💡 Target: Access to 1,270+ learners, 77+ staff, 1,523+ parents');
    console.log('📞 Contact: apidocs@d6.co.za for endpoint activation');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testBothSchools().catch(console.error);
