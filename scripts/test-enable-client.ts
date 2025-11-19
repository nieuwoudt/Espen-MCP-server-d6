#!/usr/bin/env tsx

/**
 * Test the D6 client integration enablement endpoint
 * Per Patrick's spec: PATCH /v1/settings/clients/{school_id}
 */

import dotenv from 'dotenv';
dotenv.config();

const schoolId = 1352; // Laerskool Monumentpark
const apiTypeId = 8; // D6 Integrate API
const state = 1; // Enable

const username = process.env.D6_API_USERNAME || 'espenaiapi';
const password = process.env.D6_API_PASSWORD || '';

async function main() {
  console.log('🧪 Testing D6 Client Integration Enablement');
  console.log('==========================================');
  console.log(`School: ${schoolId} (Laerskool Monumentpark)`);
  console.log(`API Type ID: ${apiTypeId}`);
  console.log(`State: ${state} (enable)\n`);

  const url = `https://integrate.d6plus.co.za/api/v1/settings/clients/${schoolId}`;
  const body = {
    api_type_id: apiTypeId,
    state,
  };
  
  console.log(`📡 PATCH ${url}`);
  console.log(`Body: ${JSON.stringify(body, null, 2)}\n`);

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'HTTP-X-USERNAME': username,
        'HTTP-X-PASSWORD': password,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok || response.status === 204) {
      console.log('\n✅ SUCCESS! Client integration enabled');
      
      if (response.status !== 204) {
        const data = await response.json();
        console.log('\n📄 Response:');
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('\n(No content - 204 response)');
      }
      
      console.log('\n✅ Next step: Test get_learner_marks to see if marks access now works');
    } else {
      const text = await response.text();
      console.log('\n❌ D6 Error Response:');
      console.log(text);
      
      try {
        const errorJson = JSON.parse(text);
        console.log('\n📄 Parsed error:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch {
        // Not JSON
      }
    }
  } catch (error) {
    console.log('\n❌ Request failed:');
    console.log(error instanceof Error ? error.message : String(error));
  }
}

main().catch(console.error);

