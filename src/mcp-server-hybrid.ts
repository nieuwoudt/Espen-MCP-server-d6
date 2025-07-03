#!/usr/bin/env tsx

// 🌐 Espen D6 MCP Server - Hybrid Mode
// Supports both real D6 integration and sandbox mode
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import services
import { D6ApiServiceProduction } from './services/d6ApiService-production.js';
import { d6MockData } from './services/d6MockDataService.js';

// Configuration
const SANDBOX_MODE = process.env.D6_SANDBOX_MODE === 'true';
const PRODUCTION_MODE = process.env.D6_PRODUCTION_MODE === 'true';
const HYBRID_MODE = !SANDBOX_MODE && !PRODUCTION_MODE; // Default to hybrid

// Initialize services
let d6ProductionService: D6ApiServiceProduction | null = null;

if (PRODUCTION_MODE || HYBRID_MODE) {
  try {
    d6ProductionService = D6ApiServiceProduction.getInstance({
      baseUrl: 'https://integrate.d6plus.co.za/api/v1',
      username: 'espenaitestapi',
      password: 'qUz3mPcRsfSWxKR9qEnm',
      timeout: 10000,
    });
  } catch (error) {
    process.stderr.write(`[MCP] Failed to initialize D6 production service: ${error}\n`);
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'espen-d6-hybrid',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schemas
const GetSchoolsSchema = z.object({});
const GetLearnersSchema = z.object({
  schoolId: z.string().optional().describe('Optional school ID to filter learners'),
});
const GetLearnerMarksSchema = z.object({
  learnerId: z.string().describe('The ID of the learner to get marks for'),
});
const GetStaffSchema = z.object({
  schoolId: z.string().optional().describe('Optional school ID to filter staff'),
});
const GetParentsSchema = z.object({
  learnerId: z.string().optional().describe('Optional learner ID to get parents for'),
});
const GetLookupDataSchema = z.object({
  type: z.enum(['genders', 'grades', 'languages']).optional().describe('Type of lookup data'),
});
const GetSystemHealthSchema = z.object({});
const GetIntegrationInfoSchema = z.object({});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_schools',
        description: 'Get list of schools available in the D6 system',
        inputSchema: GetSchoolsSchema,
      },
      {
        name: 'get_learners',
        description: 'Get learners from the D6 system with optional school filtering',
        inputSchema: GetLearnersSchema,
      },
      {
        name: 'get_learner_marks',
        description: 'Get academic marks for a specific learner',
        inputSchema: GetLearnerMarksSchema,
      },
      {
        name: 'get_staff',
        description: 'Get staff members from the D6 system with optional school filtering',
        inputSchema: GetStaffSchema,
      },
      {
        name: 'get_parents',
        description: 'Get parent information from the D6 system',
        inputSchema: GetParentsSchema,
      },
      {
        name: 'get_lookup_data',
        description: 'Get system lookup data (genders, grades, languages, etc.)',
        inputSchema: GetLookupDataSchema,
      },
      {
        name: 'get_system_health',
        description: 'Check D6 API connectivity and system health',
        inputSchema: GetSystemHealthSchema,
      },
      {
        name: 'get_integration_info',
        description: 'Get information about the current D6 integration setup',
        inputSchema: GetIntegrationInfoSchema,
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    // Log to stderr only
    process.stderr.write(`[MCP] Tool called: ${name} (mode: ${SANDBOX_MODE ? 'sandbox' : PRODUCTION_MODE ? 'production' : 'hybrid'})\n`);

    // Helper function to create clean text response
    const createTextResponse = (text: string) => {
      const cleanText = typeof text === 'string' ? text.trim() : String(text);
      return {
        content: [
          {
            type: 'text',
            text: cleanText,
          },
        ],
      };
    };

    switch (name) {
      case 'get_schools': {
        if (SANDBOX_MODE) {
          // Use mock data
          const schools = d6MockData.schools;
          const summary = `Found ${schools.length} schools in sandbox mode:\n\n` +
            schools.map((school, index) => 
              `${index + 1}. **${school.name}**\n` +
              `   - School ID: ${school.id}\n` +
              `   - Address: ${school.address}\n` +
              `   - Principal: ${school.principal}\n` +
              `   - Phone: ${school.phone}\n`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          // Use real D6 data
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          try {
            const schools = await d6ProductionService.getSchools();
            const summary = `Found ${schools.length} schools from D6 API:\n\n` +
              schools.map((school, index) => 
                `${index + 1}. **${school.school_name}**\n` +
                `   - Login ID: ${school.school_login_id}\n` +
                `   - Admin Email: ${school.admin_email_address}\n` +
                `   - Phone: ${school.telephone_calling_code}${school.telephone_number}\n` +
                `   - API Type: ${school.api_type}\n` +
                `   - Activated: ${school.activated_by_integrator}\n`
              ).join('\n');
            
            return createTextResponse(summary);
          } catch (error) {
            return createTextResponse(`❌ Error fetching schools from D6: ${error}`);
          }
        }
      }

      case 'get_learners': {
        const { schoolId } = args as { schoolId?: string };
        
        if (SANDBOX_MODE) {
          // Use mock data
          const schoolIdNum = schoolId ? parseInt(schoolId, 10) : 1001;
          const learners = d6MockData.learners.filter(l => l.school_id === schoolIdNum);
          const summary = `Found ${learners.length} learners for school ID ${schoolIdNum} (sandbox mode):\n\n` +
            learners.slice(0, 10).map((learner, index) => 
              `${index + 1}. **${learner.first_name} ${learner.last_name}**\n` +
              `   - Student ID: ${learner.learner_id}\n` +
              `   - Grade: ${learner.grade}\n` +
              `   - Gender: ${learner.gender}\n` +
              `   - Language: ${learner.home_language}\n`
            ).join('\n') + 
            (learners.length > 10 ? `\n... and ${learners.length - 10} more learners` : '');
          
          return createTextResponse(summary);
        } else {
          // Try real D6 data, fallback to explanation
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          const learners = await d6ProductionService.getLearners(schoolId);
          if (learners.length === 0) {
            return createTextResponse(`ℹ️ No learners available from D6 API.\n\nThis is expected as the current D6 integration (ID: 1694) has limited demo data access. The following endpoints are available:\n- School information\n- Gender lookup data\n\nFor full learner data access, contact D6 support to activate additional endpoints for integration 1694.`);
          }
          
          return createTextResponse(`Found ${learners.length} learners from D6 API`);
        }
      }

      case 'get_learner_marks': {
        const { learnerId } = args as { learnerId: string };
        
        if (SANDBOX_MODE) {
          // Use mock data
          const learnerIdNum = parseInt(learnerId, 10);
          const marks = d6MockData.marks.filter(m => m.learner_id === learnerIdNum);
          const summary = `Found ${marks.length} marks for learner ID ${learnerId} (sandbox mode):\n\n` +
            marks.map((mark, index) => 
              `${index + 1}. **${mark.subject}**\n` +
              `   - Mark: ${mark.mark}%\n` +
              `   - Term: ${mark.term}\n` +
              `   - Assessment: ${mark.assessment_type}\n` +
              `   - Date: ${mark.date}\n`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          // Try real D6 data, fallback to explanation
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          const marks = await d6ProductionService.getMarks(learnerId);
          if (marks.length === 0) {
            return createTextResponse(`ℹ️ No marks available from D6 API for learner ${learnerId}.\n\nMarks data is not available in the current D6 integration. Contact D6 support for access to assessment data.`);
          }
          
          return createTextResponse(`Found ${marks.length} marks from D6 API`);
        }
      }

      case 'get_staff': {
        const { schoolId } = args as { schoolId?: string };
        
        if (SANDBOX_MODE) {
          // Use mock data
          const schoolIdNum = schoolId ? parseInt(schoolId, 10) : 1001;
          const staff = d6MockData.staff.filter(s => s.school_id === schoolIdNum);
          const summary = `Found ${staff.length} staff members for school ID ${schoolIdNum} (sandbox mode):\n\n` +
            staff.map((member, index) => 
              `${index + 1}. **${member.first_name} ${member.last_name}**\n` +
              `   - Staff ID: ${member.staff_id}\n` +
              `   - Role: ${member.role}\n` +
              `   - Email: ${member.email}\n` +
              `   - Subjects: ${member.subjects?.join(', ') || 'Not specified'}\n`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          // Try real D6 data, fallback to explanation
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          const staff = await d6ProductionService.getStaff(schoolId);
          if (staff.length === 0) {
            return createTextResponse(`ℹ️ No staff data available from D6 API.\n\nStaff data is not available in the current D6 integration. Contact D6 support for access to staff information.`);
          }
          
          return createTextResponse(`Found ${staff.length} staff members from D6 API`);
        }
      }

      case 'get_parents': {
        const { learnerId } = args as { learnerId?: string };
        
        if (SANDBOX_MODE) {
          // Use mock data
          const parents = d6MockData.parents;
          const summary = `Found ${parents.length} parents (sandbox mode):\n\n` +
            parents.slice(0, 5).map((parent, index) => 
              `${index + 1}. **${parent.first_name} ${parent.last_name}**\n` +
              `   - Parent ID: ${parent.parent_id}\n` +
              `   - Relationship: ${parent.relationship}\n` +
              `   - Email: ${parent.email}\n` +
              `   - Phone: ${parent.phone}\n`
            ).join('\n') +
            (parents.length > 5 ? `\n... and ${parents.length - 5} more parents` : '');
          
          return createTextResponse(summary);
        } else {
          // Try real D6 data, fallback to explanation
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          const parents = await d6ProductionService.getParents(learnerId);
          if (parents.length === 0) {
            return createTextResponse(`ℹ️ No parent data available from D6 API.\n\nParent data is not available in the current D6 integration. Contact D6 support for access to parent information.`);
          }
          
          return createTextResponse(`Found ${parents.length} parents from D6 API`);
        }
      }

      case 'get_lookup_data': {
        const { type } = args as { type?: string };
        const lookupType = type || 'genders';
        
        if (SANDBOX_MODE) {
          // Use mock data
          const lookupData = d6MockData.lookupData[lookupType as keyof typeof d6MockData.lookupData] || [];
          const summary = `${lookupType} lookup data (sandbox mode):\n\n` +
            lookupData.map((item, index) => 
              `${index + 1}. ${item.name || item.id}`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          // Use real D6 data
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          try {
            const lookupData = await d6ProductionService.getLookupData(lookupType);
            const summary = `${lookupType} lookup data from D6 API:\n\n` +
              lookupData.map((item, index) => 
                `${index + 1}. ${item.name} (${item.id})`
              ).join('\n');
            
            return createTextResponse(summary);
          } catch (error) {
            return createTextResponse(`ℹ️ Lookup type '${lookupType}' not available from D6 API.\n\nCurrently available: genders\nOther lookup types may require additional D6 integration setup.`);
          }
        }
      }

      case 'get_system_health': {
        if (SANDBOX_MODE) {
          const healthInfo = {
            status: 'healthy',
            mode: 'sandbox',
            message: 'Running in sandbox mode with mock data',
            timestamp: new Date().toISOString(),
          };
          
          const summary = `System Health Check:\n\n` +
            `🟢 **Status:** ${healthInfo.status.toUpperCase()}\n` +
            `🎭 **Mode:** ${healthInfo.mode.toUpperCase()}\n` +
            `📝 **Message:** ${healthInfo.message}\n` +
            `⏰ **Timestamp:** ${healthInfo.timestamp}`;
          
          return createTextResponse(summary);
        } else {
          // Check real D6 API health
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          const health = await d6ProductionService.healthCheck();
          const summary = `System Health Check:\n\n` +
            `${health.status === 'healthy' ? '🟢' : '🔴'} **Status:** ${health.status.toUpperCase()}\n` +
            `🔗 **Available Endpoints:** ${health.available_endpoints.join(', ')}\n` +
            `⚡ **Response Time:** ${health.response_time_ms}ms\n` +
            `⏰ **Timestamp:** ${health.timestamp}\n` +
            (health.school_info ? `🏫 **School:** ${health.school_info.school_name}` : '');
          
          return createTextResponse(summary);
        }
      }

      case 'get_integration_info': {
        if (SANDBOX_MODE) {
          const summary = `Integration Information (Sandbox Mode):\n\n` +
            `🎭 **Mode:** Sandbox\n` +
            `📊 **Data Source:** Mock data with realistic South African school information\n` +
            `🏫 **Schools:** 3 demo schools available\n` +
            `👥 **Learners:** 25+ demo learners with authentic names\n` +
            `👨‍🏫 **Staff:** 15+ demo staff members\n` +
            `📚 **Subjects:** Mathematics, English, Afrikaans, Natural Sciences, etc.\n` +
            `🌍 **Languages:** English, Afrikaans, Zulu, Xhosa, Setswana`;
          
          return createTextResponse(summary);
        } else {
          // Get real D6 integration info
          if (!d6ProductionService) {
            return createTextResponse('❌ D6 Production service not available');
          }
          
          const info = d6ProductionService.getIntegrationInfo();
          const summary = `D6 Integration Information:\n\n` +
            `🏫 **School:** ${info.school_name}\n` +
            `🔗 **Integration ID:** ${info.integration_id}\n` +
            `⚙️ **API Type:** ${info.api_type}\n` +
            `✅ **Activated:** ${info.activated ? 'Yes' : 'No (Non-billable)'}\n\n` +
            `📊 **Available Data:**\n` +
            info.available_data.map(item => `   - ${item}`).join('\n') + '\n\n' +
            `⚠️ **Current Limitations:**\n` +
            info.limitations.map(item => `   - ${item}`).join('\n');
          
          return createTextResponse(summary);
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    process.stderr.write(`[MCP] Tool execution failed: ${request.params.name} - ${error}\n`);
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  
  const mode = SANDBOX_MODE ? 'sandbox' : PRODUCTION_MODE ? 'production' : 'hybrid';
  process.stderr.write(`[MCP] Starting Espen D6 MCP Server (mode: ${mode})\n`);

  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`[MCP] Failed to start server: ${error}\n`);
  process.exit(1);
}); 