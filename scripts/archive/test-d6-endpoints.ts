#!/usr/bin/env tsx

/**
 * D6 API Endpoint Discovery Script
 * Testing various endpoints to understand the integration setup
 */

import axios from 'axios';

async function discoverD6Endpoints() {
  console.log('🔍 D6 API Endpoint Discovery\n');
  
  const baseUrls = [
    'https://integrate.d6plus.co.za/api/v1',
    'https://integrate.d6plus.co.za/api/v2'
  ];
  
  const credentials = {
    username: 'espenaitestapi',
    password: 'qUz3mPcRsfSWxKR9qEnm'
  };

  const testEndpoints = [
    // Authentication endpoints
    'auth/login',
    'auth/token',
    
    // Settings and configuration
    'settings',
    'settings/clientintegrations',
    'settings/clients',
    'settings/integrations',
    
    // School/client data
    'clients',
    'schools',
    'clientintegrations',
    'integrations',
    
    // Lookup data
    'lookup/genders',
    'adminplus/lookup/genders',
    'lookups/genders',
    
    // School-specific data (using school ID 1000)
    'schools/1000',
    'schools/1000/learners',
    'schools/1000/staff',
    'learners?school_id=1000',
    'staff?school_id=1000',
    
    // Direct data endpoints
    'learners',
    'staff',
    'parents',
    'marks'
  ];

  for (const baseUrl of baseUrls) {
    console.log(`\n🌐 Testing ${baseUrl}:`);
    console.log('='.repeat(50));
    
    const client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Espen-D6-MCP-Server/1.0.0',
        'HTTP-X-USERNAME': credentials.username,
        'HTTP-X-PASSWORD': credentials.password,
      },
    });

    for (const endpoint of testEndpoints) {
      try {
        const response = await client.get(endpoint);
        console.log(`✅ ${endpoint}: ${response.status} - ${JSON.stringify(response.data).length} bytes`);
        
        // Show sample data for successful responses
        if (response.data && typeof response.data === 'object') {
          if (Array.isArray(response.data)) {
            console.log(`   📊 Array with ${response.data.length} items`);
            if (response.data.length > 0) {
              console.log(`   📝 Sample: ${JSON.stringify(response.data[0]).substring(0, 100)}...`);
            }
          } else {
            console.log(`   📝 Object keys: ${Object.keys(response.data).join(', ')}`);
          }
        }
        
      } catch (error: any) {
        const status = error.response?.status || 'TIMEOUT';
        const message = error.response?.data?.error_description || error.response?.data?.message || error.message;
        
        if (status === 404) {
          console.log(`❌ ${endpoint}: 404 - Not Found`);
        } else if (status === 401 || status === 403) {
          console.log(`🔐 ${endpoint}: ${status} - Authentication/Authorization issue`);
        } else if (status === 500) {
          console.log(`💥 ${endpoint}: 500 - Server Error`);
        } else {
          console.log(`⚠️  ${endpoint}: ${status} - ${message}`);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n🎯 Integration-Specific Tests:');
  console.log('='.repeat(50));
  
  // Test with integration ID 1694
  console.log('\n🔗 Testing with Integration ID 1694:');
  
  const integrationEndpoints = [
    'integrations/1694',
    'integrations/1694/schools',
    'integrations/1694/clients',
    'clients/1694',
    'settings/integrations/1694'
  ];

  for (const baseUrl of baseUrls) {
    const client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Espen-D6-MCP-Server/1.0.0',
        'HTTP-X-USERNAME': credentials.username,
        'HTTP-X-PASSWORD': credentials.password,
      },
    });

    for (const endpoint of integrationEndpoints) {
      try {
        const response = await client.get(endpoint);
        console.log(`✅ ${baseUrl}/${endpoint}: ${response.status}`);
        if (response.data) {
          console.log(`   📝 Data: ${JSON.stringify(response.data).substring(0, 200)}...`);
        }
      } catch (error: any) {
        const status = error.response?.status || 'ERROR';
        console.log(`❌ ${baseUrl}/${endpoint}: ${status}`);
      }
    }
  }

  console.log('\n📋 Summary & Next Steps:');
  console.log('='.repeat(50));
  console.log('1. Check which endpoints returned 200 status');
  console.log('2. Verify integration 1694 is properly linked');
  console.log('3. Ensure school ID 1000 is accessible through our integration');
  console.log('4. Contact D6 support with successful endpoint findings');
}

discoverD6Endpoints().catch(console.error); 