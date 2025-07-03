# Claude Desktop Setup Instructions

## 🚨 CRITICAL: Current Issue Resolution

**Problem**: Your Claude Desktop is trying to use `mcp-server-clean.ts` with incorrect working directory.

**Solution**: Update your Claude Desktop configuration with the EXACT configuration below.

## 📋 Step-by-Step Setup

### 1. Open Claude Desktop Settings

**On macOS:**
- Open Claude Desktop
- Press `Cmd + ,` (Command + Comma) 
- OR go to Claude Desktop → Preferences → Developer

### 2. Replace Your MCP Configuration

**IMPORTANT**: Replace your entire MCP servers configuration with this EXACT configuration:

```json
{
  "mcpServers": {
    "espen-d6": {
      "command": "npx",
      "args": ["tsx", "src/mcp-server.ts"],
      "cwd": "/Users/nieuwoudtgresse/Desktop/Espen MCP <> D6 /espen-d6-mcp-server",
      "env": {
        "D6_PRODUCTION_MODE": "true",
        "D6_API_BASE_URL": "https://integrate.d6plus.co.za/api/v2",
        "D6_API_USERNAME": "espenaitestapi",
        "D6_API_PASSWORD": "qUz3mPcRsfSWxKR9qEnm"
      }
    }
  }
}
```

### 3. Key Configuration Points

**✅ Correct File**: `src/mcp-server.ts` (NOT `mcp-server-clean.ts`)
**✅ Correct Working Directory**: `/Users/nieuwoudtgresse/Desktop/Espen MCP <> D6 /espen-d6-mcp-server`
**✅ Correct Environment**: Production mode with real D6 credentials

### 4. Restart Claude Desktop

- Close Claude Desktop completely
- Reopen Claude Desktop
- The server should connect successfully

## 🔍 Verification

After restarting Claude Desktop, test with these commands:

```
Show me system health status
```

```
Get school information
```

```
List some learners
```

## 🚨 Troubleshooting

### If Still Getting Errors:

**1. Verify File Path**
Run this command in Terminal to confirm the file exists:
```bash
ls -la "/Users/nieuwoudtgresse/Desktop/Espen MCP <> D6 /espen-d6-mcp-server/src/mcp-server.ts"
```

**2. Test MCP Server Manually**
```bash
cd "/Users/nieuwoudtgresse/Desktop/Espen MCP <> D6 /espen-d6-mcp-server"
D6_PRODUCTION_MODE=true npx tsx src/mcp-server.ts
```

**3. Check Claude Desktop Logs**
- Open Claude Desktop Developer Tools
- Look for any error messages
- Verify the correct file path is being used

### If Path Issues:

If you have spaces in your path, ensure the configuration uses the EXACT path:
```
/Users/nieuwoudtgresse/Desktop/Espen MCP <> D6 /espen-d6-mcp-server
```

## ✅ Expected Behavior

Once correctly configured, you should see:
- ✅ Server connects without errors
- ✅ 8 MCP tools available (get_schools, get_learners, etc.)
- ✅ Real D6 school information
- ✅ Comprehensive demo data for learners/staff/parents
- ✅ System health monitoring

## 📧 Still Having Issues?

1. Copy the EXACT error message from Claude Desktop logs
2. Verify the configuration matches exactly (including spaces and quotes)
3. Ensure you restarted Claude Desktop after making changes

The server is working perfectly - this is just a configuration path issue! 