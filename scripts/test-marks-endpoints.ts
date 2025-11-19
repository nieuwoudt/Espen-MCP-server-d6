#!/usr/bin/env tsx

/**
 * Test different D6 API endpoint patterns for learner marks
 */

import dotenv from 'dotenv';
dotenv.config();

const schoolId = 1352; // Laerskool Monumentpark
const learnerId = 3043; // Known learner ID from Grade 7 data

const username = process.env.D6_API_USERNAME || 'espenaiapi';
const password = process.env.D6_API_PASSWORD || '';

async function testEndpoint(method: string, url: string, label: string) {
  console.log(`\n🧪 Testing: ${label}`);
  console.log(`   ${method} ${url}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'HTTP-X-USERNAME': username,
        'HTTP-X-PASSWORD': password,
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS!`);
      console.log(`   Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      if (Array.isArray(data)) {
        console.log(`   Records: ${data.length}`);
        if (data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0], null, 2).substring(0, 200)}...`);
        }
      } else {
        console.log(`   Data: ${JSON.stringify(data, null, 2).substring(0, 300)}...`);
      }
      return true;
    } else {
      const text = await response.text();
      console.log(`   ❌ Failed: ${text.substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('🔍 D6 Learner Marks Endpoint Discovery');
  console.log('=====================================');
  console.log(`School ID: ${schoolId} (Laerskool Monumentpark)`);
  console.log(`Learner ID: ${learnerId}`);
  console.log('');

  const baseUrl = 'https://integrate.d6plus.co.za/api';

  // Test different patterns based on working endpoints
  const patterns = [
    // Pattern 1: assessments with learner_id query param (current implementation)
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/assessments/${schoolId}?learner_id=${learnerId}`,
      label: 'Current: /v1/adminplus/assessments/{school}?learner_id={id}'
    },
    
    // Pattern 2: learnermarks endpoint
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/learnermarks/${schoolId}?learner_id=${learnerId}`,
      label: 'Try: /v1/adminplus/learnermarks/{school}?learner_id={id}'
    },
    
    // Pattern 3: marks endpoint
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/marks/${schoolId}?learner_id=${learnerId}`,
      label: 'Try: /v1/adminplus/marks/{school}?learner_id={id}'
    },
    
    // Pattern 4: nested under learners
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/learners/${schoolId}/${learnerId}/marks`,
      label: 'Try: /v1/adminplus/learners/{school}/{learner}/marks'
    },
    
    // Pattern 5: nested under learners with assessments
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/learners/${schoolId}/${learnerId}/assessments`,
      label: 'Try: /v1/adminplus/learners/{school}/{learner}/assessments'
    },
    
    // Pattern 6: CurrPlus module
    {
      method: 'GET',
      url: `${baseUrl}/v1/currplus/learnermarks/${schoolId}?learner_id=${learnerId}`,
      label: 'Try: /v1/currplus/learnermarks/{school}?learner_id={id}'
    },
    
    // Pattern 7: All assessments for school (no learner filter)
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/assessments/${schoolId}`,
      label: 'Try: /v1/adminplus/assessments/{school} (all)'
    },
    
    // Pattern 8: All marks for school
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/marks/${schoolId}`,
      label: 'Try: /v1/adminplus/marks/{school} (all)'
    },
    
    // Pattern 9: learnerID in path instead of query
    {
      method: 'GET',
      url: `${baseUrl}/v1/adminplus/assessments/${schoolId}/${learnerId}`,
      label: 'Try: /v1/adminplus/assessments/{school}/{learner}'
    },
  ];

  const successfulEndpoints: string[] = [];

  for (const pattern of patterns) {
    const success = await testEndpoint(pattern.method, pattern.url, pattern.label);
    if (success) {
      successfulEndpoints.push(pattern.label);
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  if (successfulEndpoints.length > 0) {
    console.log(`\n✅ Working endpoints (${successfulEndpoints.length}):`);
    successfulEndpoints.forEach(endpoint => console.log(`   - ${endpoint}`));
  } else {
    console.log('\n❌ No working endpoints found');
    console.log('\n💡 Recommendations:');
    console.log('   1. Check D6 API documentation for correct endpoint');
    console.log('   2. Verify marks/assessments are activated for school 1352');
    console.log('   3. Contact D6 support for endpoint structure');
  }
}

main().catch(console.error);

