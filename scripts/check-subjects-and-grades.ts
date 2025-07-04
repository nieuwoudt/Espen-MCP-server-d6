#!/usr/bin/env tsx

/**
 * Script to check if D6 has subjects and grades/marks data
 */

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkSubjectsAndGrades() {
  console.log('📚 Checking D6 Subjects and Grades Data\n');

  try {
    // Initialize D6 service with production configuration
    const d6Config = {
      baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v1',
      username: process.env.D6_API_USERNAME || 'espenaitestapi',
      password: process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
      enableMockData: false, // Use real data only
      useMockDataFirst: false
    };

    const d6Service = D6ApiServiceHybrid.getInstance(d6Config);
    await d6Service.initialize();

    // Get client integrations to find school ID
    console.log('🏫 Getting school information...');
    const integrations = await d6Service.getClientIntegrations();
    
    if (integrations.length === 0) {
      console.log('❌ No integrations found');
      return;
    }

    const schoolId = parseInt(integrations[0].school_login_id || '1694');
    console.log(`✅ Using school: ${integrations[0].school_name} (ID: ${schoolId})\n`);

    // Get a few learners to test with
    console.log('👥 Getting sample learners...');
    const learners = await d6Service.getLearners(schoolId, { limit: 5 });
    console.log(`✅ Retrieved ${learners.length} sample learners\n`);

    if (learners.length === 0) {
      console.log('❌ No learners found to test with');
      return;
    }

    // Test learner marks for the first few learners
    console.log('📊 Testing Learner Marks/Grades...');
    console.log('═'.repeat(70));

    for (let i = 0; i < Math.min(3, learners.length); i++) {
      const learner = learners[i];
      console.log(`\n🎓 ${learner.FirstName} ${learner.LastName} (ID: ${learner.LearnerID}, Grade ${learner.Grade})`);
      
      try {
        // Test marks for this learner
        const marks = await d6Service.getMarks(parseInt(learner.LearnerID), { 
          term: 1, 
          year: 2024 
        });
        
        if (marks.length > 0) {
          console.log(`✅ Found ${marks.length} mark records:`);
          
          // Show first few marks
          marks.slice(0, 5).forEach((mark, index) => {
            console.log(`   ${index + 1}. Subject: ${mark.SubjectID} | Mark: ${mark.MarkValue}/${mark.TotalMarks} | Type: ${mark.MarkType}`);
          });
          
          // Show raw structure of first mark
          if (marks.length > 0) {
            console.log('\n🔍 Raw Mark Structure (first record):');
            console.log(JSON.stringify(marks[0], null, 2));
          }
        } else {
          console.log('❌ No marks found for this learner');
        }
        
      } catch (error: any) {
        console.log(`❌ Error getting marks: ${error.message}`);
        if (error.response?.status) {
          console.log(`   Status: ${error.response.status} - ${error.response.data || 'No details'}`);
        }
      }
    }

    // Test lookup data for subjects
    console.log('\n\n📋 Testing Subject Lookup Data...');
    console.log('═'.repeat(70));
    
    try {
      const subjects = await d6Service.getLookupData('subjects');
      console.log(`✅ Found ${subjects.length} subjects in lookup data:`);
      
      subjects.slice(0, 10).forEach((subject, index) => {
        console.log(`   ${index + 1}. ${subject.name} (ID: ${subject.id})`);
      });
      
      if (subjects.length > 10) {
        console.log(`   ... and ${subjects.length - 10} more subjects`);
      }
      
    } catch (error: any) {
      console.log(`❌ Error getting subject lookup: ${error.message}`);
    }

    // Test lookup data for grades
    console.log('\n📊 Testing Grade Lookup Data...');
    try {
      const grades = await d6Service.getLookupData('grades');
      console.log(`✅ Found ${grades.length} grades in lookup data:`);
      
      grades.forEach((grade, index) => {
        console.log(`   ${index + 1}. ${grade.name} (ID: ${grade.id})`);
      });
      
    } catch (error: any) {
      console.log(`❌ Error getting grade lookup: ${error.message}`);
    }

    // Test other potential endpoints
    console.log('\n🔍 Testing Other Potential Endpoints...');
    console.log('═'.repeat(70));

    const endpointsToTest = [
      'subjects',
      'classes', 
      'terms',
      'assessments',
      'curriculum'
    ];

    for (const endpoint of endpointsToTest) {
      try {
        console.log(`\nTesting /${endpoint}...`);
        const data = await d6Service.getLookupData(endpoint);
        console.log(`✅ ${endpoint}: Found ${data.length} records`);
        
        if (data.length > 0) {
          console.log(`   Sample: ${data[0].name || data[0].id || JSON.stringify(data[0])}`);
        }
      } catch (error: any) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Test Setup Failed:', error.message);
  }

  console.log('\n🎯 Subjects and Grades Check Complete!');
}

// Run the script
checkSubjectsAndGrades().catch(console.error); 