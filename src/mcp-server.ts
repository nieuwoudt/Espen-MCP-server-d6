#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { D6ApiServiceHybrid } from './services/d6ApiService-hybrid.js';
import { D6MockDataService } from './services/d6MockDataService.js';

// Check mode - production mode overrides sandbox mode
const PRODUCTION_MODE = process.env.D6_PRODUCTION_MODE === 'true';
const SANDBOX_MODE = !PRODUCTION_MODE && (process.env.D6_SANDBOX_MODE === 'true' || process.env.NODE_ENV === 'development');

// Initialize services
const d6Config = {
  baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v1',
  username: process.env.D6_API_USERNAME || 'espenaitestapi',
  password: process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
  enableMockData: !PRODUCTION_MODE,
  useMockDataFirst: SANDBOX_MODE
};

const d6Service = D6ApiServiceHybrid.getInstance(d6Config);
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

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    // Log to stderr only to avoid interfering with MCP JSON responses
    const mode = PRODUCTION_MODE ? 'production' : SANDBOX_MODE ? 'sandbox' : 'hybrid';
    process.stderr.write(`[MCP] Tool called: ${name} (mode: ${mode})\n`);

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
          // Use real D6 API in production mode
          try {
            const schools = await d6Service.getClientIntegrations();
            const summary = `Found ${schools.length} schools from D6 API:\n\n` +
              schools.map((school, index) => 
                `${index + 1}. **${school.school_name}**\n` +
                `   - Login ID: ${school.school_login_id}\n` +
                `   - Contact: ${school.admin_email_address}\n` +
                `   - Phone: +${school.telephone_calling_code} ${school.telephone_number}\n` +
                `   - API Type: ${school.api_type}\n` +
                `   - Activated: ${school.activated_by_integrator}\n`
              ).join('\n');
            
            return createTextResponse(summary);
          } catch (error) {
            return createTextResponse(`❌ Error connecting to D6 API: ${error}\n\nSwitching to sandbox mode for demonstration...`);
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
          // Try to get real learner data from D6 API for school 1000
          try {
            const schoolIdNum = schoolId ? parseInt(schoolId, 10) : 1000; // Use school 1000 (linked to integration 1694)
            const learners = await d6Service.getLearners(schoolIdNum, { limit: 10 });
            const summary = `Found ${learners.length} learners for d6 + Primary School (ID: ${schoolIdNum}):\n\n` +
              learners.slice(0, 10).map((learner: any, index) => 
                `${index + 1}. **${learner.FirstName || learner.first_name} ${learner.LastName || learner.last_name}**\n` +
                `   - Student ID: ${learner.LearnerID || learner.learner_id}\n` +
                `   - Grade: ${learner.Grade || learner.grade}\n` +
                `   - Language: ${learner.LanguageOfInstruction || learner.home_language}\n`
              ).join('\n') + 
              (learners.length > 10 ? `\n... and ${learners.length - 10} more learners` : '');
            
            return createTextResponse(summary);
          } catch (error) {
            return createTextResponse(
              `ℹ️ Unable to access learner data from D6 API.\n\n` +
              `Error: ${error}\n\n` +
              `The integration (ID: 1694) is activated but may need additional API permissions.\n` +
              `School 1000 ("d6 + Primary School") is linked with 1,270 learners available.\n\n` +
              `Contact D6 support for access to learner endpoints:\n` +
              `📧 support@d6plus.co.za\n` +
              `📧 apidocs@d6.co.za`
            );
          }
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
          // Try to get real staff data from D6 API for school 1000
          try {
            const schoolIdNum = schoolId ? parseInt(schoolId, 10) : 1000; // Use school 1000 (linked to integration 1694)
            const staff = await d6Service.getStaff(schoolIdNum);
            const summary = `Found ${staff.length} staff members for d6 + Primary School (ID: ${schoolIdNum}):\n\n` +
              staff.map((member: any, index) => 
                `${index + 1}. **${member.FirstName || member.first_name} ${member.LastName || member.last_name}**\n` +
                `   - Staff ID: ${member.StaffID || member.staff_id}\n` +
                `   - Position: ${member.Position || member.role}\n` +
                `   - Department: ${member.Department || 'Academic'}\n` +
                `   - Subjects: ${(member.SubjectsTaught || member.subjects || []).join(', ') || 'Not specified'}\n`
              ).join('\n');
            
            return createTextResponse(summary);
          } catch (error) {
            return createTextResponse(
              `ℹ️ Unable to access staff data from D6 API.\n\n` +
              `Error: ${error}\n\n` +
              `The integration (ID: 1694) is activated but may need additional API permissions.\n` +
              `School 1000 ("d6 + Primary School") is linked with 77 staff members available.\n\n` +
              `Contact D6 support for access to staff endpoints:\n` +
              `📧 support@d6plus.co.za\n` +
              `📧 apidocs@d6.co.za`
            );
          }
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
          try {
            if (lookupType === 'genders') {
              const genders = await d6Service.getLookupData('genders');
              const summary = `${lookupType} lookup data from D6 API:\n\n` +
                genders.map((item, index) => 
                  `${index + 1}. ${item.name} (${item.id})`
                ).join('\n');
              
              return createTextResponse(summary);
            } else {
              return createTextResponse(
                `ℹ️ Lookup type '${lookupType}' not available from D6 API.\n\n` +
                `Currently available: genders\nOther lookup types may require additional D6 integration setup.`
              );
            }
          } catch (error) {
            return createTextResponse(`❌ Error accessing D6 lookup data: ${error}`);
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
          try {
            const health = await d6Service.healthCheck();
            const summary = `System Health Check:\n\n` +
              `${health.status === 'healthy' ? '🟢' : '🔴'} **Status:** ${health.status.toUpperCase()}\n` +
              `🔗 **APIs Available:** v1: ${health.apis.v1Available ? 'Yes' : 'No'}, v2: ${health.apis.v2Available ? 'Yes' : 'No'}\n` +
              `⚡ **Response Time:** ${health.response_time_ms}ms\n` +
              `⏰ **Timestamp:** ${health.timestamp}\n` +
              `🎭 **Mode:** ${health.mock_data_available ? 'Hybrid' : 'Production'}`;
            
            return createTextResponse(summary);
          } catch (error) {
            return createTextResponse(`❌ Error checking D6 API health: ${error}`);
          }
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
    process.stderr.write(`[MCP] Tool execution failed: ${request.params.name} - ${error}\n`);
    throw error;
  }
});

