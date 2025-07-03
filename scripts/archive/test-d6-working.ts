#!/usr/bin/env tsx

/**
 * Test script using the WORKING D6 API endpoints we discovered
 * Working endpoints: settings/clients, adminplus/lookup/genders
 */

import axios from 'axios';

async function testWorkingD6Endpoints() {
  console.log('🎯 Testing Working D6 API Endpoints\n');
  
  const client = axios.create({
    baseURL: 'https://integrate.d6plus.co.za/api/v1', // Both v1 and v2 work
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Espen-D6-MCP-Server/1.0.0',
      'HTTP-X-USERNAME': 'espenaitestapi',
      'HTTP-X-PASSWORD': 'qUz3mPcRsfSWxKR9qEnm',
    },
  });

  try {
    console.log('🏢 Step 1: Getting school/client information...');
    const clientsResponse = await client.get('settings/clients');
    console.log('✅ settings/clients endpoint successful');
    console.log('Response:', JSON.stringify(clientsResponse.data, null, 2));
    
    if (Array.isArray(clientsResponse.data) && clientsResponse.data.length > 0) {
      const school = clientsResponse.data[0];
      console.log('\n📋 School Details:');
      console.log(`- School Name: ${school.school_name}`);
      console.log(`- School Login ID: ${school.school_login_id}`);
      console.log(`- Admin Email: ${school.admin_email_address}`);
      console.log(`- Phone: ${school.telephone_calling_code}${school.telephone_number}`);
      console.log(`- API Type: ${school.api_type} (ID: ${school.api_type_id})`);
      console.log(`- Activated by Integrator: ${school.activated_by_integrator}`);
      
      // Check if this has school_id
      if (school.school_id) {
        console.log(`- School ID: ${school.school_id}`);
      }
    }

    console.log('\n📊 Step 2: Getting lookup data...');
    const gendersResponse = await client.get('adminplus/lookup/genders');
    console.log('✅ adminplus/lookup/genders endpoint successful');
    console.log('Available genders:', gendersResponse.data);

    console.log('\n🔍 Step 3: Testing other adminplus lookup endpoints...');
    const lookupTypes = [
      'grades',
      'languages',
      'subjects',
      'classes',
      'terms',
      'provinces',
      'schools',
      'learners',
      'staff',
      'parents'
    ];

    const workingLookups = [];
    for (const lookupType of lookupTypes) {
      try {
        const response = await client.get(`adminplus/lookup/${lookupType}`);
        console.log(`✅ adminplus/lookup/${lookupType}: ${response.data.length} items`);
        workingLookups.push({
          type: lookupType,
          count: response.data.length,
          sample: response.data.slice(0, 2)
        });
      } catch (error: any) {
        console.log(`❌ adminplus/lookup/${lookupType}: ${error.response?.status || 'ERROR'}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n🔍 Step 4: Testing data endpoints with school login ID...');
    const school = clientsResponse.data[0];
    const schoolLoginId = school.school_login_id;
    
    const dataEndpoints = [
      `data/learners?school_login_id=${schoolLoginId}`,
      `data/staff?school_login_id=${schoolLoginId}`,
      `data/parents?school_login_id=${schoolLoginId}`,
      `data/marks?school_login_id=${schoolLoginId}`,
      `schools/${schoolLoginId}/learners`,
      `schools/${schoolLoginId}/staff`,
      `clients/${schoolLoginId}/learners`,
      `clients/${schoolLoginId}/staff`,
      `${schoolLoginId}/learners`,
      `${schoolLoginId}/staff`
    ];

    const workingDataEndpoints = [];
    for (const endpoint of dataEndpoints) {
      try {
        const response = await client.get(endpoint);
        console.log(`✅ ${endpoint}: ${Array.isArray(response.data) ? response.data.length : 'object'} items`);
        workingDataEndpoints.push({
          endpoint,
          data: response.data
        });
      } catch (error: any) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'ERROR'}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n📋 Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Working lookup endpoints: ${workingLookups.length}`);
    workingLookups.forEach(lookup => {
      console.log(`   - ${lookup.type}: ${lookup.count} items`);
    });
    
    console.log(`✅ Working data endpoints: ${workingDataEndpoints.length}`);
    workingDataEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint.endpoint}`);
    });

    if (workingLookups.length > 0) {
      console.log('\n🎯 Next Steps:');
      console.log('1. Update D6ApiServiceHybrid to use working endpoints');
      console.log('2. Use school_login_id instead of school_id for data queries');
      console.log('3. Implement proper endpoint mapping for learners, staff, etc.');
      console.log('4. Update MCP server to use real D6 data');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testWorkingD6Endpoints().catch(console.error); 