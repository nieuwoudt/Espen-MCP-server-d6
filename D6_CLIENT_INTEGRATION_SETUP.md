# D6 Client Integration Setup

## Overview

This document explains the D6 client integration enablement feature, which is required to activate certain D6 API features like assessment marks access.

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

## Usage from Claude

### Step 1: Enable Client Integration

First, enable the D6 client integration for a school:

```json
{
  "tool": "enable_d6_client",
  "args": {
    "school_login_id": 1352,
    "api_type_id": 8,
    "state": 1
  }
}
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

1. **School Whitelist Validation**: Checks that school is in `D6_ALLOWED_SCHOOL_LOGIN_IDS`
2. **Mock Mode Protection**: Prevents use in mock/sandbox mode (production only)
3. **Clear Logging**: `[D6 TRACE]` shows exact request and response status
4. **Error Handling**: Surfaces D6 errors clearly for debugging

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

Once deployed, you can test via Claude using the MCP tool as shown above.

## Troubleshooting

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
3. Call enable_d6_client tool
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
- **Admin operation**: Should be called manually or via admin interface
- **Production only**: Will not work in mock/sandbox mode

## Example: Laerskool Monumentpark (1352)

```bash
# Step 1: Enable client integration
enable_d6_client({
  school_login_id: 1352,
  api_type_id: 8,
  state: 1
})

# Expected: PATCH /v1/settings/clients/1352 -> 200

# Step 2: Test marks access
get_learner_marks({
  school_login_id: 1352,
  learnerId: 3043
})

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

