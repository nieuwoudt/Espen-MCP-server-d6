/**
 * Cloudflare Worker - Remote MCP Server
 * Espen D6 School Management System Integration
 * 
 * This worker provides remote MCP (Model Context Protocol) access to D6 school data
 * using Server-Sent Events (SSE) transport for AI clients like Claude Desktop.
 */

import { D6ApiServiceHybrid } from './services/d6ApiService-hybrid.js';

// Types for Cloudflare Worker environment
interface Env {
  D6_API_USERNAME: string;
  D6_API_PASSWORD: string;
  D6_API_BASE_URL?: string;
  D6_PRODUCTION_MODE?: string;
  NODE_ENV?: string;
}

// MCP Protocol types
interface MCPRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

// Initialize D6 service (will be configured per request)
let d6Service: D6ApiServiceHybrid | null = null;

function getD6Service(env: Env): D6ApiServiceHybrid {
  if (!d6Service) {
    const config = {
      baseUrl: env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v2',
      username: env.D6_API_USERNAME || 'espenaitestapi',
      password: env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
      enableMockData: true,  // Always enable fallback for remote deployment
      useMockDataFirst: false // Try real D6 API first
    };
    
    d6Service = D6ApiServiceHybrid.getInstance(config);
  }
  return d6Service;
}

