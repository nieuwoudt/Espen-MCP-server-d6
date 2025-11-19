/**
 * Minimal Cloudflare Worker - Remote MCP Server
 * Pure Web API implementation for Espen D6 School Management System
 * Delegates to shared MCP handler
 */

import { handleMcpRequest } from './mcpHandler';

interface Env {
  D6_API_USERNAME: string;
  D6_API_PASSWORD: string;
  D6_API_BASE_URL?: string;
  D6_MOCK_MODE?: string;
  D6_ALLOWED_SCHOOL_LOGIN_IDS?: string;
  D6_SCHOOL_MAP?: string;
  NODE_ENV?: string;
  ESPEN_ENV?: string;
  // Legacy support
  D6_MONUMENTPARK_SCHOOL_LOGIN_ID?: string;
  ALLOWED_SCHOOL_IDS?: string;
}

// Main Worker Export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleMcpRequest(request, env);
  },
};
