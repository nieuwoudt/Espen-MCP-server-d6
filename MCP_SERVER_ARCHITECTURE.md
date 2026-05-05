# Espen D6 MCP Server — Architecture & Developer Reference

*Last Updated: April 21, 2026*

This document answers the core technical questions about the Espen D6 MCP server: what it is, how it's built, how auth works, what tools exist, and where data comes from. Keep this updated as the architecture evolves.

---

## 1. Codebase & Framework

### Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| Runtime | Vercel Edge Functions (primary), Cloudflare Workers (legacy) |
| Framework | **None** — raw HTTP request/response handler |
| Protocol | MCP (Model Context Protocol) over JSON-RPC 2.0 + SSE |
| D6 Integration | Direct REST calls to `https://integrate.d6plus.co.za/api` |
| Package Manager | npm |

### Key Files

```
espen-d6-mcp-server/
├── api/mcp.ts                        # Vercel Edge entry point (thin wrapper)
├── src/mcpHandler.ts                  # THE server — all tools, handlers, protocol logic
├── src/cloudflare-worker-minimal.ts   # Cloudflare Worker entry point (delegates to mcpHandler)
├── vercel.json                        # Rewrites /sse and /mcp → /api/mcp
├── env.example                        # All environment variables documented
├── package.json                       # Dependencies + scripts
└── tsconfig.vercel.json               # Build config
```

### How It Works

The entire MCP server is implemented in **one file**: `src/mcpHandler.ts` (~2,400+ lines). This is the single source of truth shared by both Vercel and Cloudflare deployments.

`api/mcp.ts` (Vercel entry) does nothing except map `process.env` into an `EnvLike` object and call `handleMcpRequest(request, env)`.

`handleMcpRequest` is a raw HTTP handler that:
- Serves `/health` as a JSON health check
- Handles `/sse` GET requests as SSE streams (connection event + heartbeats every 15s)
- Handles `/sse` POST requests as MCP JSON-RPC calls
- Routes JSON-RPC methods: `initialize`, `tools/list`, `tools/call`, `prompts/list`, `resources/list`
- Handles CORS preflight

There is no Express, Hono, Fastify, or any framework in the production path. (`@fastify/*` and `express` exist in `package.json` from an older app architecture — they are **not used** by the live MCP server.)

### How Tools Are Registered

Tools are defined in a plain array:

```typescript
const MCP_TOOLS = [
  {
    name: "get_learners",
    description: "Get learners from the D6 system...",
    inputSchema: { type: "object", properties: { ... } }
  },
  // ... more tools
];
```

`tools/list` returns this array. `tools/call` dispatches to `handleToolCall()`, which is a `switch(toolName)` block handling each tool. Adding a new tool = add an entry to `MCP_TOOLS` + add a `case` in the switch.

---

## 2. Deployments

| Deployment | URL | Status |
|-----------|-----|--------|
| **Vercel (primary)** | `https://espen-mcp-server-d6.vercel.app/sse` | Production, auto-deploys from `main` |
| **Cloudflare (legacy)** | `https://espen-d6-mcp-remote.niev.workers.dev/sse` | Active, same handler |

`vercel.json` rewrites both `/mcp` and `/sse` to `/api/mcp`.

---

## 3. Authentication & Authorization

### D6 API Auth (server → D6)

The MCP server authenticates to D6 using a **single integrator account**:

| Header | Env Var |
|--------|---------|
| `HTTP-X-USERNAME` | `D6_API_USERNAME` |
| `HTTP-X-PASSWORD` | `D6_API_PASSWORD` |

These are set as Vercel environment variables. Every request to `integrate.d6plus.co.za/api/v1/...` includes both headers.

### School Scoping

- `school_login_id` (integer) determines which school's data to query
- It goes into the D6 URL path: `/v1/adminplus/learners/{school_login_id}`
- Default is `1352` (Laerskool Monumentpark) if not specified
- `D6_ALLOWED_SCHOOL_LOGIN_IDS` is a comma-separated whitelist of allowed school IDs (currently 17 schools)
- `assertSchoolAllowed()` rejects any school not on the whitelist

### MCP Endpoint Auth (client → MCP server)

**There is currently no per-user authentication on the MCP server.** The `/sse` endpoint is open. Anyone who knows the URL can call it.