// Start the server
async function main() {
  const mode = PRODUCTION_MODE ? 'production' : SANDBOX_MODE ? 'sandbox' : 'hybrid';
  process.stderr.write(`[MCP] Starting Espen D6 MCP Server (mode: ${mode})\n`);
  
  // Check if running in remote hosting environment
  const isRemoteMode = process.env.RAILWAY_ENVIRONMENT || 
                      process.env.RENDER || 
                      process.env.VERCEL || 
                      process.env.PORT;
  
  if (isRemoteMode) {
    // Start HTTP server for remote hosting
    await startHttpServer();
  } else {
    // Start stdio server for local use
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

async function startHttpServer() {
  const express = require('express');
  const cors = require('cors');
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'healthy',
      service: 'espen-d6-mcp-server',
      version: '1.0.0',
      mode: PRODUCTION_MODE ? 'production' : SANDBOX_MODE ? 'sandbox' : 'hybrid',
      timestamp: new Date().toISOString()
    });
  });
  
  // Server info endpoint
  app.get('/', (req: any, res: any) => {
    res.json({
      name: 'Espen D6 MCP Server',
      description: 'MCP server for D6 school management system integration',
      version: '1.0.0',
      capabilities: ['tools'],
      mode: PRODUCTION_MODE ? 'production' : SANDBOX_MODE ? 'sandbox' : 'hybrid',
      tools: [
        'get_schools',
        'get_learners', 
        'get_learner_marks',
        'get_staff',
        'get_parents',
        'get_lookup_data',
        'get_system_health',
        'get_integration_info'
      ]
    });
  });
  
  // Test endpoint to verify D6 integration
  app.get('/test', async (req: any, res: any) => {
    try {
      const health = await d6Service.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        error: 'D6 service test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Start server
  const httpServer = app.listen(PORT, () => {
    process.stderr.write(`🚀 Espen D6 MCP Server running on port ${PORT}\n`);
    process.stderr.write(`📡 Health check: http://localhost:${PORT}/health\n`);
    process.stderr.write(`🔍 Test endpoint: http://localhost:${PORT}/test\n`);
    process.stderr.write(`🌐 Ready for Claude.ai remote integration!\n`);
  });
  
  // Graceful shutdown
  const gracefulShutdown = () => {
    process.stderr.write('\n[MCP] Shutting down HTTP server...\n');
    httpServer.close(() => {
      process.exit(0);
    });
  };
  
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

main().catch((error) => {
  process.stderr.write(`[MCP] Failed to start server: ${error}\n`);
  process.exit(1);
}); 