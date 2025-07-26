# 🌐 Cloudflare Remote MCP Server Setup Guide

## Overview

This guide will help you deploy your Espen D6 MCP Server to Cloudflare Workers and connect it to Claude Desktop via remote URL. The remote server uses Server-Sent Events (SSE) transport instead of the local stdio transport.

## 🚀 Quick Start

### Prerequisites

- ✅ Cloudflare account (free tier works)
- ✅ Wrangler CLI (already installed in project)
- ✅ D6 API credentials

### Step 1: Test Local Development

First, test the remote server locally:

```bash
# Start the Cloudflare Worker locally
npm run mcp:remote

# Server will be available at: http://localhost:8787/sse
```

### Step 2: Set Cloudflare Secrets

Set your D6 API credentials as Cloudflare secrets:

```bash
# Set D6 API credentials (required)
npx wrangler secret put D6_API_USERNAME
# Enter: espenaitestapi

npx wrangler secret put D6_API_PASSWORD  
# Enter: qUz3mPcRsfSWxKR9qEnm
```

### Step 3: Deploy to Cloudflare

```bash
# Deploy to production
npm run deploy:remote

# Your server will be available at:
# https://espen-d6-mcp-remote.YOUR-ACCOUNT.workers.dev
```

## 🔗 Connect to Claude Desktop

### Option 1: Using mcp-remote (Local Proxy)

Update your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "espen-d6-remote": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://espen-d6-mcp-remote.YOUR-ACCOUNT.workers.dev/sse"
      ]
    }
  }
}
```

### Option 2: Direct URL Connection (Claude.ai Web)

For Claude.ai web interface:

1. Go to [claude.ai](https://claude.ai)
2. Click on "Settings" → "Custom Connectors" 
3. Add new connector:
   - **Name**: Espen D6 School Data
   - **URL**: `https://espen-d6-mcp-remote.YOUR-ACCOUNT.workers.dev/sse`
   - **Description**: Access to D6 school management data

## 🛠️ Available MCP Tools

Once connected, Claude will have access to these 8 tools:

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `get_schools` | School information | "Get school information" |
| `get_learners` | Student data | "Show me 5 learners from the school" |
| `get_staff` | Staff directory | "Get staff members" |
| `get_parents` | Parent information | "Show me parent data" |
| `get_learner_marks` | Academic records | "Get marks for learner 2001" |
| `get_lookup_data` | Reference data | "Get gender lookup data" |
| `get_system_health` | API status | "Check system health" |
| `get_integration_info` | Integration details | "Show integration info" |

## 🧪 Testing Your Remote Server

### Health Check

Test your deployed server:

```bash
curl https://espen-d6-mcp-remote.YOUR-ACCOUNT.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "espen-d6-mcp-remote",
  "version": "1.0.0",
  "timestamp": "2024-07-22T..."
}
```

### MCP Inspector

Test with the MCP Inspector:

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Start inspector
npx @modelcontextprotocol/inspector

# Connect to: https://espen-d6-mcp-remote.YOUR-ACCOUNT.workers.dev/sse
```

## 🔧 Configuration Options

### Environment Variables

Set in Cloudflare Workers dashboard or via Wrangler:

| Variable | Value | Required |
|----------|-------|----------|
| `D6_API_USERNAME` | espenaitestapi | Yes |
| `D6_API_PASSWORD` | qUz3mPcRsfSWxKR9qEnm | Yes |
| `D6_API_BASE_URL` | https://integrate.d6plus.co.za/api/v2 | No (default) |
| `D6_PRODUCTION_MODE` | true | No (default) |

### Wrangler Configuration

Your `wrangler.toml` is already configured:

```toml
name = "espen-d6-mcp-remote"
main = "src/cloudflare-worker.ts"
compatibility_date = "2024-07-22"
compatibility_flags = ["nodejs_compat"]

[vars]
D6_API_BASE_URL = "https://integrate.d6plus.co.za/api/v2"
D6_PRODUCTION_MODE = "true"
NODE_ENV = "production"
```

## 🚨 Troubleshooting

### Common Issues

1. **Worker fails to deploy**
   ```bash
   # Check for syntax errors
   npm run build
   
   # Check wrangler configuration
   npx wrangler whoami
   ```

2. **MCP tools not working**
   ```bash
   # Check secrets are set
   npx wrangler secret list
   
   # View worker logs
   npx wrangler tail
   ```

3. **Claude can't connect**
   ```bash
   # Test SSE endpoint
   curl -X POST https://your-worker.workers.dev/sse \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

### Development Commands

```bash
# Local development
npm run mcp:remote              # Start local Cloudflare Worker

# Deployment
npm run deploy:cloudflare       # Deploy to Cloudflare
npm run deploy:remote          # Deploy to production environment

# Testing
npx wrangler tail              # View live logs
npx wrangler kv:namespace list # List KV namespaces (if using)
```

## 🎯 Benefits of Remote MCP Server

### ✅ **Always Available**
- No local server management required
- Global Cloudflare edge deployment
- Automatic scaling and load balancing

### ✅ **Universal Access** 
- Works with Claude Desktop, Cursor, and other MCP clients
- Direct web access via claude.ai
- No local configuration needed for team members

### ✅ **Production Ready**
- Cloudflare's enterprise infrastructure
- Built-in DDoS protection and CDN
- Free tier supports thousands of requests

### ✅ **Hybrid Data Mode**
- Real D6 API data where available
- Intelligent fallback to mock data
- Consistent functionality regardless of D6 status

## 🔄 Next Steps

1. **Deploy your server**: `npm run deploy:remote`
2. **Connect to Claude**: Update your MCP configuration
3. **Test the tools**: Ask Claude to get school data
4. **Share with team**: Give them the remote URL

## 📞 Support

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Issues**: Check `npx wrangler tail` for live debugging

---

🎉 **You're ready to use your Espen D6 MCP Server remotely!** 