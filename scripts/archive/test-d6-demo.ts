#!/usr/bin/env tsx

/**
 * Test script to connect to real D6 demo environment
 * School: "d6 + Primary School" (ID: 1000)
 * Integration: 1694 (authorized in test environment)
 */

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import { logger } from '../src/utils/logger.js';

async function testD6DemoConnection() {
  console.log('🏫 Testing D6 Demo Environment Connection...\n');
  console.log('School: d6 + Primary School');
  console.log('School ID: 1000');
  console.log('Integration ID: 1694');
  console.log('Environment: Test (non-billable)\n');

  try {
    // Initialize D6 service with our existing credentials
    const d6Service = D6ApiServiceHybrid.getInstance({
      baseUrl: 'https://integrate.d6plus.co.za/api/v2',
      username: 'espenaitestapi',
      password: 'qUz3mPcRsfSWxKR9qEnm',
      timeout: 30000,
      enableMockData: false,
      useMockDataFirst: false, // Use real API first
    });

    console.log('🔍 Step 1: Checking API connectivity...');
    const healthCheck = await d6Service.healthCheck();
    console.log('Health Status:', healthCheck.status);
    console.log('Response Time:', healthCheck.response_time_ms + 'ms');
    console.log('APIs Available:', healthCheck.apis);
    console.log('');

    console.log('🏢 Step 2: Getting client integrations...');
    const integrations = await d6Service.getClientIntegrations();
    console.log(`Found ${integrations.length} integrations:`);
    
    integrations.forEach((integration, index) => {
      console.log(`\n${index + 1}. ${integration.school_name}`);
      console.log(`   - School ID: ${integration.school_id}`);
      console.log(`   - School Login ID: ${integration.school_login_id}`);
      console.log(`   - Admin Email: ${integration.admin_email_address}`);
      console.log(`   - Phone: ${integration.telephone_calling_code}${integration.telephone_number}`);
      console.log(`   - API Type: ${integration.api_type} (ID: ${integration.api_type_id})`);
      console.log(`   - Activated by Integrator: ${integration.activated_by_integrator}`);
    });

    // Look for our demo school specifically
    const demoSchool = integrations.find(school => 
      school.school_id === 1000 || 
      school.school_name.toLowerCase().includes('primary') ||
      school.school_name.toLowerCase().includes('d6')
    );

    if (demoSchool) {
      console.log('\n🎯 Found Demo School!');
      console.log(`School: ${demoSchool.school_name}`);
      console.log(`School ID: ${demoSchool.school_id}`);
      
      console.log('\n👥 Step 3: Getting learners from demo school...');
      const learners = await d6Service.getLearners(demoSchool.school_id!);
      console.log(`Found ${learners.length} learners:`);
      
      learners.slice(0, 5).forEach((learner, index) => {
        console.log(`${index + 1}. ${learner.FirstName} ${learner.LastName} (ID: ${learner.LearnerID})`);
        console.log(`   - Grade: ${learner.Grade}`);
        console.log(`   - Gender: ${learner.Gender}`);
      });

      if (learners.length > 5) {
        console.log(`   ... and ${learners.length - 5} more learners`);
      }

      console.log('\n👨‍🏫 Step 4: Getting staff from demo school...');
      const staff = await d6Service.getStaff(demoSchool.school_id!);
      console.log(`Found ${staff.length} staff members:`);
      
      staff.slice(0, 5).forEach((member, index) => {
        console.log(`${index + 1}. ${member.FirstName} ${member.LastName} (ID: ${member.StaffID})`);
        console.log(`   - Position: ${member.Position}`);
        console.log(`   - Department: ${member.Department}`);
      });

      if (staff.length > 5) {
        console.log(`   ... and ${staff.length - 5} more staff members`);
      }

      console.log('\n👨‍👩‍👧‍👦 Step 5: Getting parents from demo school...');
      try {
        const parents = await d6Service.getParents(demoSchool.school_id!);
        console.log(`Found ${parents.length} parents:`);
        
        parents.slice(0, 3).forEach((parent, index) => {
          console.log(`${index + 1}. ${parent.FirstName} ${parent.LastName} (ID: ${parent.ParentID})`);
          console.log(`   - Email: ${parent.Email}`);
          console.log(`   - Phone: ${parent.PhoneNumber}`);
        });
      } catch (error) {
        console.log('Parents data not available or requires different endpoint');
      }

      console.log('\n📊 Step 6: Testing lookup data...');
      try {
        const genders = await d6Service.getLookupData('genders');
        console.log(`Available genders: ${genders.map(g => g.name).join(', ')}`);
      } catch (error) {
        console.log('Lookup data not available via current endpoint');
      }

      // Test marks if we have learners
      if (learners.length > 0) {
        console.log('\n📚 Step 7: Getting marks for first learner...');
        try {
          const marks = await d6Service.getMarks(learners[0].LearnerID);
          console.log(`Found ${marks.length} marks for ${learners[0].FirstName} ${learners[0].LastName}`);
          
          marks.slice(0, 3).forEach((mark, index) => {
            console.log(`${index + 1}. ${mark.SubjectName}: ${mark.Mark}% (${mark.AssessmentType})`);
          });
        } catch (error) {
          console.log('Marks data not available or requires different parameters');
        }
      }

    } else {
      console.log('\n❌ Demo school (ID: 1000) not found in integrations');
      console.log('Available schools:', integrations.map(s => `${s.school_name} (ID: ${s.school_id})`));
    }

    console.log('\n✅ D6 Demo Connection Test Complete!');

  } catch (error: any) {
    console.error('\n❌ Error connecting to D6 Demo Environment:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Verify integration 1694 is activated in test environment');
    console.log('2. Check if school ID 1000 is correctly linked to our partner account');
    console.log('3. Ensure credentials have access to the test environment');
    console.log('4. Contact D6 support if integration authorization is needed');
  }
}

testD6DemoConnection().catch(console.error); 