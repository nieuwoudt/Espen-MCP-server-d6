# 🚀 Deploy Espen D6 MCP Server to Railway

## Why Railway?
- ✅ **Free tier available**
- ✅ **5-minute setup**
- ✅ **Automatic HTTPS**
- ✅ **Environment variables**
- ✅ **Logs and monitoring**

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (free)
3. Verify your account

## Step 2: Deploy Your MCP Server

### Option A: From GitHub (Recommended)
1. Push your code to GitHub repository
2. In Railway, click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `espen-d6-mcp-server` repository
5. Railway will auto-detect Node.js and deploy

### Option B: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Step 3: Configure Environment Variables

In Railway project settings, add these environment variables:

```
NODE_ENV=production
D6_PRODUCTION_MODE=true
D6_API_BASE_URL=https://integrate.d6plus.co.za/api/v2
D6_API_USERNAME=espenaitestapi
D6_API_PASSWORD=qUz3mPcRsfSWxKR9qEnm
PORT=3000
```

## Step 4: Update package.json for Railway

Railway will automatically run `npm start`. Make sure your package.json has:

```json
{
  "scripts": {
    "start": "tsx src/mcp-server.ts"
  }
}
```

## Step 5: Get Your Server URL

After deployment, Railway will give you a URL like:
```
https://espen-d6-mcp-server-production.up.railway.app
```

## Step 6: Test Your Remote Server

Visit your URL to confirm it's working:
```
https://your-railway-url.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "espen-d6-mcp-server",
  "version": "1.0.0"
}
```

## Step 7: Add to Claude.ai

1. Go to [claude.ai/settings/integrations](https://claude.ai/settings/integrations)
2. Click "Add custom integration"
3. Enter your Railway URL: `https://your-railway-url.railway.app`
4. Click "Add"
5. Enable the tools you want to use

## Alternative: Render.com

If Railway doesn't work, try [render.com](https://render.com):

1. Connect GitHub repository
2. Choose "Web Service"
3. Set build command: `npm install`
4. Set start command: `tsx src/mcp-server.ts`
5. Add environment variables
6. Deploy

## Alternative: Vercel

For Vercel deployment:

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts
4. Add environment variables in Vercel dashboard

## 🔧 Troubleshooting

**Port Issues:**
- Make sure your server listens on `process.env.PORT`
- Railway automatically assigns the PORT environment variable

**Environment Variables:**
- Double-check all D6 credentials are set correctly
- Use Railway dashboard to verify variables

**Build Failures:**
- Check Railway build logs
- Ensure all dependencies are in package.json

**Connection Issues:**
- Verify HTTPS (required for Claude.ai)
- Test health endpoint first
- Check Railway service logs

## ✅ Success Indicators

1. ✅ Railway deployment succeeds
2. ✅ Health endpoint returns 200 OK
3. ✅ Environment variables loaded correctly
4. ✅ D6 API connection works
5. ✅ Claude.ai can connect to your server

## 📧 Support

If you encounter issues:
1. Check Railway deployment logs
2. Test the health endpoint
3. Verify environment variables
4. Check D6 API connectivity

**Railway is free for basic usage and perfect for MCP servers!** 