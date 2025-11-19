# Vercel Deployment Guide - Espen D6 MCP Server

## Why Vercel?

We migrated from Cloudflare Workers to Vercel to solve the **"Cloudflare → Cloudflare"** WAF blocking issue:

- **Problem**: The Cloudflare Worker successfully retrieves learners data from D6, but gets `403 Forbidden` errors on sensitive endpoints (staff, parents, assessments/marks)
- **Root Cause**: D6's API is fronted by Cloudflare, and their WAF/firewall blocks traffic from Cloudflare Worker IPs on protected routes
- **Solution**: Deploy to Vercel with different egress IPs to avoid Cloudflare-to-Cloudflare detection

## Architecture

### Single Shared Handler

Both Cloudflare and Vercel deployments use the **same MCP handler logic** (`src/mcpHandler.ts`):

```
src/mcpHandler.ts                 ← Shared handler with all MCP logic
    ↓
    ├── Cloudflare Worker         → src/cloudflare-worker-minimal.ts
    └── Vercel Edge Function      → api/mcp.ts
```

This ensures:
- Single source of truth for MCP implementation
- Consistent behavior across platforms
- Easier maintenance and debugging

### Multi-School Support

The server supports **13 authorized schools** through a single integrator account:

- No per-school environment variables
- School whitelist via `D6_ALLOWED_SCHOOL_LOGIN_IDS`
- Name mapping via `D6_SCHOOL_MAP` for better logging
- Security: `assertSchoolAllowed()` validates every request

### Production-Only on Vercel

Vercel deployment is **strictly production** (no mock data):

- Mock mode is disabled via `D6_MOCK_MODE=false`
- Production guards prevent mock mode even if misconfigured
- All data comes directly from D6 API

## Deployment Steps

### 1. Prerequisites

- Vercel account connected to the GitHub repository
- D6 API credentials (`espenaiapi` account)
- List of authorized school login IDs

### 2. Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import the `espen-d6-mcp-server` repository
4. Vercel will auto-detect the `api/mcp.ts` function

### 3. Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

#### Required D6 API Configuration

```bash
D6_API_USERNAME=espenaiapi
D6_API_PASSWORD=**************
D6_API_BASE_URL=https://integrate.d6plus.co.za/api
```

#### Production Settings

```bash
NODE_ENV=production
ESPEN_ENV=production
D6_MOCK_MODE=false
```

#### Multi-School Configuration

```bash
D6_ALLOWED_SCHOOL_LOGIN_IDS=1450,1376,2100,1352,1674,3118,3664,2240,2219,1367,1483,1875,2752
```

```bash
D6_SCHOOL_MAP=1450:Laerskool Bergsig,1376:Laerskool Louis Leipoldt,2100:Laerskool Gericke Primary,1352:Laerskool Monumentpark,1674:Hoërskool Klerksdorp,3118:Laerskool Bredasdorp Primary School,3664:Laerskool Oranje-Noord,2240:Xanadu Private School,2219:Rietvlei Akademie Lyttelton,1367:Laerskool Tzaneen Primary,1483:Laerskool Kruinsig,1875:Laerskool Unika,2752:Kleinspoortjies Hennopspark (Pty) Ltd
```

**Important**: Set these for **Production** environment (and Preview if needed for testing).

### 4. Deploy

1. Click **"Deploy"** in Vercel
2. Wait for build to complete
3. Note your deployment URL: `https://<project-name>.vercel.app`

## School Configuration

### Current Authorized Schools (13)

| School Login ID | School Name |
|----------------|-------------|
| 1450 | Laerskool Bergsig |
| 1376 | Laerskool Louis Leipoldt |
| 2100 | Laerskool Gericke Primary |
| 1352 | Laerskool Monumentpark |
| 1674 | Hoërskool Klerksdorp |
| 3118 | Laerskool Bredasdorp Primary School |
| 3664 | Laerskool Oranje-Noord |
| 2240 | Xanadu Private School |
| 2219 | Rietvlei Akademie Lyttelton |
| 1367 | Laerskool Tzaneen Primary |
| 1483 | Laerskool Kruinsig |
| 1875 | Laerskool Unika |
| 2752 | Kleinspoortjies Hennopspark (Pty) Ltd |

### Adding a New School

To add a new authorized school:

1. Get the school's `school_login_id` from D6
2. Update `D6_ALLOWED_SCHOOL_LOGIN_IDS` in Vercel env vars (append the new ID)
3. Update `D6_SCHOOL_MAP` in Vercel env vars (append `id:School Name`)
4. Redeploy (Vercel will auto-redeploy on env var changes)

## Testing

### 1. Health Check

```bash
curl https://<project-name>.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "espen-d6-mcp-remote",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Configure Claude MCP

Update your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "espen-d6-vercel": {
      "url": "https://<project-name>.vercel.app/sse"
    }
  }
}
```

Restart Claude Desktop.

### 3. Test Multi-School Functionality

