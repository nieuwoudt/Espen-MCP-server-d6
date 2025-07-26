/**
 * Cloudflare Worker - Remote MCP Server (Simplified)
 * Espen D6 School Management System Integration
 * 
 * This worker provides remote MCP access to D6 school data using only Web APIs
 * compatible with Cloudflare Workers runtime.
 */

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

// Simple logger for Cloudflare Workers
class SimpleLogger {
  static info(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  }
  
  static error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error);
  }
}

// Mock data for fallback
const mockLearners = [
  {
    LearnerID: "2001",
    FirstName: "Amara",
    LastName: "Ngcobo",
    Grade: 7,
    LanguageOfInstruction: "English",
    Class: "7A",
    EnrollmentDate: "2024-01-15",
    IsActive: true,
    HomeLanguage: "Zulu"
  },
  {
    LearnerID: "2002", 
    FirstName: "Liam",
    LastName: "Van Der Merwe",
    Grade: 8,
    LanguageOfInstruction: "English",
    Class: "8B",
    EnrollmentDate: "2024-01-15", 
    IsActive: true,
    HomeLanguage: "Afrikaans"
  },
  {
    LearnerID: "2003",
    FirstName: "Kgothatso",
    LastName: "Molefe",
    Grade: 9,
    LanguageOfInstruction: "English",
    Class: "9A",
    EnrollmentDate: "2024-01-15",
    IsActive: true,
    HomeLanguage: "Setswana"
  }
];

const mockStaff = [
  {
    StaffID: "4001",
    FirstName: "Patricia",
    LastName: "Mthembu",
    Position: "Mathematics Teacher",
    Department: "Mathematics",
    SubjectsTaught: ["Mathematics", "Physical Sciences"],
    IsActive: true,
    Email: "p.mthembu@school.za"
  },
  {
    StaffID: "4002",
    FirstName: "David",
    LastName: "Williams", 
    Position: "English Teacher",
    Department: "Languages",
    SubjectsTaught: ["English Home Language"],
    IsActive: true,
    Email: "d.williams@school.za"
  }
];

const mockParents = [
  {
    ParentID: "3001",
    FirstName: "Themba",
    LastName: "Ngcobo",
    RelationshipType: "Father",
    PhoneNumber: "+27821234567",
    Email: "themba.ngcobo@email.com",
    Address: "123 Main St, Johannesburg",
    LearnerIDs: ["2001"],
    IsPrimaryContact: true
  },
  {
    ParentID: "3002",
    FirstName: "Sarah",
    LastName: "Van Der Merwe",
    RelationshipType: "Mother", 
    PhoneNumber: "+27827654321",
    Email: "sarah.vdm@email.com",
    Address: "456 Oak Ave, Cape Town",
    LearnerIDs: ["2002"],
    IsPrimaryContact: true
  }
];

const mockMarks = [
  {
    LearnerID: "2001",
    SubjectID: "MATH001",
    Term: 1,
    AcademicYear: 2024,
    MarkValue: 78,
    TotalMarks: 100,
    MarkType: "Test",
    AssessmentDate: "2024-03-15",
    RecordedDate: "2024-03-16"
  },
  {
    LearnerID: "2001",
    SubjectID: "ENG001", 
    Term: 1,
    AcademicYear: 2024,
    MarkValue: 85,
    TotalMarks: 100,
    MarkType: "Assignment",
    AssessmentDate: "2024-03-20",
    RecordedDate: "2024-03-21"
  }
];

