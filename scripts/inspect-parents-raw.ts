#!/usr/bin/env tsx

/**
 * Script to inspect raw D6 parent API response
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function inspectParentsRaw() {
  console.log('🔍 Inspecting Raw D6 Parents API Response\n');

  const schoolId = '1694';
  const baseUrl = 'https://integrate.d6plus.co.za/api/v1';
  const username = process.env.D6_API_USERNAME || 'espenaitestapi';
  const password = process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm';

  try {
    const endpoint = `${baseUrl}/adminplus/parents/${schoolId}`;
    console.log(`🎯 Testing endpoint: ${endpoint}\n`);

    const response = await axios.get(endpoint, {
      auth: { username, password },
      timeout: 10000
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Total Records: ${response.data.length}\n`);

    if (response.data.length > 0) {
      console.log('🔍 Raw Structure (First 3 Parents):');
      console.log('═'.repeat(80));
      
      response.data.slice(0, 3).forEach((parent: any, index: number) => {
        console.log(`\n📋 Parent ${index + 1}:`);
        console.log(JSON.stringify(parent, null, 2));
      });

      // Analyze field availability
      console.log('\n📈 Field Analysis:');
      console.log('═'.repeat(80));
      
      const sampleSize = Math.min(100, response.data.length);
      const sample = response.data.slice(0, sampleSize);
      
      const fieldStats = {} as Record<string, {present: number, empty: number, sample: any}>;
      
      sample.forEach((parent: any) => {
        Object.keys(parent).forEach(field => {
          if (!fieldStats[field]) {
            fieldStats[field] = {present: 0, empty: 0, sample: null};
          }
          
          const value = parent[field];
          if (value !== null && value !== undefined && value !== '') {
            fieldStats[field].present++;
            if (!fieldStats[field].sample) {
              fieldStats[field].sample = value;
            }
          } else {
            fieldStats[field].empty++;
          }
        });
      });

      console.log(`\nField Statistics (sample of ${sampleSize} parents):`);
      Object.entries(fieldStats).forEach(([field, stats]) => {
        const populatedPercent = ((stats.present / sampleSize) * 100).toFixed(1);
        console.log(`   ${field.padEnd(25)}: ${stats.present}/${sampleSize} populated (${populatedPercent}%)`);
        if (stats.sample) {
          const sampleStr = typeof stats.sample === 'string' ? 
                           stats.sample.substring(0, 30) : 
                           JSON.stringify(stats.sample).substring(0, 30);
          console.log(`${' '.repeat(29)}Sample: ${sampleStr}`);
        }
      });

      // Check for learner relationship data
      console.log('\n👶 Learner Relationship Analysis:');
      console.log('═'.repeat(80));
      
      const fieldsWithLearner = Object.keys(fieldStats).filter(field => 
        field.toLowerCase().includes('learner') || 
        field.toLowerCase().includes('child') ||
        field.toLowerCase().includes('student')
      );
      
      if (fieldsWithLearner.length > 0) {
        console.log('Found learner-related fields:');
        fieldsWithLearner.forEach(field => {
          console.log(`   ${field}: ${fieldStats[field].present} populated`);
        });
      } else {
        console.log('❌ No learner-related fields found');
        console.log('💡 Parent-child relationships may be in a separate endpoint');
      }

    } else {
      console.log('❌ No parent data returned');
    }

  } catch (error: any) {
    console.error('❌ Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the script
inspectParentsRaw().catch(console.error); 