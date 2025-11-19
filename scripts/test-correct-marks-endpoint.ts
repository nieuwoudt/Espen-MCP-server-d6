#!/usr/bin/env tsx

/**
 * Test the correct D6 marks endpoint from docs
 */

import dotenv from 'dotenv';
dotenv.config();

const schoolId = 1352; // Laerskool Monumentpark
const learnerId = 3043; // Known learner from Grade 7

const username = process.env.D6_API_USERNAME || 'espenaiapi';
const password = process.env.D6_API_PASSWORD || '';

async function main() {
  console.log('🧪 Testing Correct D6 Marks Endpoint');
  console.log('====================================');
  console.log(`School: ${schoolId} (Laerskool Monumentpark)`);
  console.log(`Learner: ${learnerId}\n`);

  const url = `https://integrate.d6plus.co.za/api/v1/currplus/learnersubjectmarks/${schoolId}?learner_id=${learnerId}`;
  
  console.log(`📡 GET ${url}`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'HTTP-X-USERNAME': username,
        'HTTP-X-PASSWORD': password,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ SUCCESS! D6 returned marks data');
      console.log('\n📊 Response structure:');
      console.log(`   Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      
      if (Array.isArray(data)) {
        console.log(`   Records: ${data.length} subjects`);
        if (data.length > 0) {
          console.log('\n📋 Sample subject:');
          console.log(JSON.stringify(data[0], null, 2));
          
          console.log('\n🎯 All subjects:');
          data.forEach((subject: any, i: number) => {
            console.log(`   ${i + 1}. ${subject.subject_name || subject.SubjectName} (${subject.subject_id || subject.SubjectID})`);
          });
        }
      } else {
        console.log('\n📄 Full response:');
        console.log(JSON.stringify(data, null, 2));
      }
      
      console.log('\n✅ Endpoint is working! Ready to deploy to Vercel.');
    } else {
      const text = await response.text();
      console.log('\n❌ D6 Error Response:');
      console.log(text);
      
      try {
        const errorJson = JSON.parse(text);
        console.log('\n📄 Parsed error:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch {
        // Not JSON, already printed raw text
      }
    }
  } catch (error) {
    console.log('\n❌ Request failed:');
    console.log(error instanceof Error ? error.message : String(error));
  }
}

main().catch(console.error);

