# 🚀 Deploy Espen D6 MCP Server to Vercel

## Why Vercel is Perfect for This

✅ **Official MCP Support with @vercel/mcp-adapter**  
✅ **Free tier with generous limits**  
✅ **Automatic HTTPS**  
✅ **GitHub integration**  
✅ **Environment variables**  
✅ **Zero configuration needed**  
✅ **Perfect for Claude.ai remote integrations**

---

## 📋 Step 1: Prepare Your Code

Your code is already prepared! The following files are configured for Vercel with official MCP support:
- ✅ `vercel.json` - Vercel configuration optimized for MCP
- ✅ `api/index.ts` - Official @vercel/mcp-adapter implementation 
- ✅ `package.json` - Dependencies including @vercel/mcp-adapter

## 📋 Step 2: Push to GitHub (if not already done)

```bash
# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Deploy Espen D6 MCP Server with official Vercel MCP adapter"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/espen-d6-mcp-server.git
git push -u origin main
```

## 📋 Step 3: Deploy to Vercel

### Option A: Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   When prompted:
   - **Set up and deploy?** → `Y`
   - **Which scope?** → Choose your account
   - **Link to existing project?** → `N`
   - **Project name?** → `espen-d6-mcp-server` (or keep default)
   - **Directory?** → `.` (current directory)
   - **Override settings?** → `N`

4. **Set Production Environment Variables:**
   ```bash
   vercel env add D6_PRODUCTION_MODE
   # Enter: true

   vercel env add D6_API_BASE_URL
   # Enter: https://integrate.d6plus.co.za/api/v2

   vercel env add D6_API_USERNAME
   # Enter: espenaitestapi

   vercel env add D6_API_PASSWORD
   # Enter: qUz3mPcRsfSWxKR9qEnm
   ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Option B: Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign in with GitHub**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure:**
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: (leave empty)
6. **Add Environment Variables:**
   ```
   D6_PRODUCTION_MODE = true
   D6_API_BASE_URL = https://integrate.d6plus.co.za/api/v2
   D6_API_USERNAME = espenaitestapi
   D6_API_PASSWORD = qUz3mPcRsfSWxKR9qEnm
   ```
7. **Click "Deploy"**

---

## 📋 Step 4: Get Your Server URL

After deployment, you'll get a URL like:
```
https://espen-d6-mcp-server.vercel.app
```

## 📋 Step 5: Test Your MCP Server

### Using MCP Inspector

Test your deployed MCP server with the official MCP inspector:

```bash
npx @modelcontextprotocol/inspector@latest https://your-app.vercel.app/api/mcp
```

This will open the inspector at `http://127.0.0.1:6274` where you can:
- Connect to your MCP server
- Test all 8 tools
- Verify the MCP protocol implementation

### Manual Testing

You can also test individual endpoints:

1. **Server Health:**
   ```
   https://your-app.vercel.app/api/mcp
   ```

2. **Test Tools in Inspector:**
   - `get_schools` - Get school/client integration info
   - `get_learners` - Get student data (requires schoolId)
   - `get_staff` - Get staff information (requires schoolId)
   - `get_parents` - Get parent data (requires schoolId)
   - `get_learner_marks` - Get academic records (requires learnerId)
   - `get_lookup_data` - Get reference data (genders, grades, subjects)
   - `get_system_health` - Check D6 API connectivity
   - `get_integration_info` - Get integration configuration

## 📋 Step 6: Add to Claude.ai

1. **Go to [claude.ai/settings/integrations](https://claude.ai/settings/integrations)**
2. **Click "Add custom integration"**
3. **Enter your Vercel MCP URL:**
   ```
   https://your-app.vercel.app/api/mcp
   ```
4. **Click "Add"**
5. **Enable the tools you want to use**

---

## ✅ Success Indicators

You should see:

1. ✅ **Vercel deployment succeeds**
2. ✅ **MCP Inspector connects successfully**
3. ✅ **All 8 tools are available and functional**
4. ✅ **Environment variables loaded correctly**
5. ✅ **D6 API connection works (or mock data fallback)**
6. ✅ **Claude.ai can connect to your server**

## 🔧 Troubleshooting

### Build Failures
- Check Vercel deployment logs
- Verify @vercel/mcp-adapter is installed
- Ensure TypeScript files compile correctly

### MCP Connection Issues
- Test with MCP inspector first
- Verify the `/api/mcp` endpoint responds
- Check CORS headers in Vercel functions

### Environment Variables
- Double-check all D6 credentials in Vercel dashboard
- Verify variable names match exactly
- Redeploy after adding variables

### Tool Execution Errors
- Check Vercel function logs
- Verify D6 API connectivity
- Test with mock data mode if D6 API is unavailable

### Claude.ai Integration Issues
- Ensure you're using the `/api/mcp` endpoint
- Test MCP inspector connection first
- Verify all tools are properly registered

---

## 🎯 What You Get

**Official Vercel MCP Implementation:**
- ✅ **Uses @vercel/mcp-adapter for full MCP protocol compliance**
- ✅ **Proper tool registration and schema validation**
- ✅ **Optimized for Vercel's serverless architecture**
- ✅ **Compatible with MCP inspector and Claude.ai**

**Your MCP Tools:**
1. `get_schools` - School/client integration information
2. `get_learners` - Student data (requires schoolId)
3. `get_staff` - Staff directory (requires schoolId)
4. `get_parents` - Parent information (requires schoolId)
5. `get_learner_marks` - Academic records (requires learnerId)
6. `get_lookup_data` - System reference data
7. `get_system_health` - API connectivity status
8. `get_integration_info` - Integration configuration details

**Immediate Benefits:**
- ✅ **No more local configuration issues**
- ✅ **Works directly with Claude.ai**
- ✅ **Automatic HTTPS and scaling**
- ✅ **Real D6 data + comprehensive fallbacks**
- ✅ **Professional deployment with official MCP support**

---

## 📧 Support

**Vercel Issues:**
- Check [Vercel MCP docs](https://vercel.com/docs/mcp)
- Use Vercel dashboard logs
- Contact Vercel support

**MCP Issues:**
- Test with [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- Check [MCP documentation](https://spec.modelcontextprotocol.io/)

**D6 Integration Issues:**
- Email: support@d6plus.co.za
- Include: Integration ID 1694, Vercel URL

---

## 🚀 You're Done!

Your Espen D6 MCP Server will be:
- ✅ **Running on Vercel with official MCP support**
- ✅ **Connected to real D6 data**
- ✅ **Working with Claude.ai and MCP inspector**
- ✅ **Providing 8 powerful school management tools**
- ✅ **Using the latest MCP protocol standards**

**No more local configuration headaches - just professional MCP integration!** 