What does NOT exist yet:
- No JWT verification
- No OAuth flow
- No Anthropic MCP auth protocol integration
- No per-user scoping (teacher_id, parent_id, learner_id are **not** derived from auth)
- No API keys or bearer tokens

This means `teacher_id` / `parent_id` / `learner_id` from the spec are **not yet resolved from server-side auth** — that layer needs to be built.

### Mock Mode

- `D6_MOCK_MODE=true` returns synthetic data (for local dev/testing)
- `D6_MOCK_MODE=false` (production) calls D6 live
- Production guards block mock mode when `ESPEN_ENV=production`

---

## 4. MCP Tools (24 Total)

All tools hit **D6 directly** at request time. None go through Supabase.

### Core Data Tools

| # | Tool | Method | D6 Endpoint | Notes |
|---|------|--------|-------------|-------|
| 1 | `get_schools` | GET | `/v1/settings/clients` | Lists school/client integrations |
| 2 | `get_learners` | GET | `/v1/adminplus/learners/{id}` | Paginated, default 50 records |
| 3 | `get_all_learners` | GET | `/v1/adminplus/learners/{id}` | Compatibility alias for `get_learners` |
| 4 | `get_staff` | GET | `/v1/adminplus/staffmembers/{id}` | Full staff directory |
| 5 | `get_parents` | GET | `/v1/adminplus/parents/{id}` | Full parent database |
| 6 | `get_learner_marks` | GET | `/v1/currplus/learnersubjectmarks/{school}/{learner}` | Single learner marks |
| 7 | `get_marks_for_learners` | GET (fan-out) | `/v1/currplus/learnersubjectmarks/{school}/{learner}` per ID | **Batch marks sync — recommended for sync workers.** Max 100 IDs, concurrency=5 |
| 8 | `get_learner_subjects` | GET | `/v1/currplus/learnersubjects/{school}/{learner}` | Single learner subjects |
| 9 | `get_learner_subjects_per_term` | GET | `/v1/currplus/learnersubjectsperterm/{school}/{learner}` | Single learner subjects by term |

### Bulk Tools (Limited)

| # | Tool | Status | Notes |
|---|------|--------|-------|
| 10 | `get_all_subjects` | **Stubbed** | Always returns `CURRPLUS_BULK_NOT_SUPPORTED` in production. D6 bulk route (`/v1/currplus/subjects/{id}`) unconfirmed. Derive subjects from `learner_marks` data instead. |
| 11 | `get_all_marks` | **Sampling only** | Attempts bulk route, falls back per-learner if `allow_fallback=true`. Not authoritative for sync. |

### Filtered Query Tools

| # | Tool | Notes |
|---|------|-------|
| 12 | `get_learners_by_language` | Server-side filter on `get_learners` response |
| 13 | `get_learners_by_grade` | Server-side filter on `get_learners` response |
| 14 | `get_data_summary` | Computed statistics (counts, distributions) |

### Admin / Settings Tools

| # | Tool | D6 Endpoint | Notes |
|---|------|-------------|-------|
| 15 | `d6_get_school_info` | GET `/v1/adminplus/school/{id}` | Direct school info |
| 16 | `d6_get_learners` | GET `/v1/adminplus/learners/{id}` | Direct learners with explicit school_login_id required |
| 17 | `enable_d6_client` | PATCH `/v1/settings/clients/{id}` | Enable/disable D6 integration for a school |
| 18 | `bulk_enable_d6_schools` | PATCH (loop) `/v1/settings/clients/{id}` | Batch school activation |
| 19 | `list_d6_schools` | GET `/v1/settings/clients` | Filtered school listing |

### Admin+ Learner pastoral (attendance & discipline)

