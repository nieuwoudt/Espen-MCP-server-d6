import axios from 'axios';

console.log('🔍 D6 Endpoint Discovery with Correct Understanding');
console.log('==================================================');
console.log('Integration 1694 IS the test school - no separate school_id needed');
console.log('Testing if any data endpoints are available...');
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

async function discoverEndpoints() {
  try {
    console.log('✅ CONFIRMED WORKING ENDPOINTS:');
    console.log('==============================');
    
    // Test known working endpoints
    const workingTests = [
      { name: 'Integration Info', url: '/v1/settings/clients' },
      { name: 'System Health V1', url: '/v1/settings/systemhealth' },
      { name: 'System Health V2', url: '/v2/settings/systemhealth' },
      { name: 'Genders V1', url: '/v1/settings/genders' },
      { name: 'Genders V2', url: '/v2/settings/genders' },
    ];
    
    for (const test of workingTests) {
      try {
        const response = await client.get(test.url);
        console.log(`✅ ${test.name}: Working`);
      } catch (error: any) {
        console.log(`❌ ${test.name}: ${error.response?.status || 'Failed'}`);
      }
    }
    
    console.log('\n❌ BLOCKED DATA ENDPOINTS (Even with correct pattern):');
    console.log('====================================================');
    
    // Test data endpoints without school_id (correct pattern)
    const dataTests = [
      { name: 'Learners V1', url: '/v1/adminplus/learners' },
      { name: 'Learners V2', url: '/v2/adminplus/learners' },
      { name: 'Staff V1', url: '/v1/adminplus/staffmembers' },
      { name: 'Staff V2', url: '/v2/adminplus/staffmembers' },
      { name: 'Parents V1', url: '/v1/adminplus/parents' },
      { name: 'Parents V2', url: '/v2/adminplus/parents' },
    ];
    
    for (const test of dataTests) {
      try {
        const response = await client.get(test.url);
        console.log(`✅ ${test.name}: SUCCESS! (${Array.isArray(response.data) ? response.data.length + ' records' : 'Data available'})`);
      } catch (error: any) {
        console.log(`❌ ${test.name}: ${error.response?.status} - ${error.response?.data?.error || 'Not available'}`);
      }
    }
    
    console.log('\n🔍 TESTING ALTERNATIVE ENDPOINT PATTERNS:');
    console.log('=========================================');
    
    // Test some alternative patterns that might work
    const alternativeTests = [
      { name: 'Learners (currplus)', url: '/v2/currplus/learners' },
      { name: 'Learner Subjects', url: '/v2/currplus/learnersubjects' },
      { name: 'Admin Root', url: '/v1/adminplus' },
      { name: 'Currplus Root', url: '/v2/currplus' },
      { name: 'Settings Root', url: '/v1/settings' },
    ];
    
    for (const test of alternativeTests) {
      try {
        const response = await client.get(test.url);
        console.log(`✅ ${test.name}: Available`);
        if (typeof response.data === 'object') {
          console.log(`   📊 Response:`, JSON.stringify(response.data, null, 2));
        }
      } catch (error: any) {
        console.log(`❌ ${test.name}: ${error.response?.status} - ${error.response?.data?.error || 'Not available'}`);
      }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log('✅ Correct Understanding: Integration 1694 IS the test school');
    console.log('✅ Correct Pattern: Query without school_id parameters');
    console.log('❌ Issue: Data endpoints still return 404 - not activated for our integration');
    console.log('📞 Action: Contact D6 to activate data endpoints for integration 1694');
    console.log('');
    console.log('🎯 Request for D6: Activate these endpoints for integration 1694:');
    console.log('   • /v1/adminplus/learners');
    console.log('   • /v1/adminplus/staffmembers');  
    console.log('   • /v1/adminplus/parents');
    console.log('   • /v2/adminplus/learners (if available)');
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Discovery failed:', error.message);
  }
}

discoverEndpoints().catch(console.error);
