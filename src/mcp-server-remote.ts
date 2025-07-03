#!/usr/bin/env node

/**
 * Remote Espen D6 MCP Server for Claude.ai Integration
 * Provides HTTP endpoint for remote MCP connections
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import services
import { D6ApiService } from './services/d6ApiService-hybrid.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://claude.ai', 'https://*.anthropic.com'],
  credentials: true
}));
app.use(express.json());

// Initialize D6 service
const d6Service = new D6ApiService();

// Create MCP Server
const server = new Server(
  {
    name: 'espen-d6-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'get_schools',
    description: 'Get list of schools available in the D6 system',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_learners',
    description: 'Get learners from the D6 system with optional school filtering',
    inputSchema: {
      type: 'object',
      properties: {
        school_id: {
          type: 'string',
          description: 'Optional school ID to filter learners',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of learners to return (default: 10)',
          default: 10,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_learner_marks',
    description: 'Get academic marks for a specific learner',
    inputSchema: {
      type: 'object',
      properties: {
        learner_id: {
          type: 'string',
          description: 'The unique identifier for the learner',
        },
      },
      required: ['learner_id'],
    },
  },
  {
    name: 'get_staff',
    description: 'Get staff members from the D6 system with optional school filtering',
    inputSchema: {
      type: 'object',
      properties: {
        school_id: {
          type: 'string',
          description: 'Optional school ID to filter staff',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of staff to return (default: 10)',
          default: 10,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_parents',
    description: 'Get parent information from the D6 system',
    inputSchema: {
      type: 'object',
      properties: {
        school_id: {
          type: 'string',
          description: 'Optional school ID to filter parents',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of parents to return (default: 10)',
          default: 10,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_lookup_data',
    description: 'Get system lookup data (genders, grades, languages, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of lookup data to retrieve',
          enum: ['genders', 'grades', 'languages', 'all'],
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'get_system_health',
    description: 'Check D6 API connectivity and system health',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_integration_info',
    description: 'Get information about the current D6 integration setup',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_schools': {
        const schools = await d6Service.getSchools();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(schools, null, 2),
            },
          ],
        };
      }

      case 'get_learners': {
        const { school_id, limit = 10 } = args as { school_id?: string; limit?: number };
        const learners = await d6Service.getLearners(school_id);
        const limitedLearners = learners.slice(0, limit);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(limitedLearners, null, 2),
            },
          ],
        };
      }

      case 'get_learner_marks': {
        const { learner_id } = args as { learner_id: string };
        if (!learner_id) {
          throw new McpError(ErrorCode.InvalidParams, 'learner_id is required');
        }
        
        const marks = await d6Service.getLearnerMarks(learner_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(marks, null, 2),
            },
          ],
        };
      }

      case 'get_staff': {
        const { school_id, limit = 10 } = args as { school_id?: string; limit?: number };
        const staff = await d6Service.getStaff(school_id);
        const limitedStaff = staff.slice(0, limit);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(limitedStaff, null, 2),
            },
          ],
        };
      }

      case 'get_parents': {
        const { school_id, limit = 10 } = args as { school_id?: string; limit?: number };
        const parents = await d6Service.getParents(school_id);
        const limitedParents = parents.slice(0, limit);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(limitedParents, null, 2),
            },
          ],
        };
      }

      case 'get_lookup_data': {
        const { type } = args as { type: string };
        const lookupData = await d6Service.getLookupData(type);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(lookupData, null, 2),
            },
          ],
        };
      }

      case 'get_system_health': {
        const health = await d6Service.getSystemHealth();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      }

      case 'get_integration_info': {
        const info = await d6Service.getIntegrationInfo();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error('Tool execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'espen-d6-mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// MCP endpoint info
app.get('/', (req, res) => {
  res.json({
    name: 'Espen D6 MCP Server',
    description: 'Remote MCP server for D6 school management system integration',
    version: '1.0.0',
    mcp_version: '2024-11-05',
    tools: TOOLS.length,
    capabilities: ['tools'],
    endpoints: {
      websocket: '/mcp',
      health: '/health'
    }
  });
});

// Create HTTP server
const httpServer = createServer(app);

// WebSocket server for MCP
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/mcp'
});

wss.on('connection', (ws) => {
  logger.info('New MCP WebSocket connection established');
  
  // Create a WebSocket transport adapter
  const transport = {
    start: async () => {
      logger.info('MCP transport started');
    },
    close: async () => {
      logger.info('MCP transport closed');
      ws.close();
    },
    send: async (message: any) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  };

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      logger.info('Received MCP message:', message);
      
      // Handle the message through the MCP server
      // Note: This is a simplified implementation
      // In a production setup, you'd want proper transport handling
      
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    logger.info('MCP WebSocket connection closed');
  });

  ws.on('error', (error) => {
    logger.error('MCP WebSocket error:', error);
  });
});

// Start server
async function main() {
  const mode = process.env.D6_PRODUCTION_MODE === 'true' ? 'production' : 'sandbox';
  
  logger.info(`[MCP] Starting Espen D6 Remote MCP Server (mode: ${mode})`);
  
  // Initialize D6 service
  try {
    await d6Service.initialize();
    logger.info('D6 service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize D6 service:', error);
  }

  // Start HTTP server
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Espen D6 MCP Server running on port ${PORT}`);
    logger.info(`📡 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔌 MCP WebSocket: ws://localhost:${PORT}/mcp`);
    logger.info(`🌐 Ready for Claude.ai remote integration!`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

if (require.main === module) {
  main().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
} 