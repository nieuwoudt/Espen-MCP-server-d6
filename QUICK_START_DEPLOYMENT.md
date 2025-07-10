# 🚀 Quick Start Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Vercel account (free tier works)
- Git installed

## 🎯 5-Minute Deployment

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/espen-ai/espen-d6-mcp-server.git
cd espen-d6-mcp-server

# Install dependencies
npm install

# Test locally (sandbox mode)
npm run mcp
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Step 3: Set Environment Variables

In your Vercel dashboard, add these environment variables:

```bash
D6_API_BASE_URL=https://integrate.d6plus.co.za/api/v1
D6_API_USERNAME=espenaitestapi
D6_API_PASSWORD=qUz3mPcRsfSWxKR9qEnm
D6_PRODUCTION_MODE=true
NODE_ENV=production
```

### Step 4: Test Your Deployment

```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector@latest https://your-domain.vercel.app/api/mcp

# Or test with curl
curl -X POST https://your-domain.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## 🔧 Configuration Options

### Sandbox Mode (No D6 Credentials Required)

```bash
# For development/testing
vercel env add D6_SANDBOX_MODE true
```

### Production Mode (Real D6 Data)

```bash
# For production use
vercel env add D6_PRODUCTION_MODE true
```

### Hybrid Mode (Automatic Fallback)

```bash
# Let the server decide (default)
# Don't set either D6_SANDBOX_MODE or D6_PRODUCTION_MODE
```

## 📱 MCP Client Integration

### Claude Desktop

Add to your `mcp.json`:

```json
{
  "mcpServers": {
    "espen-d6": {
      "url": "https://your-domain.vercel.app/api/mcp"
    }
  }
}
```

### Cursor

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "espen-d6": {
      "url": "https://your-domain.vercel.app/api/mcp"
    }
  }
}
```

## 🎮 Example Queries

Once deployed, you can ask your AI:

- **"Get some learners from the school"**
- **"Show me the system health of D6"**
- **"What staff members are available?"**
- **"Get school information"**
- **"Show me lookup data for genders and grades"**

## 🔍 Available MCP Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `get_schools` | School information | D6 Production |
| `get_learners` | Student data (1,270 students) | D6 Production |
| `get_staff` | Staff information (73 staff) | D6 Production |
| `get_parents` | Parent data (1,523 parents) | D6 Production |
| `get_learner_marks` | Academic marks | D6 (pending activation) |
| `get_lookup_data` | Reference data | D6 Production |
| `get_system_health` | API health status | D6 Production |
| `get_integration_info` | Integration details | D6 Production |

## 🛠️ Local Development

```bash
# Start local MCP server
npm run mcp

# Start with sandbox data
D6_SANDBOX_MODE=true npm run mcp

# Start with production data
D6_PRODUCTION_MODE=true npm run mcp

# Test different modes
npm run test:modes
```

## 📊 Monitoring

### Health Check

```bash
curl https://your-domain.vercel.app/api/health
```

### Logs

View logs in Vercel dashboard:
- Go to your project
- Click "Functions" tab
- View real-time logs

## 🚨 Troubleshooting

### Common Issues

1. **MCP Client Can't Connect**
   - Check URL format: `https://your-domain.vercel.app/api/mcp`
   - Verify deployment is live
   - Check Vercel function logs

2. **No Data Returned**
   - Set `D6_SANDBOX_MODE=true` for testing
   - Check environment variables are set
   - Verify D6 credentials

3. **Deployment Fails**
   - Run `npm run build` locally first
   - Check Node.js version (18+)
   - Verify `vercel.json` configuration

### Getting Help

- Check the [main README](README.md)
- Review [D6 Integration docs](D6_INTEGRATION.md)
- Open an issue on GitHub
- Check Vercel function logs

## 🎯 Success Indicators

✅ **Deployment successful** - Vercel shows "Success" status
✅ **MCP tools working** - Inspector shows 8 tools available
✅ **Data retrieval** - Can get learners, staff, parents
✅ **Health check** - `/api/health` returns 200 OK

---

**🎉 Congratulations! Your Espen D6 MCP Server is now live and ready to provide school data to AI models.** 