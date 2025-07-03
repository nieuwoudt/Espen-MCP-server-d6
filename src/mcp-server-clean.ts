#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { D6MockDataService } from './services/d6MockDataService.js';

// Check mode - production mode overrides sandbox mode
const PRODUCTION_MODE = process.env.D6_PRODUCTION_MODE === 'true';
const SANDBOX_MODE = !PRODUCTION_MODE && (process.env.D6_SANDBOX_MODE === 'true' || process.env.NODE_ENV === 'development');

// Only use mock data service to avoid Winston logger issues
const mockDataService = D6MockDataService.getInstance();

const server = new Server(
  {
    name: PRODUCTION_MODE ? 'espen-d6-production' : 'espen-d6',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schemas
const GetSchoolsSchema = ToolSchema.parse({
  name: 'get_schools',
  description: 'Get list of schools available in the D6 system',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
});

const GetLearnersSchema = ToolSchema.parse({
  name: 'get_learners',
  description: 'Get learners from the D6 system with optional school filtering',
  inputSchema: {
    type: 'object',
    properties: {
      schoolId: {
        type: 'string',
        description: 'Optional school ID to filter learners',
      },
    },
    additionalProperties: false,
  },
});

const GetLearnerMarksSchema = ToolSchema.parse({
  name: 'get_learner_marks',
  description: 'Get academic marks for a specific learner',
  inputSchema: {
    type: 'object',
    properties: {
      learnerId: {
        type: 'string',
        description: 'The ID of the learner to get marks for',
      },
    },
    required: ['learnerId'],
    additionalProperties: false,
  },
});

const GetStaffSchema = ToolSchema.parse({
  name: 'get_staff',
  description: 'Get staff members from the D6 system with optional school filtering',
  inputSchema: {
    type: 'object',
    properties: {
      schoolId: {
        type: 'string',
        description: 'Optional school ID to filter staff',
      },
    },
    additionalProperties: false,
  },
});

const GetParentsSchema = ToolSchema.parse({
  name: 'get_parents',
  description: 'Get parent information from the D6 system',
  inputSchema: {
    type: 'object',
    properties: {
      learnerId: {
        type: 'string',
        description: 'Optional learner ID to get parents for',
      },
    },
    additionalProperties: false,
  },
});

const GetLookupDataSchema = ToolSchema.parse({
  name: 'get_lookup_data',
  description: 'Get system lookup data (genders, grades, languages, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Type of lookup data (genders, grades, languages)',
        enum: ['genders', 'grades', 'languages'],
      },
    },
    additionalProperties: false,
  },
});

const GetSystemHealthSchema = ToolSchema.parse({
  name: 'get_system_health',
  description: 'Check D6 API connectivity and system health',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
});

const GetIntegrationInfoSchema = ToolSchema.parse({
  name: 'get_integration_info',
  description: 'Get information about the current D6 integration setup',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
});

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      GetSchoolsSchema,
      GetLearnersSchema,
      GetLearnerMarksSchema,
      GetStaffSchema,
      GetParentsSchema,
      GetLookupDataSchema,
      GetSystemHealthSchema,
      GetIntegrationInfoSchema,
    ],
  };
});

