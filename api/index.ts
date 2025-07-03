import { z } from 'zod';
import { createMcpHandler } from '@vercel/mcp-adapter';
import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';

// Initialize D6 service
const d6Config = {
  baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v2',
  username: process.env.D6_API_USERNAME || 'espenaitestapi',
  password: process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
  enableMockData: true,
  useMockDataFirst: false
};

const d6Service = D6ApiServiceHybrid.getInstance(d6Config);

const handler = createMcpHandler(
  (server) => {
    // Tool 1: Get Schools (Client Integrations)
    server.tool(
      'get_schools',
      'Get information about schools/client integrations in the D6 system',
      {},
      async () => {
        try {
          const schools = await d6Service.getClientIntegrations();
          return {
            content: [{ 
              type: 'text', 
              text: `📚 **Schools/Client Integrations**\n\n${JSON.stringify(schools, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Error fetching schools: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );

    // Tool 2: Get Learners
    server.tool(
      'get_learners',
      'Get student/learner information from D6',
      {
        schoolId: z.number().describe('School ID to filter learners'),
        limit: z.number().min(1).max(100).default(20).describe('Maximum number of learners to return')
      },
      async ({ schoolId, limit }) => {
        try {
          const learners = await d6Service.getLearners(schoolId, { limit });
          return {
            content: [{ 
              type: 'text', 
              text: `👨‍🎓 **Learners (${learners.length})**\n\n${JSON.stringify(learners, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Error fetching learners: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );

    // Tool 3: Get Staff
    server.tool(
      'get_staff',
      'Get staff information from D6',
      {
        schoolId: z.number().describe('School ID to filter staff'),
        limit: z.number().min(1).max(50).default(20).describe('Maximum number of staff to return')
      },
      async ({ schoolId, limit }) => {
        try {
          const staff = await d6Service.getStaff(schoolId);
          const limitedStaff = staff.slice(0, limit);
          return {
            content: [{ 
              type: 'text', 
              text: `👩‍🏫 **Staff Members (${limitedStaff.length}/${staff.length})**\n\n${JSON.stringify(limitedStaff, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Error fetching staff: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );

    // Tool 4: Get Parents
    server.tool(
      'get_parents',
      'Get parent information from D6',
      {
        schoolId: z.number().describe('School ID to filter parents'),
        limit: z.number().min(1).max(50).default(20).describe('Maximum number of parents to return')
      },
      async ({ schoolId, limit }) => {
        try {
          const parents = await d6Service.getParents(schoolId);
          const limitedParents = parents.slice(0, limit);
          return {
            content: [{ 
              type: 'text', 
              text: `👨‍👩‍👧‍👦 **Parents (${limitedParents.length}/${parents.length})**\n\n${JSON.stringify(limitedParents, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Error fetching parents: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );

    // Tool 5: Get Learner Marks
    server.tool(
      'get_learner_marks',
      'Get academic marks for a specific learner',
      {
        learnerId: z.number().describe('The ID of the learner to get marks for'),
        term: z.number().optional().describe('Specific term to get marks for'),
        year: z.number().optional().describe('Specific year to get marks for')
      },
      async ({ learnerId, term, year }) => {
        try {
          const marks = await d6Service.getMarks(learnerId, { term, year });
          return {
            content: [{ 
              type: 'text', 
              text: `📊 **Academic Marks for Learner ${learnerId}**\n\n${JSON.stringify(marks, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Error fetching marks for learner ${learnerId}: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );

    // Tool 6: Get Lookup Data
    server.tool(
      'get_lookup_data',
      'Get lookup/reference data from D6 (e.g., genders, grades)',
      {
        type: z.enum(['genders', 'grades', 'subjects']).default('genders').describe('Type of lookup data to retrieve')
      },
      async ({ type }) => {
        try {
          const lookupData = await d6Service.getLookupData(type);
          return {
            content: [{ 
              type: 'text', 
              text: `📋 **${type.toUpperCase()} Lookup Data**\n\n${JSON.stringify(lookupData, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Error fetching ${type} lookup data: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );

    // Tool 7: System Health
    server.tool(
      'get_system_health',
      'Check the health status of the D6 API connection',
      {},
      async () => {
        try {
          const health = await d6Service.healthCheck();
          return {
            content: [{ 
              type: 'text', 
              text: `🏥 **System Health Status**\n\n${JSON.stringify(health, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );

    // Tool 8: Integration Info
    server.tool(
      'get_integration_info',
      'Get information about the D6 integration status and configuration',
      {},
      async () => {
        try {
          const integrationInfo = {
            server_name: 'Espen D6 MCP Server',
            version: '1.0.0',
            d6_base_url: d6Config.baseUrl,
            d6_username: d6Config.username,
            production_mode: process.env.D6_PRODUCTION_MODE === 'true',
            mock_data_enabled: d6Config.enableMockData,
            deployment: 'Vercel',
            timestamp: new Date().toISOString()
          };

          return {
            content: [{ 
              type: 'text', 
              text: `ℹ️ **Integration Information**\n\n${JSON.stringify(integrationInfo, null, 2)}` 
            }]
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `❌ Error getting integration info: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }]
          };
        }
      }
    );
  },
  {},
  { basePath: '/api' }
);

export { handler as GET, handler as POST, handler as DELETE }; 