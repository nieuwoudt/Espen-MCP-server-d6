/**
 * Vercel Edge Function - MCP Handler
 * Single source of truth for MCP on Vercel
 * Uses shared handler for consistency with Cloudflare Worker
 */

import { handleMcpRequest, EnvLike } from '../src/mcpHandler';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  const env: EnvLike = {
    D6_API_USERNAME: process.env.D6_API_USERNAME,
    D6_API_PASSWORD: process.env.D6_API_PASSWORD,
    D6_API_BASE_URL: process.env.D6_API_BASE_URL,
    D6_MOCK_MODE: process.env.D6_MOCK_MODE,
    D6_ALLOWED_SCHOOL_LOGIN_IDS: process.env.D6_ALLOWED_SCHOOL_LOGIN_IDS,
    D6_SCHOOL_MAP: process.env.D6_SCHOOL_MAP,
    NODE_ENV: process.env.NODE_ENV,
    ESPEN_ENV: process.env.ESPEN_ENV,
  };

  return handleMcpRequest(req, env);
}

