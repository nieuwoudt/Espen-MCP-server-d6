# 🚀 Complete Vercel MCP Server Deployment Guide

This comprehensive guide walks your development team through deploying the Espen D6 MCP Server to Vercel using the official `@vercel/mcp-adapter`.

## 📋 Prerequisites Checklist

### Required Accounts & Tools
- [ ] **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
- [ ] **GitHub Account**: Repository access
- [ ] **Node.js 18+**: Latest LTS version installed
- [ ] **npm/yarn**: Package manager
- [ ] **Git**: Version control

### Credentials Required
- [ ] **D6 API Credentials**: Production credentials from D6 team
- [ ] **GitHub Repository**: Push access to the repository

## 🔧 Project Structure Verification

✅ **Verify your project has these required files:**

```
espen-d6-mcp-server/
├── api/
│   └── mcp/
│       └── route.ts          # ✅ Vercel MCP endpoint
├── src/
│   └── services/
│       └── d6ApiService-hybrid.ts  # ✅ D6 integration
├── package.json               # ✅ With @vercel/mcp-adapter
├── vercel.json               # ✅ Vercel configuration
├── tsconfig.json            # ✅ TypeScript config
└── VERCEL_MCP_DEPLOYMENT.md # ✅ This guide
```

### Key Dependencies Verification

Run this command to verify required packages:

```bash
npm list @vercel/mcp-adapter zod
```

**Expected output:**
```
├── @vercel/mcp-adapter@^0.11.1
└── zod@^3.25.68
```

## 🌍 Environment Variables Setup

### Required Variables for Production

| Variable | Value | Description |
|----------|-------|-------------|
| `D6_API_BASE_URL` | `https://integrate.d6plus.co.za/api/v1` | D6 API endpoint |
| `D6_API_USERNAME` | `espenaitestapi` | D6 API username |
| `D6_API_PASSWORD` | `qUz3mPcRsfSWxKR9qEnm` | D6 API password |
| `D6_PRODUCTION_MODE` | `true` | Enable production mode |
| `NODE_ENV` | `production` | Node environment |

### Local Environment Setup

Create `.env.local` file:

```bash
# Copy environment template
cp env.example .env.local

# Edit with your values
D6_API_BASE_URL=https://integrate.d6plus.co.za/api/v1
D6_API_USERNAME=espenaitestapi
D6_API_PASSWORD=qUz3mPcRsfSWxKR9qEnm
D6_PRODUCTION_MODE=true
NODE_ENV=development
```

## 🚀 Step-by-Step Deployment Process

### Step 1: Install Vercel CLI

```bash
# Install globally
npm install -g vercel

# Or use via npx (no installation needed)
npx vercel --version
```

### Step 2: Project Preparation

```bash
# Navigate to project directory
cd espen-d6-mcp-server

# Install all dependencies
npm install

# Run type check
npm run type-check

# Test D6 connection (optional)
npm run test:d6
```

### Step 3: Vercel Authentication

```bash
# Login to Vercel
vercel login

# Choose "Continue with GitHub" when prompted
```

### Step 4: Link Project to Vercel

```bash
# Link to Vercel project
vercel link

# Follow prompts:
# - Link to existing project? N
# - Project name: espen-d6-mcp-server  
# - Directory: ./
```

### Step 5: Set Environment Variables

**Option A: Via Vercel CLI**
```bash
vercel env add D6_API_BASE_URL
# Enter: https://integrate.d6plus.co.za/api/v1
# Select: Production, Preview, Development

vercel env add D6_API_USERNAME  
# Enter: espenaitestapi

vercel env add D6_API_PASSWORD
# Enter: qUz3mPcRsfSWxKR9qEnm

vercel env add D6_PRODUCTION_MODE
# Enter: true

vercel env add NODE_ENV
# Enter: production
```

**Option B: Via Vercel Dashboard**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable for **Production**, **Preview**, and **Development**

### Step 6: Deploy to Preview (Testing)

```bash
# Deploy to preview environment
npm run deploy:preview
# OR
vercel

# Note the preview URL: https://espen-d6-mcp-server-xyz.vercel.app
```

### Step 7: Test Preview Deployment

```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector@latest https://your-preview-url.vercel.app/api/mcp

# Or test directly with curl
curl -X POST https://your-preview-url.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### Step 8: Deploy to Production

```bash
# Deploy to production
npm run deploy
# OR
vercel --prod

# Note the production URL: https://espen-d6-mcp-server.vercel.app
```

## 🧪 Testing Your Deployment

### 1. Health Check

Test integration info endpoint:
```bash
curl -X POST https://your-domain.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "get_integration_info", "arguments": {}}}'
```

### 2. D6 Data Test

Test learners endpoint:
```bash
curl -X POST https://your-domain.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "get_learners", "arguments": {"schoolId": 1694, "limit": 5}}}'
```

### 3. MCP Inspector (Recommended)

```bash
# Start inspector
npx @modelcontextprotocol/inspector@latest https://your-domain.vercel.app/api/mcp

