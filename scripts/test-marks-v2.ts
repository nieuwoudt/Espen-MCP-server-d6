#!/usr/bin/env tsx

/**
 * Test v2 API and check if marks come with learner data
 */

import dotenv from 'dotenv';
dotenv.config();

const schoolId = 1352;
const learnerId = 3043;
const username = process.env.D6_API_USERNAME || 'espenaiapi';
const password = process.env.D6_API_PASSWORD || '';

async function testEndpoint(url: string, label: string) {
  console.log(`\n🧪 ${label}`);
  console.log(`   GET ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'HTTP-X-USERNAME': username,
        'HTTP-X-PASSWORD': password,
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS!`);
      console.log(`   Full response:\n${JSON.stringify(data, null, 2)}`);
      return data;
    } else {
      const text = await response.text();
      console.log(`   ❌ ${text.substring(0, 150)}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main() {
  console.log('🔍 D6 API v2 & Learner Data Check');
  console.log('==================================\n');

  const baseV1 = 'https://integrate.d6plus.co.za/api/v1';
  const baseV2 = 'https://integrate.d6plus.co.za/api/v2';

  // Test v2 endpoints
  console.log('\n📍 Testing V2 API Endpoints');
  await testEndpoint(`${baseV2}/adminplus/assessments/${schoolId}?learner_id=${learnerId}`, 'V2: assessments with learner_id');
  await testEndpoint(`${baseV2}/adminplus/marks/${schoolId}?learner_id=${learnerId}`, 'V2: marks with learner_id');
  await testEndpoint(`${baseV2}/adminplus/learnermarks/${schoolId}?learner_id=${learnerId}`, 'V2: learnermarks');
  
  // Check if marks are in learner data
  console.log('\n\n📍 Checking Learner Data for Marks');
  const learnerData = await testEndpoint(`${baseV1}/adminplus/learners/${schoolId}?limit=5`, 'Get learners to check structure');
  
  if (learnerData) {
    console.log('\n📊 Analyzing learner data structure...');
    const items = learnerData.items || learnerData.data || learnerData;
    if (Array.isArray(items) && items.length > 0) {
      const sample = items[0];
      console.log('\nSample learner fields:', Object.keys(sample).join(', '));
      if (sample.marks || sample.assessments || sample.academic_records) {
        console.log('✅ Found marks/assessments in learner data!');
      } else {
        console.log('❌ No marks/assessments fields in learner data');
      }
    }
  }

  // Try alternative patterns
  console.log('\n\n📍 Testing Alternative Patterns');
  await testEndpoint(`${baseV1}/adminplus/learner/${learnerId}/marks?school_login_id=${schoolId}`, 'Learner-first: /learner/{id}/marks');
  await testEndpoint(`${baseV1}/adminplus/marks?school_login_id=${schoolId}&learner_id=${learnerId}`, 'Query-based: /marks?school_login_id=X&learner_id=Y');
  await testEndpoint(`${baseV1}/currplus/marks?school_login_id=${schoolId}&learner_id=${learnerId}`, 'CurrPlus query-based');
  await testEndpoint(`${baseV1}/academic/marks/${schoolId}?learner_id=${learnerId}`, 'Academic module');
  await testEndpoint(`${baseV1}/reports/learner/${learnerId}/marks?school_login_id=${schoolId}`, 'Reports module');
}

main().catch(console.error);

