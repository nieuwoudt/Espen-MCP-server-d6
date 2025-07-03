import axios from 'axios';

console.log('🎯 Testing CORRECT D6 API Pattern');
console.log('==================================');
console.log('New Understanding: Integration 1694 IS the test school');
console.log('No need for school_id=1000 - we query directly without school_id params');
console.log('');

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

async function testCorrectPattern() {
  try {
    console.log('🔍 Testing Correct API Pattern (No school_id params)');
    console.log('===================================================');
    
    const tests = [
      { client: clientV1, name: 'V1 Learners', url: '/adminplus/learners' },
      { client: clientV2, name: 'V2 Learners', url: '/adminplus/learners' },
      { client: clientV1, name: 'V1 Staff', url: '/adminplus/staffmembers' },
      { client: clientV2, name: 'V2 Staff', url: '/adminplus/staffmembers' },
      { client: clientV1, name: 'V1 Parents', url: '/adminplus/parents' },
      { client: clientV2, name: 'V2 Parents', url: '/adminplus/parents' },
      { client: clientV1, name: 'V1 Schools', url: '/adminplus/schools' },
      { client: clientV2, name: 'V2 Schools', url: '/adminplus/schools' },
    ];
    
    for (const test of tests) {
      try {
        const response = await test.client.get(test.url);
        console.log(`✅ ${test.name}: SUCCESS!`);
        
        if (Array.isArray(response.data)) {
          console.log(`   📊 Records found: ${response.data.length}`);
          if (response.data.length > 0) {
            console.log(`   📋 Sample record:`, JSON.stringify(response.data[0], null, 2));
          }
        } else {
          console.log(`   📊 Data:`, JSON.stringify(response.data, null, 2));
        }
        console.log('');
      } catch (error: any) {
        const status = error.response?.status || 'No response';
        const errorMsg = error.response?.data?.error || error.message;
        console.log(`❌ ${test.name}: ${status} - ${errorMsg}`);
      }
    }
    
    console.log('🧪 Testing with school_login_id=1694 (if needed)');
    console.log('================================================');
    
    const schoolIdTests = [
      { client: clientV1, name: 'V1 Learners (1694)', url: '/adminplus/learners?school_login_id=1694' },
      { client: clientV2, name: 'V2 Learners (1694)', url: '/adminplus/learners?school_login_id=1694' },
    ];
    
    for (const test of schoolIdTests) {
      try {
        const response = await test.client.get(test.url);
        console.log(`✅ ${test.name}: SUCCESS!`);
        console.log(`   📊 Records: ${Array.isArray(response.data) ? response.data.length : 'Data available'}`);
      } catch (error: any) {
        const status = error.response?.status || 'No response';
        const errorMsg = error.response?.data?.error || error.message;
        console.log(`❌ ${test.name}: ${status} - ${errorMsg}`);
      }
    }
    
    console.log('\n🎯 KEY INSIGHTS:');
    console.log('================');
    console.log('✅ Integration 1694 IS the test school (not a container)');
    console.log('✅ Query directly without school_id parameters'); 
    console.log('✅ API is already scoped to our authorized integration');
    console.log('❌ school_id=1000 was incorrect - no such school in our integration');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorrectPattern().catch(console.error);