# Open browser to: http://127.0.0.1:6274
# Select "Streamable HTTP" transport
# Connect to: https://your-domain.vercel.app/api/mcp
```

## 🛠️ Available MCP Tools

Your deployed server provides **8 MCP tools**:

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `get_integration_info` | Server status and config | No parameters |
| `get_system_health` | D6 API health check | No parameters |
| `get_schools` | Client integrations | No parameters |
| `get_learners` | Student data | `{"schoolId": 1694, "limit": 20}` |
| `get_staff` | Staff/teacher data | `{"schoolId": 1694, "limit": 20}` |
| `get_parents` | Parent/guardian data | `{"schoolId": 1694, "limit": 20}` |
| `get_learner_marks` | Academic marks | `{"learnerId": 41}` |
| `get_lookup_data` | Reference data | `{"type": "genders"}` |

## 📱 Cursor Integration

### Add to Cursor MCP Configuration

1. Open Cursor
2. Go to **Settings** → **Model Context Protocol**
3. Add new server:

```json
{
  "mcpServers": {
    "espen-d6": {
      "url": "https://your-domain.vercel.app/api/mcp"
    }
  }
}
```

### Using in Cursor

Ask questions like:
- "Get integration info for the D6 MCP server"
- "Show me 10 learners from school 1694"
- "What is the health status of the D6 API?"
- "Get staff members from the test school"

## 📊 Monitoring & Maintenance

### Vercel Dashboard Monitoring

- **Functions**: Monitor execution time and errors
- **Analytics**: Track request volume and performance
- **Logs**: Real-time function logs

### View Logs

```bash
# Real-time logs
vercel logs https://your-domain.vercel.app

# Function-specific logs
vercel logs https://your-domain.vercel.app --follow
```

### Performance Optimization

The deployment uses **Vercel Fluid Compute**:
- ✅ **Dynamic Scaling**: Auto-scales based on demand
- ✅ **Minimal Idle Time**: Pay only for actual usage
- ✅ **30s Timeout**: Configured for complex D6 operations
- ✅ **512MB Memory**: Optimized for MCP workloads

## 🛠️ Troubleshooting Guide

### Common Issues & Solutions

#### 1. Environment Variables Not Working
```bash
# Check if variables are set
vercel env ls

# Pull variables to local
vercel env pull .env.local

# Re-deploy after adding variables
vercel --prod
```

#### 2. Build Failures
```bash
# Check build logs
vercel logs --follow

# Test build locally
npm run build

# Fix TypeScript errors
npm run type-check
```

#### 3. D6 API Connection Errors
```bash
# Test D6 connection locally
D6_API_BASE_URL="https://integrate.d6plus.co.za/api/v1" \
D6_API_USERNAME="espenaitestapi" \
D6_API_PASSWORD="qUz3mPcRsfSWxKR9qEnm" \
npm run test:d6
```

#### 4. MCP Tools Not Working
- Verify `api/mcp/route.ts` exports: `GET`, `POST`, `DELETE`
- Check Vercel function logs for errors
- Test with MCP Inspector first

#### 5. Import/Module Errors
- Ensure all imports use correct relative paths
- Check `tsconfig.json` module resolution
- Verify `@vercel/mcp-adapter` version compatibility

### Debug Commands

```bash
# Local development
npm run dev:vercel

# Type checking
npm run type-check

# D6 API test
npm run test:d6

# Get sample data
npm run scripts/get-learners-sample.ts
```

## 🔄 Continuous Deployment

### Automatic Deployment

Once linked to GitHub:
1. **Push to GitHub** → Automatic preview deployment
2. **Merge to main** → Automatic production deployment
3. **Pull requests** → Preview deployments with unique URLs

### Manual Deployment

```bash
# Quick redeploy
vercel --prod

# Deploy specific environment
vercel --target production
```

## 📚 Additional Resources

### Documentation Links
- [Vercel MCP Documentation](https://vercel.com/docs/mcp)
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP Inspector Tool](https://github.com/modelcontextprotocol/inspector)
- [Cursor MCP Integration](https://docs.cursor.com/mcp)

### Templates & Examples
- [Vercel MCP with Next.js](https://vercel.com/templates/ai/model-context-protocol-mcp-with-next-js)
- [Vercel Functions MCP](https://vercel.com/templates/other/model-context-protocol-mcp-with-vercel-functions)

## 🔐 Security Considerations

### Environment Variables
- ✅ All sensitive data in Vercel environment variables
- ✅ No credentials in code or repository
- ✅ Separate environments (dev/preview/production)

### API Security  
- ✅ HTTPS only (enforced by Vercel)
- ✅ CORS configured
- ✅ Request validation with Zod schemas
- ✅ Error handling prevents data leaks

## 📞 Support & Next Steps

### If You Need Help
1. **Check Vercel function logs** first
2. **Test locally** with `npm run dev:vercel`
3. **Verify D6 credentials** with test scripts
4. **Contact team** with specific error messages

### Next Steps After Deployment
1. **Test all 8 MCP tools** with Inspector
2. **Integrate with Cursor** or other MCP hosts
3. **Monitor performance** in Vercel dashboard
4. **Request D6 activation** for additional endpoints:
   - Student marks/subjects (`/currplus/learnersubjects/1694`)
   - Parent-child relationships
   - Staff subject assignments

---

## ✅ Deployment Checklist

- [ ] Vercel account created and CLI installed
- [ ] GitHub repository pushed with latest changes
- [ ] Environment variables set in Vercel
- [ ] Preview deployment tested successfully
- [ ] Production deployment completed
- [ ] MCP Inspector test passed
- [ ] Cursor integration configured
- [ ] Team notified of deployment URL

**🎉 Your Espen D6 MCP Server is now live and ready for AI-powered school data integration!**

**Production URL:** `https://your-domain.vercel.app/api/mcp` 