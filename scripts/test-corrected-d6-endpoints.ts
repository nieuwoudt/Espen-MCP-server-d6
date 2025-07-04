#!/usr/bin/env tsx

/**
 * Test script to verify corrected D6 API endpoints
 * Based on Patrick's clarification about proper URL format
 */

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testCorrectedD6Endpoints() {
  console.log('🧪 Testing Corrected D6 API Endpoints\n');
  console.log('📝 Based on Patrick\'s clarification:');
  console.log('   - Learners: /v1/adminplus/learners/1694');
  console.log('   - Staff: /v1/adminplus/staffmembers/1694');
  console.log('   - Parents: /v1/adminplus/parents/1694\n');

  try {
    // Initialize D6 service with production configuration
    const d6Config = {
      baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v1',
      username: process.env.D6_API_USERNAME || 'espenaitestapi',
      password: process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
      enableMockData: false, // Test real API only
      useMockDataFirst: false
    };

    const d6Service = D6ApiServiceHybrid.getInstance(d6Config);
    await d6Service.initialize();

    // Test 1: Verify client integrations (this should still work)
    console.log('🏫 Testing Client Integrations...');
    try {
      const integrations = await d6Service.getClientIntegrations();
      console.log('✅ Client Integrations Success:', {
        count: integrations.length,
        schools: integrations.map(i => `${i.school_login_id}: ${i.school_name}`)
      });
      
      if (integrations.length === 0) {
        console.log('❌ No integrations found - cannot proceed with school-specific tests');
        return;
      }
      
      // Use the first integration for testing (should be 1694)
      const testSchoolId = parseInt(integrations[0].school_login_id || '1694');
      console.log(`🎯 Using school ID ${testSchoolId} for testing\n`);

      // Test 2: Get Learners with corrected endpoint
      console.log(`📚 Testing Learners for school ${testSchoolId}...`);
      try {
        const learners = await d6Service.getLearners(testSchoolId, { limit: 5 });
        console.log('✅ Learners Success:', {
          count: learners.length,
          sample: learners.slice(0, 2).map(l => `${l.FirstName} ${l.LastName} (Grade ${l.Grade})`)
        });
      } catch (error: any) {
        console.log('❌ Learners Failed:', {
          status: error.response?.status,
          message: error.response?.data || error.message,
          url: error.config?.url
        });
      }

      // Test 3: Get Staff with corrected endpoint
      console.log(`\n👨‍🏫 Testing Staff for school ${testSchoolId}...`);
      try {
        const staff = await d6Service.getStaff(testSchoolId);
        console.log('✅ Staff Success:', {
          count: staff.length,
          sample: staff.slice(0, 2).map(s => `${s.FirstName} ${s.LastName} (${s.Position})`)
        });
      } catch (error: any) {
        console.log('❌ Staff Failed:', {
          status: error.response?.status,
          message: error.response?.data || error.message,
          url: error.config?.url
        });
      }

      // Test 4: Get Parents with corrected endpoint
      console.log(`\n👪 Testing Parents for school ${testSchoolId}...`);
      try {
        const parents = await d6Service.getParents(testSchoolId);
        console.log('✅ Parents Success:', {
          count: parents.length,
          sample: parents.slice(0, 2).map(p => `${p.FirstName} ${p.LastName} (${p.RelationshipType})`)
        });
      } catch (error: any) {
        console.log('❌ Parents Failed:', {
          status: error.response?.status,
          message: error.response?.data || error.message,
          url: error.config?.url
        });
      }

    } catch (error: any) {
      console.log('❌ Client Integrations Failed:', error.message);
    }

    // Test 5: Health check
    console.log('\n🏥 Testing System Health...');
    try {
      const health = await d6Service.healthCheck();
      console.log('✅ Health Check:', {
        status: health.status,
        apis: health.apis,
        response_time: `${health.response_time_ms}ms`
      });
    } catch (error: any) {
      console.log('❌ Health Check Failed:', error.message);
    }

  } catch (error: any) {
    console.error('❌ Test Setup Failed:', error.message);
  }

  console.log('\n🎯 Endpoint Testing Complete!');
  console.log('📧 If endpoints still fail, Patrick may need to activate them for integration 1694');
}

// Run the test
testCorrectedD6Endpoints().catch(console.error); 