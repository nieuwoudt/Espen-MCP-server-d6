#!/usr/bin/env tsx
// 🧪 Test Real D6 Data Access with Updated Endpoints

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';

async function testRealD6Data() {
  console.log('🧪 Testing updated D6 API endpoints...');
  console.log('=====================================');

  const config = {
    baseUrl: 'https://integrate.d6plus.co.za/api/v2',
    username: 'espenaitestapi',
    password: 'qUz3mPcRsfSWxKR9qEnm',
    enableMockData: true,
    useMockDataFirst: false
  };

  const d6Service = D6ApiServiceHybrid.getInstance(config);
  
  // Initialize the service to check API availability
  console.log('🔧 Initializing D6 API service...');
  await d6Service.initialize();

  // Test 1: Learners endpoint
  console.log('\n📋 Testing learners endpoint (v1/adminplus/learners)...');
  try {
    const learners = await d6Service.getLearners(1000, { limit: 5 });
    console.log('✅ SUCCESS: Learners data received!');
    console.log(`   Found ${learners.length} learners`);
    if (learners.length > 0) {
      console.log('   Sample learner:', JSON.stringify(learners[0], null, 2));
    }
  } catch (error: any) {
    console.log('❌ FAILED: Learners endpoint error');
    console.log(`   Error: ${error.message}`);
    if (error.response?.status) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  // Test 2: Staff endpoint
  console.log('\n👨‍🏫 Testing staff endpoint (v1/adminplus/staff)...');
  try {
    const staff = await d6Service.getStaff(1000);
    console.log('✅ SUCCESS: Staff data received!');
    console.log(`   Found ${staff.length} staff members`);
    if (staff.length > 0) {
      console.log('   Sample staff:', JSON.stringify(staff[0], null, 2));
    }
  } catch (error: any) {
    console.log('❌ FAILED: Staff endpoint error');
    console.log(`   Error: ${error.message}`);
    if (error.response?.status) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  // Test 3: Parents endpoint
  console.log('\n👪 Testing parents endpoint (v3/adminplus/parents)...');
  try {
    const parents = await d6Service.getParents(1000);
    console.log('✅ SUCCESS: Parents data received!');
    console.log(`   Found ${parents.length} parents`);
    if (parents.length > 0) {
      console.log('   Sample parent:', JSON.stringify(parents[0], null, 2));
    }
  } catch (error: any) {
    console.log('❌ FAILED: Parents endpoint error');
    console.log(`   Error: ${error.message}`);
    if (error.response?.status) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  // Test 4: Working endpoints for comparison
  console.log('\n✅ Testing known working endpoints...');
  try {
    const schools = await d6Service.getClientIntegrations();
    console.log(`✅ Schools endpoint working: ${schools.length} schools found`);
    
    const genders = await d6Service.getLookupData('genders');
    console.log(`✅ Genders lookup working: ${genders.length} genders found`);
  } catch (error: any) {
    console.log('❌ Even working endpoints failed:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('==========');
  console.log('• School 1000 is linked to integration 1694');
  console.log('• D6 confirmed 1,270 learners, 77 staff, 1,523 parents available');
  console.log('• Updated endpoints to match D6 documentation structure');
  console.log('• If still getting 404s, integration needs additional API permissions');
}

testRealD6Data()
  .then(() => {
    console.log('\n🏁 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 