#!/usr/bin/env npx tsx

// 🎭 D6 Sandbox Mode Test Script
// Tests the hybrid D6 service with mock data functionality

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import { CacheService } from '../src/services/cacheService.js';
import { logger } from '../src/utils/logger.js';

console.log('🎭 D6 Sandbox Mode Test\n');

async function testSandboxMode() {
  try {
    // Initialize cache service
    const cacheService = CacheService.getInstance({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });

    console.log('📦 Connecting to cache...');
    await cacheService.connect();

    // Initialize D6 service in sandbox mode
    const d6Service = D6ApiServiceHybrid.getInstance({
      baseUrl: 'https://integrate.d6plus.co.za/api/v2',
      username: 'espenaitestapi',
      password: 'qUz3mPcRsfSWxKR9qEnm',
      timeout: 10000,
      enableMockData: true,
      useMockDataFirst: true, // Force sandbox mode
    });

    d6Service.setCache(cacheService);

    console.log('🚀 Initializing D6 service...');
    const clientInfo = await d6Service.initialize();
    
    console.log('\n📊 Client Info:');
    console.log(`Mode: ${clientInfo.mode}`);
    console.log(`Mock Data Enabled: ${clientInfo.mockDataEnabled}`);
    console.log(`v1 Available: ${clientInfo.v1Available}`);
    console.log(`v2 Available: ${clientInfo.v2Available}`);

    console.log('\n🏫 Testing Client Integrations (Mock Schools)...');
    const schools = await d6Service.getClientIntegrations();
    console.log(`Found ${schools.length} schools:`);
    schools.forEach(school => {
      console.log(`  - ${school.school_name} (ID: ${school.school_id})`);
    });

    console.log('\n👨‍🎓 Testing Learners (Mock Data)...');
    const learners = await d6Service.getLearners(1001, { limit: 5 });
    console.log(`Found ${learners.length} learners:`);
    learners.forEach(learner => {
      console.log(`  - ${learner.FirstName} ${learner.LastName} (Grade ${learner.Grade})`);
    });

    console.log('\n👨‍🏫 Testing Staff (Mock Data)...');
    const staff = await d6Service.getStaff(1001);
    console.log(`Found ${staff.length} staff members:`);
    staff.forEach(member => {
      console.log(`  - ${member.FirstName} ${member.LastName} (${member.Position})`);
    });

    console.log('\n👪 Testing Parents (Mock Data)...');
    const parents = await d6Service.getParents(1001);
    console.log(`Found ${parents.length} parents:`);
    parents.forEach(parent => {
      console.log(`  - ${parent.FirstName} ${parent.LastName} (${parent.RelationshipType})`);
    });

    console.log('\n📊 Testing Marks (Mock Data)...');
    const marks = await d6Service.getMarks(2001);
    console.log(`Found ${marks.length} marks for learner 2001:`);
    marks.forEach(mark => {
      console.log(`  - ${mark.SubjectID}: ${mark.MarkValue}/${mark.TotalMarks} (${mark.MarkType})`);
    });

    console.log('\n📋 Testing Lookup Data (Mock Data)...');
    const genders = await d6Service.getLookupData('genders');
    console.log(`Genders: ${genders.map(g => g.name).join(', ')}`);

    const grades = await d6Service.getLookupData('grades');
    console.log(`Grades: ${grades.slice(0, 5).map(g => g.name).join(', ')}... (${grades.length} total)`);

    console.log('\n🏥 Testing Health Check...');
    const health = await d6Service.healthCheck();
    console.log(`Status: ${health.status}`);
    console.log(`Response Time: ${health.response_time_ms}ms`);
    console.log(`Mock Data Available: ${health.mock_data_available}`);

    console.log('\n🔄 Testing Mode Switch...');
    d6Service.setSandboxMode(false);
    console.log('Switched to production mode (if APIs available)');
    
    const newInfo = d6Service.getClientInfo();
    console.log(`New Mode: ${newInfo.mode}`);

    // Switch back to sandbox
    d6Service.setSandboxMode(true);
    console.log('Switched back to sandbox mode');

    console.log('\n✅ All sandbox tests completed successfully!');
    
    // Disconnect
    await cacheService.disconnect();

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  testSandboxMode().catch(console.error);
} 