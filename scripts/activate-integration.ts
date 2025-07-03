#!/usr/bin/env tsx
// 🔧 Activate D6 Integration Script

import { config } from 'dotenv';
import { D6ApiServiceV2 } from '../src/services/d6ApiService-v2.js';
import { logger } from '../src/utils/logger.js';

// Load environment variables
config();

async function activateIntegration() {
  console.log('🔧 Activating D6 Integration...\n');

  try {
    // Initialize D6 API service
    const d6Api = D6ApiServiceV2.getInstance({
      baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v2',
      username: process.env.D6_API_USERNAME || '',
      password: process.env.D6_API_PASSWORD || '',
      timeout: parseInt(process.env.D6_REQUEST_TIMEOUT || '30000'),
      retryAttempts: 3,
      retryDelay: 1000,
    });

    // First, get current client integrations
    console.log('📋 Getting current integration status...');
    const clientsResponse = await d6Api.getClientIntegrations();
    
    if (!clientsResponse.success || !clientsResponse.data) {
      console.log('❌ Failed to get client integrations');
      console.log(`   Error: ${clientsResponse.error}`);
      return false;
    }

    console.log('✅ Current integration status:');
    clientsResponse.data.forEach((client, index) => {
      console.log(`   ${index + 1}. School: ${client.school_name}`);
      console.log(`      - School ID: ${client.school_login_id}`);
      console.log(`      - API Type ID: ${client.api_type_id}`);
      console.log(`      - API Type: ${client.api_type}`);
      console.log(`      - Activated: ${client.activated_by_integrator}`);
      console.log('');
    });

    // Find the school we want to activate
    const targetSchool = clientsResponse.data.find(client => 
      client.school_login_id === "1694"
    );

    if (!targetSchool) {
      console.log('❌ Target school (ID: 1694) not found');
      return false;
    }

    if (targetSchool.activated_by_integrator === "Yes") {
      console.log('✅ Integration is already activated!');
      return true;
    }

    // Activate the integration
    console.log('🚀 Activating integration...');
    const activationResponse = await d6Api.updateClientIntegrationState(
      targetSchool.school_login_id,
      targetSchool.api_type_id,
      true // activate
    );

    if (activationResponse.success) {
      console.log('✅ Integration activated successfully!');
      console.log(`   School: ${targetSchool.school_name}`);
      console.log(`   Status: Activated by Integrator`);
      
      // Verify the change
      console.log('\n🔍 Verifying activation...');
      const verifyResponse = await d6Api.getClientIntegrations();
      
      if (verifyResponse.success && verifyResponse.data) {
        const updatedSchool = verifyResponse.data.find(client => 
          client.school_login_id === "1694"
        );
        
        if (updatedSchool && updatedSchool.activated_by_integrator === "Yes") {
          console.log('✅ Activation verified successfully!');
          console.log(`   New status: ${updatedSchool.activated_by_integrator}`);
        } else {
          console.log('⚠️  Activation status not yet updated (may take a moment)');
        }
      }
      
      return true;
    } else {
      console.log('❌ Failed to activate integration');
      console.log(`   Error: ${activationResponse.error}`);
      return false;
    }

  } catch (error: any) {
    console.log('\n❌ Integration activation failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run the activation
activateIntegration()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Integration activation completed successfully!');
      console.log('\nNext steps:');
      console.log('   1. Test data endpoints: npm run test:working');
      console.log('   2. Start MCP server: npm run mcp:production');
      console.log('   3. Test in Claude MCP settings');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 