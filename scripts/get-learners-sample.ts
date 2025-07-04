#!/usr/bin/env tsx

/**
 * Script to pull a sample of 100 learner names from D6 API
 */

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function getLearnersSample() {
  console.log('🎓 Pulling Sample of 100 Learner Names from D6\n');

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

    // Get 100 learners
    console.log('📚 Fetching 100 learners...');
    const learners = await d6Service.getLearners(schoolId, { limit: 100 });
    
    console.log(`✅ Retrieved ${learners.length} learners\n`);

    // Let's also check the raw API response to see actual field names
    console.log('🔍 Raw API Response Sample (first learner):');
    if (learners.length > 0) {
      console.log(JSON.stringify(learners[0], null, 2));
    }

    console.log('\n📋 Learner Names Sample:');
    console.log('═'.repeat(60));
    
    learners.slice(0, 100).forEach((learner, index) => {
      const firstName = learner.FirstName || 'Unknown';
      const lastName = learner.LastName || 'Unknown';
      const grade = learner.Grade || 'N/A';
      
      console.log(`${(index + 1).toString().padStart(3)}: ${firstName} ${lastName} (Grade ${grade})`);
    });

    console.log('═'.repeat(60));
    console.log(`\n📊 Summary: Displayed ${Math.min(learners.length, 100)} of ${learners.length} total learners`);

  } catch (error: any) {
    console.error('❌ Error fetching learners:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the script
getLearnersSample().catch(console.error); 