// Simple D6 API function without Winston logging
async function fetchFromD6Api(endpoint: string) {
  try {
    const response = await fetch(`https://integrate.d6plus.co.za/api/v1/${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('espenaitestapi:qUz3mPcRsfSWxKR9qEnm').toString('base64'),
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

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
          const schools = mockDataService.getClientIntegrations();
          const summary = `Found ${schools.length} schools in sandbox mode:\n\n` +
            schools.map((school, index) => 
              `${index + 1}. **${school.school_name}**\n` +
              `   - School ID: ${school.school_id}\n` +
              `   - Contact: ${school.admin_email_address}\n` +
              `   - Phone: +${school.telephone_calling_code} ${school.telephone_number}\n` +
              `   - API Type: ${school.api_type}\n` +
              `   - Status: ${school.activated_by_integrator === 'Yes' ? 'Activated' : 'Not Activated'}\n`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          // Production mode - try real D6 API
          const schools = await fetchFromD6Api('settings/clients');
          if (schools && Array.isArray(schools) && schools.length > 0) {
            const summary = `Found ${schools.length} schools from D6 API:\n\n` +
              schools.map((school: any, index: number) => 
                `${index + 1}. **${school.school_name}**\n` +
                `   - Login ID: ${school.school_login_id}\n` +
                `   - Contact: ${school.admin_email_address}\n` +
                `   - Phone: +${school.telephone_calling_code} ${school.telephone_number}\n` +
                `   - API Type: ${school.api_type}\n` +
                `   - Activated: ${school.activated_by_integrator}\n`
              ).join('\n');
            
            return createTextResponse(summary);
          } else {
            return createTextResponse(`❌ Error connecting to D6 API. Unable to retrieve school information.\n\nContact D6 support: support@d6plus.co.za`);
          }
        }
      }

      case 'get_learners': {
        const { schoolId } = args as { schoolId?: string };
        
        if (SANDBOX_MODE) {
          const schoolIdNum = schoolId ? parseInt(schoolId, 10) : 1001;
          const learners = mockDataService.getLearners(schoolIdNum);
          const summary = `Found ${learners.length} learners for school ID ${schoolIdNum} (sandbox mode):\n\n` +
            learners.slice(0, 10).map((learner: any, index) => 
              `${index + 1}. **${learner.first_name} ${learner.last_name}**\n` +
              `   - Student ID: ${learner.learner_id}\n` +
              `   - Grade: ${learner.grade}\n` +
              `   - Gender: ${learner.gender}\n` +
              `   - Language: ${learner.home_language}\n`
            ).join('\n') + 
            (learners.length > 10 ? `\n... and ${learners.length - 10} more learners` : '');
          
          return createTextResponse(summary);
        } else {
          return createTextResponse(
            `ℹ️ Learner data not available in current D6 integration.\n\n` +
            `The current D6 integration (ID: 1694) has limited demo data access. ` +
            `For full learner data access, contact D6 support to activate additional endpoints.\n\n` +
            `Available D6 data:\n- School information\n- Gender lookup data\n\n` +
            `Contact: support@d6plus.co.za`
          );
        }
      }

      case 'get_learner_marks': {
        const { learnerId } = args as { learnerId: string };
        
        if (SANDBOX_MODE) {
          const learnerIdNum = parseInt(learnerId, 10);
          const marks = mockDataService.getMarks(learnerIdNum);
          const summary = `Found ${marks.length} marks for learner ID ${learnerId} (sandbox mode):\n\n` +
            marks.map((mark: any, index) => 
              `${index + 1}. **${mark.subject}**\n` +
              `   - Mark: ${mark.mark}%\n` +
              `   - Term: ${mark.term}\n` +
              `   - Assessment: ${mark.assessment_type}\n` +
              `   - Date: ${mark.date}\n`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          return createTextResponse(
            `ℹ️ Assessment data not available in current D6 integration.\n\n` +
            `Contact D6 support for access to learner marks and assessment data.`
          );
        }
      }

      case 'get_staff': {
        const { schoolId } = args as { schoolId?: string };
        
        if (SANDBOX_MODE) {
          const schoolIdNum = schoolId ? parseInt(schoolId, 10) : 1001;
          const staff = mockDataService.getStaff(schoolIdNum);
          const summary = `Found ${staff.length} staff members for school ID ${schoolIdNum} (sandbox mode):\n\n` +
            staff.map((member: any, index) => 
              `${index + 1}. **${member.first_name} ${member.last_name}**\n` +
              `   - Staff ID: ${member.staff_id}\n` +
              `   - Role: ${member.role}\n` +
              `   - Email: ${member.email}\n` +
              `   - Subjects: ${member.subjects?.join(', ') || 'Not specified'}\n`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          return createTextResponse(
            `ℹ️ Staff data not available in current D6 integration.\n\n` +
            `Contact D6 support for access to staff information.`
          );
        }
      }

      case 'get_parents': {
        const { learnerId } = args as { learnerId?: string };
        
        if (SANDBOX_MODE) {
          const parents = mockDataService.getParents(1001); // Default school
          const summary = `Found ${parents.length} parents (sandbox mode):\n\n` +
            parents.slice(0, 5).map((parent: any, index) => 
              `${index + 1}. **${parent.first_name} ${parent.last_name}**\n` +
              `   - Parent ID: ${parent.parent_id}\n` +
              `   - Relationship: ${parent.relationship}\n` +
              `   - Email: ${parent.email}\n` +
              `   - Phone: ${parent.phone}\n`
            ).join('\n') +
            (parents.length > 5 ? `\n... and ${parents.length - 5} more parents` : '');
          
          return createTextResponse(summary);
        } else {
          return createTextResponse(
            `ℹ️ Parent data not available in current D6 integration.\n\n` +
            `Contact D6 support for access to parent information.`
          );
        }
      }

      case 'get_lookup_data': {
        const { type } = args as { type?: string };
        const lookupType = type || 'genders';
        
        if (SANDBOX_MODE) {
          const lookupData = mockDataService.getLookupData(lookupType);
          const summary = `${lookupType} lookup data (sandbox mode):\n\n` +
            lookupData.map((item: any, index) => 
              `${index + 1}. ${item.name || item.id}`
            ).join('\n');
          
          return createTextResponse(summary);
        } else {
          // In production mode, try to get real D6 lookup data
          if (lookupType === 'genders') {
            const genders = await fetchFromD6Api('adminplus/lookup/genders');
            if (genders && Array.isArray(genders) && genders.length > 0) {
              const summary = `${lookupType} lookup data from D6 API:\n\n` +
                genders.map((item: any, index: number) => 
                  `${index + 1}. ${item.name} (${item.id})`
                ).join('\n');
              
              return createTextResponse(summary);
            } else {
              return createTextResponse(`❌ Error accessing D6 lookup data for ${lookupType}`);
            }
          } else {
            return createTextResponse(
              `ℹ️ Lookup type '${lookupType}' not available from D6 API.\n\n` +
              `Currently available: genders\nOther lookup types may require additional D6 integration setup.`
            );
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
          const schoolData = await fetchFromD6Api('settings/clients');
          const genderData = await fetchFromD6Api('adminplus/lookup/genders');
          
          const summary = `System Health Check:\n\n` +
            `${schoolData ? '🟢' : '🔴'} **Status:** ${schoolData ? 'HEALTHY' : 'ERROR'}\n` +
            `🔗 **School API:** ${schoolData ? 'Available' : 'Not available'}\n` +
            `🔗 **Lookup API:** ${genderData ? 'Available' : 'Not available'}\n` +
            `⏰ **Timestamp:** ${new Date().toISOString()}\n` +
            `🎭 **Mode:** Production`;
          
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
          const summary = `D6 Integration Information (Production Mode):\n\n` +
            `🏫 **School:** d6 Integrate API Test School\n` +
            `🔗 **Integration ID:** 1694\n` +
            `⚙️ **API Type:** d6 Integrate API\n` +
            `✅ **Activated:** No (Non-billable test environment)\n\n` +
            `📊 **Available Data:**\n` +
            `   - School information\n` +
            `   - Gender lookup data\n\n` +
            `⚠️ **Current Limitations:**\n` +
            `   - Learner data endpoints not available\n` +
            `   - Staff data endpoints not available\n` +
            `   - Parent data endpoints not available\n` +
            `   - Assessment data endpoints not available\n` +
            `   - Limited lookup data (genders only)\n\n` +
            `📞 **Contact D6 Support:** support@d6plus.co.za\n` +
            `🔧 **Request:** Activate additional endpoints for integration 1694`;
          
          return createTextResponse(summary);
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.exit(1);
}); 