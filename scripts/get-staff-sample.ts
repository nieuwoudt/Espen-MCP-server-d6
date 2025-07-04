#!/usr/bin/env tsx

/**
 * Script to pull 20 staff members from D6 API
 */

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function getStaffSample() {
  console.log('👨‍🏫 Pulling Sample of 20 Staff Members from D6\n');

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

    // Get staff members
    console.log('👥 Fetching staff members...');
    const staff = await d6Service.getStaff(schoolId);
    
    console.log(`✅ Retrieved ${staff.length} total staff members\n`);

    // Let's also check the raw API response to see actual field names
    console.log('🔍 Raw API Response Sample (first staff member):');
    if (staff.length > 0) {
      console.log(JSON.stringify(staff[0], null, 2));
    }

    console.log('\n👨‍🏫 Staff Members Sample (First 20):');
    console.log('═'.repeat(80));
    
    staff.slice(0, 20).forEach((staffMember, index) => {
      const firstName = staffMember.FirstName || 'Unknown';
      const lastName = staffMember.LastName || 'Unknown';
      const position = staffMember.Position || 'N/A';
      const department = staffMember.Department || 'N/A';
      const staffNumber = staffMember.StaffNumber || 'N/A';
      const subjects = Array.isArray(staffMember.SubjectsTaught) ? 
                      staffMember.SubjectsTaught.join(', ') : 'N/A';
      
      console.log(`${(index + 1).toString().padStart(2)}: ${firstName} ${lastName}`);
      console.log(`    Position: ${position}`);
      console.log(`    Department: ${department}`);
      console.log(`    Staff Number: ${staffNumber}`);
      console.log(`    Subjects: ${subjects}`);
      console.log(`    Active: ${staffMember.IsActive ? 'Yes' : 'No'}`);
      console.log(''); // Empty line
    });

    console.log('═'.repeat(80));
    console.log(`\n📊 Summary: Displayed ${Math.min(staff.length, 20)} of ${staff.length} total staff members`);

    // Show department breakdown
    const departments = staff.reduce((acc, member) => {
      const dept = member.Department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n🏢 Department Breakdown:');
    Object.entries(departments).forEach(([dept, count]) => {
      console.log(`   ${dept}: ${count} staff members`);
    });

    // Show position breakdown
    const positions = staff.reduce((acc, member) => {
      const pos = member.Position || 'Unknown';
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📋 Position Breakdown:');
    Object.entries(positions).slice(0, 10).forEach(([pos, count]) => {
      console.log(`   ${pos}: ${count} staff members`);
    });

  } catch (error: any) {
    console.error('❌ Error fetching staff:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the script
getStaffSample().catch(console.error); 