// MCP Tools Implementation
async function handleMCPRequest(request: MCPRequest, env: Env): Promise<MCPResponse> {
  const d6 = getD6Service(env);
  
  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'espen-d6-remote',
              version: '1.0.0',
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'get_schools',
                description: 'Get information about schools/client integrations in the D6 system',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  additionalProperties: false,
                },
              },
              {
                name: 'get_learners',
                description: '⚠️ RETURNS ALL 1,270+ LEARNERS BY DEFAULT. Use this for complete student analysis, filtering, and reporting. Now provides full dataset access unless specifically paginated.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    schoolId: {
                      type: 'string',
                      description: 'Optional school ID to filter learners',
                    },
                    limit: {
                      type: 'string',
                      description: 'Optional: Limit records for pagination (default: ALL 1,270+ records)',
                    },
                    offset: {
                      type: 'string',
                      description: 'Optional: Skip records for pagination (default: 0)',
                    },
                  },
                  additionalProperties: false,
                },
              },
              {
                name: 'get_staff',
                description: 'Get staff members from the D6 system',
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
              },
              {
                name: 'get_parents',
                description: 'Get parent information from the D6 system with pagination',
                inputSchema: {
                  type: 'object',
                  properties: {
                    schoolId: {
                      type: 'string',
                      description: 'Optional school ID to filter parents',
                    },
                    limit: {
                      type: 'string',
                      description: 'Number of records to return (default: 50, max: 1000)',
                    },
                    offset: {
                      type: 'string',
                      description: 'Number of records to skip for pagination (default: 0)',
                    },
                  },
                  additionalProperties: false,
                },
              },
              {
                name: 'get_learner_marks',
                description: 'Get academic marks for a specific learner',
                inputSchema: {
                  type: 'object',
                  properties: {
                    learnerId: {
                      type: 'string',
                      description: 'The ID of the learner to get marks for',
                    },
                    term: {
                      type: 'string',
                      description: 'Optional term filter',
                    },
                  },
                  required: ['learnerId'],
                  additionalProperties: false,
                },
              },
              {
                name: 'get_lookup_data',
                description: 'Get lookup/reference data from the D6 system',
                inputSchema: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      description: 'Type of lookup data (genders, grades, languages)',
                    },
                  },
                  additionalProperties: false,
                },
              },
              {
                name: 'get_system_health',
                description: 'Check the health status of the D6 API integration',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  additionalProperties: false,
                },
              },
              {
                name: 'get_integration_info',
                description: 'Get information about the D6 integration configuration',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  additionalProperties: false,
                },
              },
              {
                name: 'get_all_learners',
                description: 'Get ALL learners from the D6 system (no pagination limit) - use with caution for large datasets',
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
              },
            ],
          },
        };

      case 'tools/call':
        return await handleToolCall(request.params, env);

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        };
    }
  } catch (error) {
    console.error('MCP Request Error:', error);
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

async function handleToolCall(params: any, env: Env): Promise<MCPResponse> {
  const d6 = getD6Service(env);
  const { name, arguments: args } = params;

  try {
    let result: any;

    switch (name) {
      case 'get_schools':
        const schools = await d6.getClientIntegrations();
        result = {
          content: [
            {
              type: 'text',
              text: `📚 **Schools/Client Integrations**\n\n${JSON.stringify(schools, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_learners':
        const schoolId = args?.schoolId ? parseInt(args.schoolId) : 1694;
        const learners = await d6.getLearners(schoolId);
        const totalCount = learners.length;
        
        if (args?.limit) {
          // User wants pagination
          const limit = parseInt(args.limit);
          const offset = args?.offset ? parseInt(args.offset) : 0;
          const paginatedLearners = learners.slice(offset, offset + limit);
          
          result = {
            content: [
              {
                type: 'text',
                text: `👨‍🎓 **Learners (${totalCount} total, showing ${paginatedLearners.length} from position ${offset + 1})**\n\n${JSON.stringify(paginatedLearners, null, 2)}${totalCount > offset + limit ? `\n\n📄 **Pagination Info:**\n- Total Records: ${totalCount}\n- Shown: ${offset + 1}-${offset + paginatedLearners.length}\n- To get more: Use offset=${offset + limit} and limit=${limit}` : '\n\n✅ **All records shown**'}`,
              },
            ],
          };
        } else {
          // Return ALL data by default
          result = {
            content: [
              {
                type: 'text',
                text: `👨‍🎓 **ALL Learners (${totalCount} total records - COMPLETE DATASET)**\n\n${JSON.stringify(learners, null, 2)}\n\n✅ **Complete dataset provided - all ${totalCount} learners included**`,
              },
            ],
          };
        }
        break;

      case 'get_staff':
        const staffSchoolId = args?.schoolId ? parseInt(args.schoolId) : 1694;
        const staff = await d6.getStaff(staffSchoolId);
        result = {
          content: [
            {
              type: 'text',
              text: `👨‍🏫 **Staff Members (${staff.length} found)**\n\n${JSON.stringify(staff, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_parents':
        const parentSchoolId = args?.schoolId ? parseInt(args.schoolId) : 1694;
        const parentLimit = args?.limit ? parseInt(args.limit) : 50;
        const parentOffset = args?.offset ? parseInt(args.offset) : 0;
        
        const parents = await d6.getParents(parentSchoolId);
        const totalParents = parents.length;
        const paginatedParents = parents.slice(parentOffset, parentOffset + parentLimit);
        
        result = {
          content: [
            {
              type: 'text',
              text: `👪 **Parents (${totalParents} total, showing ${paginatedParents.length} from position ${parentOffset + 1})**\n\n${JSON.stringify(paginatedParents, null, 2)}${totalParents > parentOffset + parentLimit ? `\n\n📄 **Pagination Info:**\n- Total Records: ${totalParents}\n- Shown: ${parentOffset + 1}-${parentOffset + paginatedParents.length}\n- To get more: Use offset=${parentOffset + parentLimit} and limit=${parentLimit}` : '\n\n✅ **All records shown**'}`,
            },
          ],
        };
        break;

      case 'get_learner_marks':
        if (!args?.learnerId) {
          throw new Error('learnerId is required');
        }
        const learnerId = parseInt(args.learnerId);
        const marks = await d6.getMarks(learnerId);
        result = {
          content: [
            {
              type: 'text',
              text: `📊 **Academic Marks for Learner ${learnerId}**\n\n${JSON.stringify(marks, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_lookup_data':
        const lookupType = args?.type || 'genders';
        const lookupData = await d6.getLookupData(lookupType);
        result = {
          content: [
            {
              type: 'text',
              text: `📋 **Lookup Data (${lookupType})**\n\n${JSON.stringify(lookupData, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_system_health':
        const health = await d6.healthCheck();
        result = {
          content: [
            {
              type: 'text',
              text: `🏥 **System Health Status**\n\n${JSON.stringify(health, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_integration_info':
        const clientInfo = await d6.getClientInfo();
        result = {
          content: [
            {
              type: 'text',
              text: `⚙️ **Integration Information**\n\n${JSON.stringify(clientInfo, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_all_learners':
        const allLearnersSchoolId = args?.schoolId ? parseInt(args.schoolId) : 1694;
        const allLearners = await d6.getLearners(allLearnersSchoolId);
        
        result = {
          content: [
            {
              type: 'text',
              text: `👨‍🎓 **ALL Learners (${allLearners.length} total records)**\n\n${JSON.stringify(allLearners, null, 2)}\n\n✅ **Complete dataset provided**`,
            },
          ],
        };
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      jsonrpc: '2.0',
      id: 1,
      result,
    };
  } catch (error) {
    console.error(`Tool call error (${name}):`, error);
    return {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32603,
        message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    };
  }
}

// SSE Response helper
function createSSEResponse(data: string): Response {
  return new Response(`data: ${data}\n\n`, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Main Worker Export
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'espen-d6-mcp-remote',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // MCP SSE endpoint
    if (url.pathname === '/sse') {
      if (request.method === 'GET') {
        // Initial SSE connection
        return createSSEResponse('{"jsonrpc":"2.0","method":"connection","params":{"status":"connected"}}');
      }

      if (request.method === 'POST') {
        try {
          const mcpRequest: MCPRequest = await request.json();
          const mcpResponse = await handleMCPRequest(mcpRequest, env);
          
          return new Response(JSON.stringify(mcpResponse), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          console.error('SSE POST Error:', error);
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32700,
                message: 'Parse error',
              },
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }
      }
    }

    // Default response
    return new Response(
      JSON.stringify({
        name: 'Espen D6 Remote MCP Server',
        description: 'Remote MCP server for D6 school management system integration',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          mcp: '/sse',
        },
        tools: 8,
        mode: env.D6_PRODUCTION_MODE === 'true' ? 'production' : 'hybrid',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  },
}; 