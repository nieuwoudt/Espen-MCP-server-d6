#!/usr/bin/env tsx

/**
 * Script to pull 20 parents from D6 API
 */

import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function getParentsSample() {
  console.log('👪 Pulling Sample of 20 Parents from D6\n');

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

    // Get parents
    console.log('👪 Fetching parents...');
    const parents = await d6Service.getParents(schoolId);
    
    console.log(`✅ Retrieved ${parents.length} total parents\n`);

    // Let's also check the raw API response to see actual field names
    console.log('🔍 Raw API Response Sample (first parent):');
    if (parents.length > 0) {
      console.log(JSON.stringify(parents[0], null, 2));
    }

    console.log('\n👪 Parents Sample (First 20):');
    console.log('═'.repeat(90));
    
    parents.slice(0, 20).forEach((parent, index) => {
      const firstName = parent.FirstName || 'Unknown';
      const lastName = parent.LastName || 'Unknown';
      const relationship = parent.RelationshipType || 'N/A';
      const phone = parent.PhoneNumber || 'N/A';
      const email = parent.Email || 'N/A';
      const address = parent.Address || 'N/A';
      const learnerIds = Array.isArray(parent.LearnerIDs) ? 
                        parent.LearnerIDs.join(', ') : 'N/A';
      const isPrimary = parent.IsPrimaryContact ? 'Yes' : 'No';
      
      console.log(`${(index + 1).toString().padStart(2)}: ${firstName} ${lastName}`);
      console.log(`    Relationship: ${relationship}`);
      console.log(`    Phone: ${phone}`);
      console.log(`    Email: ${email}`);
      console.log(`    Address: ${address.substring(0, 50)}${address.length > 50 ? '...' : ''}`);
      console.log(`    Learner IDs: ${learnerIds}`);
      console.log(`    Primary Contact: ${isPrimary}`);
      console.log(''); // Empty line
    });

    console.log('═'.repeat(90));
    console.log(`\n📊 Summary: Displayed ${Math.min(parents.length, 20)} of ${parents.length} total parents`);

    // Show relationship breakdown
    const relationships = parents.reduce((acc, parent) => {
      const rel = parent.RelationshipType || 'Unknown';
      acc[rel] = (acc[rel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n👨‍👩‍👧‍👦 Relationship Breakdown:');
    Object.entries(relationships).forEach(([rel, count]) => {
      console.log(`   ${rel}: ${count} parents`);
    });

    // Count parents with contact info
    const withPhone = parents.filter(p => p.PhoneNumber && p.PhoneNumber.trim()).length;
    const withEmail = parents.filter(p => p.Email && p.Email.trim()).length;
    const primaryContacts = parents.filter(p => p.IsPrimaryContact).length;

    console.log('\n📞 Contact Information:');
    console.log(`   With Phone: ${withPhone} parents (${((withPhone/parents.length)*100).toFixed(1)}%)`);
    console.log(`   With Email: ${withEmail} parents (${((withEmail/parents.length)*100).toFixed(1)}%)`);
    console.log(`   Primary Contacts: ${primaryContacts} parents`);

    // Count children per parent
    const childrenCounts = parents.map(p => 
      Array.isArray(p.LearnerIDs) ? p.LearnerIDs.length : 0
    );
    const avgChildren = childrenCounts.reduce((sum, count) => sum + count, 0) / parents.length;

    console.log('\n👶 Children per Parent:');
    console.log(`   Average: ${avgChildren.toFixed(1)} children per parent`);
    console.log(`   Max: ${Math.max(...childrenCounts)} children`);
    console.log(`   Min: ${Math.min(...childrenCounts)} children`);

  } catch (error: any) {
    console.error('❌ Error fetching parents:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the script
getParentsSample().catch(console.error); 