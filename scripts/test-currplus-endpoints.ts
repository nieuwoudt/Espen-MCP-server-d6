#!/usr/bin/env tsx

/**
 * Test all three Curriculum+ endpoints now enabled by D6
 */

import dotenv from 'dotenv';
dotenv.config();

const schoolId = 1352; // Laerskool Monumentpark
const learnerId = 3043; // Known learner from Grade 7

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

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS!`);
      console.log(`   Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      if (Array.isArray(data)) {
        console.log(`   Records: ${data.length}`);
        if (data.length > 0) {
          console.log(`   Sample:\n${JSON.stringify(data[0], null, 2).substring(0, 300)}...`);
        }
      } else {
        console.log(`   Data:\n${JSON.stringify(data, null, 2).substring(0, 300)}...`);
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
  console.log('🔍 Testing Curriculum+ Endpoints (D6 Enabled)');
  console.log('=============================================');
  console.log(`School ID: ${schoolId} (Laerskool Monumentpark)`);
  console.log(`Learner ID: ${learnerId}`);
  console.log('');

  const baseUrl = 'https://integrate.d6plus.co.za/api/v1/currplus';

  const endpoints = [
    {
      url: `${baseUrl}/learnersubjectmarks/${schoolId}?learner_id=${learnerId}`,
      label: 'Curriculum+ Learner Subject Marks'
    },
    {
      url: `${baseUrl}/learnersubjects/${schoolId}?learner_id=${learnerId}`,
      label: 'Curriculum+ Learner Subjects'
    },
    {
      url: `${baseUrl}/learnersubjectsperterm/${schoolId}?learner_id=${learnerId}`,
      label: 'Curriculum+ Learner Subjects Per Term'
    },
  ];

  const results: boolean[] = [];

  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint.url, endpoint.label);
    results.push(success);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  const successCount = results.filter(r => r).length;
  console.log(`✅ Successful: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successCount}/${results.length}`);

  if (successCount === results.length) {
    console.log('\n🎉 All Curriculum+ endpoints are working!');
    console.log('Ready to add get_learner_subjects_per_term tool to MCP server');
  } else {
    console.log('\n⚠️  Some endpoints still failing - may need more time or support');
  }
}

main().catch(console.error);

