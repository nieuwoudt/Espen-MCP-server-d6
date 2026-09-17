# D6 Client Integration Setup

## Overview

This document explains the D6 client integration enablement feature, which is required to activate certain D6 API features like assessment marks access.

## Authentication (required)

`enable_d6_client` switches a real school's D6 data access on or off, so it requires an admin secret. On 2026-09-15 we confirmed it could be called by anyone with the server URL; it has required the secret since.

- Send the header `Authorization: Bearer <D6_ADMIN_SECRET>` with every call. The secret is accepted **only** from that header, never from the URL or the JSON body.
- The secret lives in the `D6_ADMIN_SECRET` environment variable on the `espen-mcp-server-d6` Vercel project (espen-os holds the same value in its own `D6_ADMIN_SECRET`). Read it from there; never paste its value into docs, chat, tickets, logs or commits.
- Without a valid secret the call gets **HTTP 401** and the JSON-RPC error `{"code": -32001, "message": "unauthorized: ..."}`. Nothing is sent to D6.
- If `D6_ADMIN_SECRET` is unset or empty on the server, the tool is refused for everyone (fail closed).
- `tools/list` only includes `enable_d6_client` (and `bulk_enable_d6_schools`) for a request that carries the secret, so an MCP client such as Claude will not see the tool unless it is configured to send the header.
- Every other tool works as before without the header.

## Implementation Details

### Correct API Specification (Per Patrick from D6)

**Endpoint:**
```
PATCH https://integrate.d6plus.co.za/api/v1/settings/clients/{school_id}
```

**Headers:**
- `HTTP-X-USERNAME`: Your D6 API username
- `HTTP-X-PASSWORD`: Your D6 API password
- `Content-Type`: application/json

**Request Body:**
```json
{
  "api_type_id": 8,
  "state": 1
}
```

**Important:**
- ✅ Use **v1** (not v2)
- ✅ Use **PATCH** (not POST)
- ✅ School ID goes in **URL path** (not body)
- ✅ Body contains **only** `api_type_id` and `state`

### API Type IDs

- `8` = D6 Integrate API (most common)
- Other IDs may be available - check with D6 support

### State Values

- `1` = Enabled (activate the integration)
- `0` = Disabled (deactivate the integration)

## Usage

The examples call the server over HTTP. `D6_MCP_URL` is the server's base URL and `D6_ADMIN_SECRET` is read from the Vercel project's environment variable of that name; neither value belongs in this document. An MCP client must send the same `Authorization` header.

### Step 1: Enable Client Integration

