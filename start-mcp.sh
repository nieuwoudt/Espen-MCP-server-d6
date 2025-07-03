#!/bin/bash
# Set working directory
PROJECT_DIR="/Users/nieuwoudtgresse/Desktop/Espen MCP <> D6 /espen-d6-mcp-server"
cd "$PROJECT_DIR"

# Set environment variables
export D6_SANDBOX_MODE=true
export NODE_ENV=development

# Run with full path to avoid any npm issues
exec npx tsx "$PROJECT_DIR/src/mcp-server.ts" 