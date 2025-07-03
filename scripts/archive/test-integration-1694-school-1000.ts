import axios from 'axios';

console.log('🏫 Testing CORRECT D6 Architecture');
console.log('==================================');
console.log('Theory: Integration 1694 contains School 1000 with the mock data');
console.log('Integration 1694 = Test Environment');
console.log('School 1000 = "d6 + Primary School" (the actual mock school with 1,270+ records)');
console.log('');

const client = axios.create({
  baseURL: 'https://integrate.d6plus.co.za/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'HTTP-X-USERNAME': 'espenaitestapi',
    'HTTP-X-PASSWORD': 'qUz3mPcRsfSWxKR9qEnm',
  },
});

async function testCorrectArchitecture() {
  try {
    console.log('🔍 Step 1: Confirm Integration 1694 is accessible');
    console.log('================================================');
    
    const integrations = await client.get('/v1/settings/clients');
    console.log('✅ Integration available:', integrations.data[0].school_name);
    console.log('✅ Integration ID:', integrations.data[0].school_login_id);
    
    console.log('\n🎯 Step 2: Try to access School 1000 through Integration 1694');
    console.log('============================================================');
    
    // Test various ways to access school 1000 data through integration 1694
    const testCases = [
      // Basic attempts
      { name: 'V1 Learners by school_id', url: '/v1/adminplus/learners?school_id=1000' },
      { name: 'V2 Learners by school_id', url: '/v2/adminplus/learners?school_id=1000' },
      
      // Try with integration context
      { name: 'V1 Learners with integration', url: '/v1/adminplus/learners?integration_id=1694&school_id=1000' },
      { name: 'V2 Learners with integration', url: '/v2/adminplus/learners?integration_id=1694&school_id=1000' },
      
      // Try hierarchical access
      { name: 'V1 Integration/School path', url: '/v1/integrations/1694/schools/1000/learners' },
      { name: 'V2 Integration/School path', url: '/v2/integrations/1694/schools/1000/learners' },
      
      // Try school-specific endpoints
      { name: 'V1 Schools endpoint', url: '/v1/schools/1000' },
      { name: 'V2 Schools endpoint', url: '/v2/schools/1000' },
      { name: 'V1 School learners', url: '/v1/schools/1000/learners' },
      { name: 'V2 School learners', url: '/v2/schools/1000/learners' },
      
      // Try alternative parameter names
      { name: 'V1 by school_login_id', url: '/v1/adminplus/learners?school_login_id=1000' },
      { name: 'V2 by school_login_id', url: '/v2/adminplus/learners?school_login_id=1000' },
    ];
    
    for (const test of testCases) {
      try {
        const response = await client.get(test.url);
        console.log(`✅ ${test.name}: SUCCESS!`);
        console.log(`   📊 Data found: ${Array.isArray(response.data) ? response.data.length + ' records' : 'Data available'}`);
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log(`   📋 Sample record:`, JSON.stringify(response.data[0], null, 2));
        }
      } catch (error: any) {
        const status = error.response?.status || 'No response';
        const errorMsg = error.response?.data?.error || error.message;
        console.log(`❌ ${test.name}: ${status} - ${errorMsg}`);
      }
    }
    
    console.log('\n🔍 Step 3: Look for School Management Endpoints');
    console.log('==============================================');
    
    const schoolManagementTests = [
      { name: 'List all schools', url: '/v1/schools' },
      { name: 'List schools V2', url: '/v2/schools' },
      { name: 'Integration schools', url: '/v1/integrations/1694/schools' },
      { name: 'Admin schools', url: '/v1/adminplus/schools' },
      { name: 'School info 1000', url: '/v1/schools/1000/info' },
    ];
    
    for (const test of schoolManagementTests) {
      try {
        const response = await client.get(test.url);
        console.log(`✅ ${test.name}: SUCCESS!`);
        console.log(`   📊 Response:`, JSON.stringify(response.data, null, 2));
      } catch (error: any) {
        const status = error.response?.status || 'No response';
        const errorMsg = error.response?.data?.error || error.message;
        console.log(`❌ ${test.name}: ${status} - ${errorMsg}`);
      }
    }
    
    console.log('\n📋 Summary & Insights');
    console.log('=====================');
    console.log('🎯 Integration 1694 = Test Environment (accessible)');
    console.log('🎯 School 1000 = Mock school inside integration 1694 (contains the 1,270+ records)');
    console.log('💡 Need to find the correct API pattern to access school 1000 data');
    console.log('📞 Contact D6: apidocs@d6.co.za with endpoint discovery results');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorrectArchitecture().catch(console.error);