First, enable the D6 client integration for a school (this changes the school's real D6 access):

```bash
curl -s "$D6_MCP_URL/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $D6_ADMIN_SECRET" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "enable_d6_client",
      "arguments": { "school_login_id": 1352, "api_type_id": 8, "state": 1 }
    }
  }'
```

**Expected Response:**
```
✅ D6 Client Integration Enabled

School: Laerskool Monumentpark
API Type ID: 8
State: 1

Response:
{
  ... D6 response data ...
}
```

**Expected Log:**
```
[D6 TRACE] PATCH /v1/settings/clients/1352 -> 200 (settings/clients/1352 [api_type_id=8, state=1])
```

### Step 2: Test Marks Access

After enabling, test if marks access now works:

```json
{
  "tool": "get_learner_marks",
  "args": {
    "school_login_id": 1352,
    "learnerId": 3043
  }
}
```

**Expected Log:**
```
[D6 TRACE] GET /v1/currplus/learnersubjectmarks/1352?learner_id=3043 -> 200 (learner_subject_marks/1352?learner_id=3043)
```

## Implementation Files

### Core Implementation (`src/mcpHandler.ts`)

**Helper Function:**
```typescript
async function enableD6ClientIntegration(
  env: EnvLike,
  schoolId: number,
  apiTypeId: number,
  state: 0 | 1 = 1
): Promise<any>
```

**MCP Tool:**
- Name: `enable_d6_client`
- Parameters: `school_login_id`, `api_type_id`, `state`
- Handler: Calls `enableD6ClientIntegration()` with validation

### Key Features

1. **Admin Authentication**: Requires `Authorization: Bearer <D6_ADMIN_SECRET>` before anything else runs (see Authentication above)
2. **School Whitelist Validation**: Checks that school is in `D6_ALLOWED_SCHOOL_LOGIN_IDS`
3. **Mock Mode Protection**: Prevents use in mock/sandbox mode (production only)
4. **Clear Logging**: `[D6 TRACE]` shows exact request and response status
5. **Error Handling**: Surfaces D6 errors clearly for debugging

### Deprecated Code

The old incorrect implementation in `src/services/d6ApiService-v2.ts` has been deprecated:

```typescript
// ❌ OLD INCORRECT WAY (do not use):
async updateClientIntegrationState() {
  // Used POST instead of PATCH
  // Used v2 instead of v1
  // Included school_id in body (wrong)
}
```

## Testing

### Manual Test Script

```bash
npx tsx scripts/test-enable-client.ts
```

This will:
1. Send PATCH request to `/v1/settings/clients/1352`
2. Show the response status and data
3. Confirm if integration was enabled

### From Vercel

Once deployed, call the tool as shown in Usage above, with the `Authorization` header. This is not a dry run: it switches the school's D6 access on or off.

## Troubleshooting

### Error: "unauthorized" (HTTP 401, JSON-RPC code -32001)

**Cause:** The request had no `Authorization: Bearer ...` header, the secret did not match, or `D6_ADMIN_SECRET` is not set on the Vercel project (the response is deliberately the same in all three cases)

**Solution:** Send the header with the value from the `D6_ADMIN_SECRET` environment variable on the Vercel project, and confirm the variable is set there

### Error: "School not allowed"

**Cause:** School ID not in `D6_ALLOWED_SCHOOL_LOGIN_IDS`

**Solution:** Add the school ID to the environment variable in Vercel

### Error: "Client has not authorised access"

**Cause:** The school hasn't authorized your D6 API integrator account

**Solution:** Contact D6 support to authorize the school for your integrator

### Error: "route_not_found"

**Cause:** Wrong endpoint path or version

**Solution:** Verify you're using:
- `/v1/settings/clients/{school_id}` (correct)
- Not `/v2/settings/clientintegrations` (incorrect)

### Success but marks still don't work

**Possible causes:**
1. Integration needs time to propagate (wait 1-2 minutes)
2. Marks not yet available in D6 for this school
3. Different api_type_id needed

**Solution:** Contact D6 support to verify marks are available

## Workflow

```
1. Onboard School
   ↓
2. Add to D6_ALLOWED_SCHOOL_LOGIN_IDS
   ↓
3. Call enable_d6_client tool (with the Authorization header)
   ↓
4. Wait 1-2 minutes
   ↓
5. Test get_learner_marks
   ↓
6. Verify marks data returns (not 404)
```

## Notes

- **One-time operation**: Only needs to be run when onboarding a school or changing integration settings
- **Not automatic**: Does not run on every marks request (by design)
- **Admin operation**: Should be called manually or via admin interface, always with `Authorization: Bearer <D6_ADMIN_SECRET>`
- **Production only**: Will not work in mock/sandbox mode

## Example: Laerskool Monumentpark (1352)

```bash
# Step 1: Enable client integration (admin tool: needs the Authorization header)
curl -s "$D6_MCP_URL/sse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $D6_ADMIN_SECRET" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"enable_d6_client","arguments":{"school_login_id":1352,"api_type_id":8,"state":1}}}'

# Expected: PATCH /v1/settings/clients/1352 -> 200
# Without a valid secret: HTTP 401, {"error":{"code":-32001,"message":"unauthorized: ..."}}

# Step 2: Test marks access (read tool: no Authorization header needed)
curl -s "$D6_MCP_URL/sse" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_learner_marks","arguments":{"school_login_id":1352,"learnerId":3043}}}'

# Expected: GET /v1/currplus/learnersubjectmarks/1352?learner_id=3043 -> 200
```

## Related Documentation

- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Vercel deployment instructions
- [D6_INTEGRATION.md](./D6_INTEGRATION.md) - D6 API integration overview
- Patrick's email (2024) - Original specification for this endpoint

## Support

For questions about:
- **Endpoint structure**: Refer to Patrick's specification (this document)
- **School authorization**: Contact D6 support
- **Implementation issues**: Check Vercel logs for `[D6 TRACE]` output

