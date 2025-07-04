# 🚀 Vercel MCP Server Deployment Guide

This guide explains how to deploy the Espen D6 MCP Server to Vercel using the official `@vercel/mcp-adapter`.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **D6 API Credentials**: Get production credentials from D6
4. **Node.js 18+**: Required for deployment

## 🔧 Project Setup

The project is already configured for Vercel deployment with:

- ✅ `@vercel/mcp-adapter` package installed
- ✅ API route at `api/mcp/route.ts` using `createMcpHandler`
- ✅ `vercel.json` configuration file
- ✅ Environment variable setup
- ✅ Package.json scripts for deployment

## 🌍 Environment Variables

Before deploying, you need to set up environment variables in Vercel:

### Required Variables:
```bash
D6_API_BASE_URL=https://integrate.d6plus.co.za/api/v1
D6_API_USERNAME=espenaitestapi
D6_API_PASSWORD=qUz3mPcRsfSWxKR9qEnm
D6_PRODUCTION_MODE=true
NODE_ENV=production
```

### Setting Environment Variables:

**Option 1: Vercel Dashboard**
1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate scope (Production, Preview, Development)

**Option 2: Vercel CLI**
```bash
vercel env add D6_API_BASE_URL
vercel env add D6_API_USERNAME
vercel env add D6_API_PASSWORD
vercel env add D6_PRODUCTION_MODE
vercel env add NODE_ENV
```

## 🚀 Deployment Steps

### 1. Initial Setup
```bash
# Navigate to project directory
cd espen-d6-mcp-server

# Login to Vercel (if not already logged in)
vercel login

# Link project to Vercel (first time only)
vercel link
```

### 2. Deploy to Preview
```bash
# Deploy to preview environment for testing
npm run deploy:preview
# OR
vercel
```

### 3. Deploy to Production
```bash
# Deploy to production
npm run deploy
# OR
vercel --prod
```

## 🧪 Testing the Deployment

### 1. Test with MCP Inspector

Once deployed, your MCP server will be available at:
```
https://your-project-name.vercel.app/api/mcp
```

Test locally with the MCP inspector:
```bash
npx @modelcontextprotocol/inspector@latest https://your-project-name.vercel.app/api/mcp
```

### 2. Test in Cursor

Add to your Cursor MCP configuration:

**`.cursorrules` or MCP settings:**
```json
{
  "mcpServers": {
    "espen-d6": {
      "url": "https://your-project-name.vercel.app/api/mcp"
    }
  }
}
```

## 🛠️ Available MCP Tools

Your deployed server provides 8 tools:

1. **`get_integration_info`** - Server status and configuration
2. **`get_system_health`** - D6 API connection health check
3. **`get_schools`** - Client integrations (test: school 1694)
4. **`get_learners`** - Student data (use schoolId: 1694)
5. **`get_staff`** - Staff/teacher data (use schoolId: 1694)
6. **`get_parents`** - Parent/guardian data (use schoolId: 1694)
7. **`get_learner_marks`** - Academic marks (when activated by D6)
8. **`get_lookup_data`** - Reference data (genders, grades, subjects)

## 🔍 Local Development

### Run Vercel Development Server
```bash
# Install dependencies
npm install

# Start Vercel dev server
npm run dev:vercel
# OR
vercel dev
```

This runs the exact same environment as production locally at `http://localhost:3000`.

### Test MCP Tools Locally
```bash
# Test the MCP server locally
npx @modelcontextprotocol/inspector@latest http://localhost:3000/api/mcp
```

## 📊 Monitoring & Logs

### Vercel Dashboard
- **Functions**: Monitor function execution and performance
- **Analytics**: Track usage and response times  
- **Logs**: Real-time function logs and errors

### Function Logs
```bash
# View real-time logs
vercel logs https://your-project-name.vercel.app
```

## ⚡ Performance Optimization

The deployment uses **Vercel Fluid Compute** for optimal MCP server performance:

- **Dynamic Scaling**: Automatically scales based on demand
- **Minimal Idle Time**: Only pay for actual compute usage
- **Shared Instances**: Efficient handling of AI workloads
- **30s Max Duration**: Configured for complex D6 API operations

## 🔒 Security Features

- **CORS**: Configured for secure cross-origin requests
- **Rate Limiting**: Built-in request throttling
- **Environment Variables**: Secure credential management
- **HTTPS**: All traffic encrypted by default

## 🛠️ Troubleshooting

### Common Issues:

**1. Environment Variables Not Set**
```bash
# Check current environment variables
vercel env ls

# Pull environment variables to local
vercel env pull .env.local
```

**2. Build Failures**
```bash
# Check build logs
vercel logs --follow

# Run build locally
npm run build
```

**3. Function Timeouts**
- Functions have 30s timeout (configurable in `vercel.json`)
- For longer operations, consider breaking into smaller requests

**4. Import Errors**
- Ensure all paths use correct relative imports
- TypeScript paths are resolved at build time

### Debug Commands:
```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Test D6 connection
npm run test:d6

# Local MCP test
npm run mcp:production
```

## 📚 Resources

- [Vercel MCP Documentation](https://vercel.com/docs/mcp)
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP Inspector Tool](https://github.com/modelcontextprotocol/inspector)
- [Cursor MCP Integration](https://docs.cursor.com/mcp)

## 🔄 Continuous Deployment

The project is configured for automatic deployment on git push:

1. **Push to GitHub**: Vercel automatically deploys
2. **Preview Deployments**: Every pull request gets a preview URL
3. **Production Deployments**: Merges to main branch deploy to production

## 📞 Support

For deployment issues:
1. Check Vercel function logs
2. Test locally with `npm run dev:vercel`
3. Verify D6 API credentials
4. Contact Espen.ai team for D6-specific issues

---

**🎉 Your Espen D6 MCP Server is now ready for AI-powered school data integration!** 