Try these commands in Claude:

#### Test Learners (Monumentpark - 1352)
```
d6_get_learners { "school_login_id": 1352, "limit": 10 }
```

#### Test by Grade (Monumentpark - 1352)
```
get_learners_by_grade { "schoolId": "1352", "grade": "7" }
```

#### Test Staff (should now work, not 403!)
```
get_staff { "schoolId": "1352" }
```

#### Test Parents (should now work, not 403!)
```
get_parents { "school_login_id": 1352, "limit": 10 }
```

#### Test Marks (should now work, not 403!)
```
get_learner_marks { "school_login_id": 1352, "learnerId": <some_id> }
```

#### Test Another School (e.g., Hoërskool Klerksdorp - 1674)
```
d6_get_learners { "school_login_id": 1674, "limit": 10 }
```

### 4. Verify No Mock Data

Check responses to ensure they contain **real D6 data**:

- Look for actual learner names, not generated mock names
- Check staff positions and email addresses
- Verify parent contact information
- Confirm marks data structure matches D6's format

### 5. Test Security

Try an unauthorized school ID (should fail):
```
d6_get_learners { "school_login_id": 9999, "limit": 10 }
```

Expected: Error message about school not in whitelist.

## Monitoring & Logs

### View Logs in Vercel

1. Go to Vercel Dashboard → Your Project
2. Click **"Functions"** tab
3. Select `api/mcp.ts`
4. View real-time logs

Look for:
- `[D6 TRACE]` entries showing API calls with school names
- `[TOOL]` entries showing tool invocations
- Any error messages or 403 responses (should not appear on Vercel!)

### Common Log Patterns

**Successful request:**
```
[TOOL] get_learners mock=false details={"school_login_id":1352,"school_name":"Laerskool Monumentpark","limit":50}
[D6 TRACE] GET /v1/adminplus/learners/1352?limit=50 -> 200 (get_learners/1352)
```

**School not allowed:**
```
❌ School login id 9999 is not in D6_ALLOWED_SCHOOL_LOGIN_IDS.
```

**Production mock guard:**
```
Mock mode is not allowed in production.
```

## Troubleshooting

### Issue: Still Getting 403 Errors

1. **Check URL**: Ensure Claude is pointing to Vercel URL, not Cloudflare Worker
2. **Check Environment**: Verify `D6_MOCK_MODE=false` in Vercel
3. **Check Logs**: Look for actual D6 API calls in Vercel logs
4. **Test Direct**: Try `curl` from your machine to rule out MCP client issues

### Issue: "School not allowed" Errors

1. Verify school ID is in `D6_ALLOWED_SCHOOL_LOGIN_IDS`
2. Check for typos in the comma-separated list
3. Ensure no extra spaces in the env var
4. Redeploy after changing env vars

### Issue: Mock Data Appearing

This should **never** happen on Vercel, but if it does:

1. Check `D6_MOCK_MODE` is set to `false` (not `"false"` string in some configs)
2. Check `NODE_ENV=production` and `ESPEN_ENV=production`
3. Look for the production guard error in logs
4. Verify deployment is using latest code from `main` branch

### Issue: MCP Connection Fails

1. Check health endpoint: `https://<project-name>.vercel.app/health`
2. Verify SSE endpoint: `https://<project-name>.vercel.app/sse`
3. Check Claude Desktop config JSON is valid
4. Restart Claude Desktop after config changes

## Rollback to Cloudflare

If needed, you can rollback to the Cloudflare Worker:

1. Checkout the `cloudflare-worker-stable` branch
2. Update Claude MCP config to point to Cloudflare Worker URL
3. Note: You'll still have 403 issues on sensitive endpoints

## Key Differences: Cloudflare vs Vercel

| Feature | Cloudflare Worker | Vercel Edge Function |
|---------|------------------|---------------------|
| **Egress IPs** | Cloudflare network | Vercel network |
| **D6 Staff Endpoint** | ❌ 403 Forbidden | ✅ Works |
| **D6 Parents Endpoint** | ❌ 403 Forbidden | ✅ Works |
| **D6 Marks Endpoint** | ❌ 403 Forbidden | ✅ Works |
| **D6 Learners Endpoint** | ✅ Works | ✅ Works |
| **Mock Mode** | Available | Disabled in prod |
| **Multi-School** | Same | Same |
| **MCP Logic** | Shared handler | Shared handler |

## Support

For issues or questions:

1. Check Vercel deployment logs
2. Test with `curl` to isolate MCP client issues
3. Verify all environment variables are set correctly
4. Check the `main` branch is deployed (not a preview branch)

## Next Steps

After successful deployment:

1. ✅ Test all 13 schools to ensure multi-school works
2. ✅ Verify sensitive endpoints return real data (not 403)
3. ✅ Monitor logs for any unexpected errors
4. ✅ Update Claude projects to use Vercel URL
5. ✅ Document any school-specific quirks or issues