// Simple D6 API client using fetch
class SimpleD6Client {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(env: Env) {
    this.baseUrl = env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v2';
    this.username = env.D6_API_USERNAME || 'espenaitestapi';
    this.password = env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'HTTP-X-USERNAME': this.username,
      'HTTP-X-PASSWORD': this.password
    };
  }

  async getClientIntegrations() {
    try {
      const response = await fetch(`${this.baseUrl}/settings/clients`, {
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [data];
      }
    } catch (error) {
      SimpleLogger.error('D6 API Error:', error);
    }
    
    // Fallback to mock data
    return [{
      school_login_id: "1694",
      school_name: "d6 Integrate API Test School",
      admin_email_address: "support@d6plus.co.za",
      api_type: "d6 Integrate API",
      activated_by_integrator: "Yes"
    }];
  }

  async getLearners(schoolId: number = 1694) {
    try {
      const response = await fetch(`${this.baseUrl}/adminplus/learners`, {
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (error) {
      SimpleLogger.error('D6 Learners Error:', error);
    }
    
    SimpleLogger.info('Using mock learners data');
    return mockLearners;
  }

  async getStaff(schoolId: number = 1694) {
    try {
      const response = await fetch(`${this.baseUrl}/adminplus/staffmembers`, {
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (error) {
      SimpleLogger.error('D6 Staff Error:', error);
    }
    
    SimpleLogger.info('Using mock staff data');
    return mockStaff;
  }

  async getParents(schoolId: number = 1694) {
    try {
      const response = await fetch(`${this.baseUrl}/adminplus/parents`, {
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (error) {
      SimpleLogger.error('D6 Parents Error:', error);
    }
    
    SimpleLogger.info('Using mock parents data');
    return mockParents;
  }

  async getMarks(learnerId: number) {
    // D6 marks endpoints are not activated yet, use mock data
    SimpleLogger.info('Using mock marks data - D6 endpoint not activated');
    return mockMarks.filter(mark => mark.LearnerID === learnerId.toString());
  }

  async getLookupData(type: string = 'genders') {
    try {
      const response = await fetch(`${this.baseUrl}/adminplus/lookup/${type}`, {
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      SimpleLogger.error('D6 Lookup Error:', error);
    }
    
    // Mock lookup data
    const mockLookups: Record<string, any[]> = {
      genders: [
        { id: '1', name: 'Male' },
        { id: '2', name: 'Female' }
      ],
      grades: [
        { id: '7', name: 'Grade 7' },
        { id: '8', name: 'Grade 8' },
        { id: '9', name: 'Grade 9' }
      ]
    };
    
    return mockLookups[type] || [];
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/settings/systemhealth`, {
        headers: this.getHeaders()
      });
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        d6ApiAvailable: response.ok,
        timestamp: new Date().toISOString(),
        response_time_ms: 0
      };
    } catch (error) {
      return {
        status: 'degraded',
        d6ApiAvailable: false,
        timestamp: new Date().toISOString(),
        response_time_ms: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// MCP Tools Implementation
async function handleMCPRequest(request: MCPRequest, env: Env): Promise<MCPResponse> {
  const d6Client = new SimpleD6Client(env);
  
  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: true
              },
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
                description: 'Get parent information from the D6 system',
                inputSchema: {
                  type: 'object',
                  properties: {
                    schoolId: {
                      type: 'string',
                      description: 'Optional school ID to filter parents',
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
                      description: 'Type of lookup data (genders, grades)',
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
    SimpleLogger.error('MCP Request Error:', error);
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
  const d6Client = new SimpleD6Client(env);
  const { name, arguments: args } = params;

  try {
    let result: any;

    switch (name) {
      case 'get_schools':
        const schools = await d6Client.getClientIntegrations();
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
        const learners = await d6Client.getLearners(schoolId);
        result = {
          content: [
            {
              type: 'text',
              text: `👨‍🎓 **Learners (${learners.length} found)**\n\n${JSON.stringify(learners, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_staff':
        const staffSchoolId = args?.schoolId ? parseInt(args.schoolId) : 1694;
        const staff = await d6Client.getStaff(staffSchoolId);
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
        const parents = await d6Client.getParents(parentSchoolId);
        result = {
          content: [
            {
              type: 'text',
              text: `👪 **Parents (${parents.length} found)**\n\n${JSON.stringify(parents, null, 2)}`,
            },
          ],
        };
        break;

      case 'get_learner_marks':
        if (!args?.learnerId) {
          throw new Error('learnerId is required');
        }
        const learnerId = parseInt(args.learnerId);
        const marks = await d6Client.getMarks(learnerId);
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
        const lookupData = await d6Client.getLookupData(lookupType);
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
        const health = await d6Client.healthCheck();
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
        const clientInfo = await d6Client.getClientIntegrations();
        result = {
          content: [
            {
              type: 'text',
              text: `⚙️ **Integration Information**\n\n${JSON.stringify({
                server: 'espen-d6-remote',
                version: '1.0.0',
                mode: env.D6_PRODUCTION_MODE === 'true' ? 'production' : 'hybrid',
                d6ApiUrl: env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v2',
                clientIntegrations: clientInfo
              }, null, 2)}`,
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
    SimpleLogger.error(`Tool call error (${name}):`, error);
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
        return new Response(`data: {"jsonrpc":"2.0","method":"connection","params":{"status":"connected"}}\n\n`, {
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
          SimpleLogger.error('SSE POST Error:', error);
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