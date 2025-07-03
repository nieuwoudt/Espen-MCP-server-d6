#!/usr/bin/env tsx
// 🧪 Simple D6 API Test Script

import axios from 'axios';

const credentials = {
  baseUrl: 'https://d6.co.za',
  username: 'espenaitestapi',
  password: 'qUz3mPcRsfSWxKR9qEnm'
};

async function testD6API() {
  console.log('🧪 Testing D6 API Connection...\n');
  console.log(`Base URL: ${credentials.baseUrl}`);
  console.log(`Username: ${credentials.username}`);
  console.log(`Password: [HIDDEN]\n`);

  // Test different API patterns
  const testPatterns = [
    '/api',
    '/api/v1', 
    '/api/v2',
    '/rest/api',
    '/webapi',
    '/services'
  ];

  for (const pattern of testPatterns) {
    const url = `${credentials.baseUrl}${pattern}`;
    console.log(`Testing: ${url}`);
    
    try {
      // Test with Basic Auth
      const response = await axios.get(url, {
        auth: {
          username: credentials.username,
          password: credentials.password
        },
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status
      });
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Headers: ${JSON.stringify(response.headers['content-type'] || 'unknown')}`);
      
      if (response.status === 200) {
        console.log(`  ✅ Success! Response preview: ${JSON.stringify(response.data).substring(0, 200)}...`);
      } else if (response.status === 401) {
        console.log(`  🔐 Authentication required`);
      } else if (response.status === 404) {
        console.log(`  ❌ Not found`);
      } else {
        console.log(`  ⚠️  Unexpected status`);
      }
      
    } catch (error: any) {
      if (error.code === 'ENOTFOUND') {
        console.log(`  ❌ DNS Error - endpoint not found`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`  ❌ Connection refused`);
      } else if (error.code === 'ECONNRESET') {
        console.log(`  ❌ Connection reset`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    console.log('');
  }

  // Test specific D6 endpoints that might exist
  console.log('Testing potential D6 data endpoints...');
  const dataEndpoints = [
    '/api/learners',
    '/api/students', 
    '/api/pupils',
    '/api/data/learners',
    '/webapi/learners',
    '/rest/learners'
  ];

  for (const endpoint of dataEndpoints) {
    const url = `${credentials.baseUrl}${endpoint}`;
    console.log(`Testing: ${url}`);
    
    try {
      const response = await axios.get(url, {
        auth: {
          username: credentials.username,
          password: credentials.password
        },
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`  ✅ SUCCESS! Data endpoint found!`);
        console.log(`  Response: ${JSON.stringify(response.data).substring(0, 300)}...`);
        break; // Found working endpoint
      }
      
    } catch (error: any) {
      console.log(`  ❌ ${error.message}`);
    }
    console.log('');
  }

  console.log('Test completed. If no working endpoints were found,');
  console.log('the D6 system might use a different authentication method');
  console.log('or the API might not be publicly accessible.');
}

testD6API().catch(console.error); 