| # | Tool | D6 Endpoint | Notes |
|---|------|-------------|-------|
| 23 | `get_learner_absentees` | GET `/v1/adminplus/learnerabsentees/{id}` | Default: last month. Optional `learner_id`, `from_date`+`to_date` (max 31 days). [API ref](https://apidocs.d6plus.co.za/reference/administration+/learner/get-learner-absentees) |
| 24 | `get_learner_discipline` | GET `/v1/adminplus/learnerdiscipline/{id}` | Same query rules as absentees. [API ref](https://apidocs.d6plus.co.za/reference/administration+/learner/get-learner-discipline) |

### System Tools

| # | Tool | Notes |
|---|------|-------|
| 20 | `get_lookup_data` | Reference data (genders, grades) |
| 21 | `get_system_health` | D6 API health check with response time |
| 22 | `get_integration_info` | Integration config details |

---

## 5. Data Flow

```
Client (Claude / Sync Worker / etc.)
  │
  │  POST /sse  (JSON-RPC 2.0)
  │  {"method": "tools/call", "params": {"name": "get_learners", "arguments": {...}}}
  ▼
Vercel Edge Function (api/mcp.ts)
  │
  │  Maps process.env → EnvLike
  ▼
handleMcpRequest (src/mcpHandler.ts)
  │
  │  Routes JSON-RPC method → handleToolCall()
  │  Resolves school_login_id from args (default: 1352)
  │  Asserts school is whitelisted
  ▼
D6 REST API (integrate.d6plus.co.za/api/v1/...)
  │
  │  Auth: HTTP-X-USERNAME + HTTP-X-PASSWORD headers
  │  School in URL path: /v1/adminplus/learners/{school_login_id}
  ▼
JSON response → formatted → returned as MCP tool result
```

All data calls go **directly to D6**. Supabase is not in the production data path. The `@supabase/supabase-js` dependency and `src/db/` schema exist for a future sync worker layer but are unused by the MCP handler today.

---

## 6. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `D6_API_USERNAME` | Yes | D6 integrator username |
| `D6_API_PASSWORD` | Yes | D6 integrator password |
| `D6_API_BASE_URL` | No | Default: `https://integrate.d6plus.co.za/api` |
| `D6_MOCK_MODE` | No | `true` for local dev, `false` (or unset) for production |
| `D6_ALLOWED_SCHOOL_LOGIN_IDS` | No | Comma-separated whitelist of school IDs |
| `D6_SCHOOL_MAP` | No | `id:Name,id:Name` mapping for logging |
| `NODE_ENV` | No | `production` in Vercel |
| `ESPEN_ENV` | No | `production` blocks mock mode |

See `env.example` for the full list including Supabase, Redis, and sync config (not used in production MCP path today).

---

## 7. Recommended Sync Patterns

### Marks Sync (Primary)

Use `get_marks_for_learners` — the only tool designed for deterministic batch sync:

```json
{
  "name": "get_marks_for_learners",
  "arguments": {
    "learner_ids": ["3262", "3263", "3264"],
    "school_login_id": 1352,
    "include_meta": true
  }
}
```

- Max 100 learner IDs per call
- Concurrency=5, per-request timeout=4s
- Returns `{ data: [...], errors: [], meta: { partial, synced_at, ... } }`
- If `partial: true`, re-queue the failed IDs

### Subjects Table

**Do NOT use `get_all_subjects`** — it is stubbed and will return `CURRPLUS_BULK_NOT_SUPPORTED`.

**Do NOT call `get_learner_subjects` per learner** — at 40,000+ learners across schools, that's 40,000 API requests for ~1,000 unique subjects.

**Recommended:** Derive subjects from the `learner_marks` table after marks sync:

```sql
INSERT INTO subjects (subject_code, subject_name, school_id)
SELECT DISTINCT subject_code, subject_name, school_id
FROM learner_marks
WHERE school_id = :school_id
ON CONFLICT (subject_code, school_id) DO UPDATE
SET subject_name = EXCLUDED.subject_name;
```

Zero additional D6 API calls. Every mark record already contains `SubjectCode` and `SubjectName`.

### Learners / Staff / Parents

Use `get_learners`, `get_staff`, `get_parents` with `school_login_id`. These return full datasets per school directly from D6.

---

## 8. Known Limitations & Gaps

| Area | Status | Notes |
|------|--------|-------|
| Per-user auth | Not implemented | No JWT/OAuth/MCP auth. Endpoint is open. |
| Bulk subjects | Stubbed | `get_all_subjects` returns error. Derive from marks instead. |
| Bulk marks | Non-authoritative | `get_all_marks` is for sampling/debug only. Use `get_marks_for_learners`. |
| Supabase integration | Not in MCP path | DB schema exists but handler doesn't use it. |
| Rate limiting | Not on MCP endpoint | D6 API has its own limits; MCP server has no client-side throttling. |
| Error handling | Basic | D6 errors are caught and formatted but no retry logic in the handler. |

---

## 9. Development & Testing

```bash
# Local dev (mock mode)
D6_MOCK_MODE=true npm run dev:vercel

# Run tests
npm test

# Type check
npm run type-check

# Build for Vercel
npm run build

# Deploy
vercel --prod

# Health check
curl https://espen-mcp-server-d6.vercel.app/health
```

### Testing a Tool Manually

```bash
curl -X POST https://espen-mcp-server-d6.vercel.app/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_data_summary",
      "arguments": { "school_login_id": 1352 }
    },
    "id": 1
  }'
```

---

## 10. Change log — Admin+ absentees & discipline (2026-04-21)

### What changed

| Area | Detail |
|------|--------|
| **New MCP tools** | `get_learner_absentees` → D6 `GET /v1/adminplus/learnerabsentees/{school_login_id}`. `get_learner_discipline` → D6 `GET /v1/adminplus/learnerdiscipline/{school_login_id}`. Official docs: [absentees](https://apidocs.d6plus.co.za/reference/administration+/learner/get-learner-absentees), [discipline](https://apidocs.d6plus.co.za/reference/administration+/learner/get-learner-discipline). |
| **Arguments** | `school_login_id` (via existing resolver / default). Optional `learner_id`. Optional `from_date` + `to_date` (`YYYY-MM-DD`) **together**; range **≤ 31 days** (validated before calling D6). Omit dates for D6 default window (last month). |
| **Response shape** | JSON string: `{ tool, school_login_id, school_name, query, record_count, records }`. D6 HTTP **404** (“no records”) is returned as **`record_count: 0`** / empty `records`, not a thrown error. |
| **Mock mode** | `D6_MOCK_MODE=true`: synthetic rows for local testing without D6. |

### Build & repo fixes (same release)

| Item | Reason |
|------|--------|
| **`tsconfig.vercel.json`** | Standalone config compiling only `api/mcp.ts` + `src/mcpHandler.ts`, so Vercel does not typecheck unrelated Fastify/legacy entrypoints during `npm run build`. |
| **`src/api/context.ts`** | `data: mockContext as ContextResponse['data']` so `buildMockContext` default branch type-checks (required for Vercel’s TypeScript step when that file is part of the program). |

### Vercel project name (important)

Production MCP with **D6 secrets** lives under Vercel project **`espen-mcp-server-d6`** (team **`finfy-ai`**), URL **`https://espen-mcp-server-d6.vercel.app`**.

The CLI may auto-link to a **different** project name (`espen-d6-mcp-server`) which **does not** carry the same env vars. Link explicitly before deploy:

```bash
vercel link --yes --scope finfy-ai --project espen-mcp-server-d6
vercel deploy --prod --yes
```

### How it was tested (2026-04-21)

All calls: `POST https://espen-mcp-server-d6.vercel.app/sse`, JSON-RPC `tools/call`.

| Test | Result |
|------|--------|
| `tools/list` | **24** tools; includes `get_learner_absentees` and `get_learner_discipline`. |
| `get_learner_absentees` `{ "school_login_id": 1352 }` | Live D6 data; **631** absence rows (Laerskool Monumentpark). |
| `get_learner_discipline` `{ "school_login_id": 1352 }` | Live D6 data; **252** discipline rows (same school). |
| Per-learner window `2026-04-01`–`2026-04-30`, `learner_id` **5484** | **2** absence rows (illness); **2** discipline rows (positive behaviour entries). |

### Operational notes

- **Browser root URL** may show **404** — there is no marketing page. MCP clients must use **`/sse`** (or `/mcp`, rewritten to the same Edge handler).
- **`GET /health`** may fail on some Edge deployments; rely on **`tools/call`** / `get_system_health` for live checks if needed.
- **Downstream clients** (e.g. Espen OS `D6_MCP_URL`): point at `https://espen-mcp-server-d6.vercel.app` if using Vercel instead of the Cloudflare Worker URL (client code appends `/sse`).
- **Git**: commits on `main` include feature + tsconfig + context fix; push triggers GitHub → Vercel if connected.
