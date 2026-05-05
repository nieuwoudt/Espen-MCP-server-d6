# Espen D6 MCP Server - Project Status Summary

*Last Updated: April 21, 2026*

## 📝 Update — 2026-04-21

- **Shipped** MCP tools **`get_learner_absentees`** and **`get_learner_discipline`** (D6 Admin+ `learnerabsentees` / `learnerdiscipline`). Total tools **24**.
- **Deployed & tested** on Vercel project **`espen-mcp-server-d6`** (`https://espen-mcp-server-d6.vercel.app/sse`). Confirmed live D6 responses for `school_login_id` **1352** (631 absence rows, 252 discipline rows full-school sample; per-learner **5484** in April 2026 window).
- **Build hygiene:** standalone **`tsconfig.vercel.json`** (Edge bundle only); **`src/api/context.ts`** mock response typing fix for Vercel `tsc`.
- **Deploy note:** use `vercel link --scope finfy-ai --project espen-mcp-server-d6` so CLI targets the project that holds **D6_API_USERNAME** / **D6_API_PASSWORD**. Full notes in **`MCP_SERVER_ARCHITECTURE.md` §10**.

## 🎯 Project Goal
Build an MCP (Model Context Protocol) server that connects Claude and Supabase sync workers to D6 education platform's production data, enabling natural language queries and deterministic batch syncing of student information, academic records, and school operations.

## ✅ What's Complete & Working

### 1. MCP Server Infrastructure
- **✅ Production MCP server** with **24 functional tools** on Vercel
- **✅ Shared handler architecture** (`src/mcpHandler.ts`) — single source of truth for both Cloudflare and Vercel
- **✅ Multi-school support** — 13 authorized schools via `D6_ALLOWED_SCHOOL_LOGIN_IDS`
- **✅ Mock mode** for local development (`D6_MOCK_MODE=true`), disabled in production
- **✅ Production guards** — mock mode blocked in production environments

### 2. D6 API Integration
- **✅ Authentication working** with production integrator account (`espenaiapi`)
- **✅ Multi-school architecture**: Single integrator, multiple schools via `school_login_id` in URL path
- **✅ AdminPlus endpoints**: Learners, staff, parents, **learner absentees & discipline** — all returning real data
- **✅ Curriculum+ endpoints**: Learner marks, subjects, subjects-per-term — all working
- **✅ Settings endpoints**: Client integrations, enable/disable, bulk activation
- **✅ Primary school**: Laerskool Monumentpark (`school_login_id=1352`) — fully operational

### 3. MCP Tools (24 Total)

#### Core Data Tools
| Tool | Purpose | Status |
|------|---------|--------|
| `get_schools` | School/client integration info | ✅ Working |
| `get_learners` | Learner data with pagination (default 50, max 1000) | ✅ Working |
| `get_all_learners` | Compatibility alias for get_learners | ✅ Working |
| `get_staff` | Complete staff directory | ✅ Working |
| `get_parents` | Complete parent database | ✅ Working |
| `get_learner_marks` | Single learner marks (Curriculum+) | ✅ Working |
| `get_marks_for_learners` | **Batch marks sync by learner IDs (max 100)** | ✅ **NEW — Production verified** |
| `get_learner_subjects` | Single learner subjects (Curriculum+) | ✅ Working |
| `get_learner_subjects_per_term` | Single learner subjects per term | ✅ Working |
| `get_all_subjects` | Bulk subjects (paged, tenant-scoped) | ⚠️ **Stub** — returns `CURRPLUS_BULK_NOT_SUPPORTED` in production; D6 bulk route unconfirmed. Use `get_learner_subjects` per learner instead. |
| `get_all_marks` | Bulk marks — sampling/debug only, not for sync | ⚠️ Non-authoritative |

#### Optimized Query Tools
| Tool | Purpose | Status |
|------|---------|--------|
| `get_learners_by_language` | Filter learners by home language | ✅ Working |
| `get_learners_by_grade` | Filter learners by grade level | ✅ Working |
| `get_data_summary` | School statistics (counts, distributions) | ✅ Working |

#### Admin / Settings Tools
| Tool | Purpose | Status |
|------|---------|--------|
| `d6_get_school_info` | Direct D6 AdminPlus school info | ✅ Working |
| `d6_get_learners` | Direct D6 AdminPlus learners | ✅ Working |
| `enable_d6_client` | Enable/disable D6 client integration | ✅ Working |
| `bulk_enable_d6_schools` | Batch school activation | ✅ Working |
| `list_d6_schools` | List integrator's schools (filtered) | ✅ Working |

#### System Tools
| Tool | Purpose | Status |
|------|---------|--------|
| `get_lookup_data` | Reference data (genders, etc.) | ✅ Working |
| `get_system_health` | API health check with response time | ✅ Working |
| `get_integration_info` | Integration config details | ✅ Working |

#### Admin+ pastoral (2026-04-21)
| Tool | Purpose | Status |
|------|---------|--------|
| `get_learner_absentees` | Absence records (`absent_date`, `absent_reason`); optional `learner_id`, date range (≤31 days) | ✅ Production verified |
| `get_learner_discipline` | Discipline records (category, reason, points, remarks); same optional filters | ✅ Production verified |

### 4. `get_marks_for_learners` — Deterministic Batch Sync (NEW)

The primary engine for daily marks sync. Replaces reliance on unstable pagination.

**Input:**
- `school_login_id` (integer) — which school
- `learner_ids` (array, max 100) — exactly which learners to fetch
- `term` (integer, optional) — filter by term 1-4
- `academic_year` (integer, optional) — filter by year
- `include_meta` (boolean) — include `synced_at` timestamp

**Response shape (exact field names):**
```json
{
  "data": [ { "learner_id": "3262", "subject_name": "...", ... } ],
  "errors": [],
  "meta": {
    "mode": "by_ids",
    "partial": false,
    "requested_learners_count": 16,
    "successful_learners_count": 16,
    "errors_count": 0,
    "synced_at": "2026-02-16T11:58:54.816Z"
  }
}
```

**Production validation (Feb 16, 2026):**
- ✅ 16 real learner IDs → 675 marks returned, 0 errors
- ✅ Every row has `learner_id` (injected if D6 omits it)
- ✅ Zero duplicate rows
- ✅ Two identical calls → identical data (deterministic)
- ✅ Concurrency=5, per-request timeout=4s, overall budget=8s

### 5. Deployment Architecture

**Production URL:** `https://espen-mcp-server-d6.vercel.app/sse`

```
Claude / Sync Worker → POST /sse → Vercel Edge Function → Shared mcpHandler.ts → D6 API
```

- **Vercel**: Production deployment (auto-deploys from `main` branch)
- **Cloudflare**: Legacy deployment (still active at `espen-d6-mcp-remote.niev.workers.dev`)
- **Shared handler**: Both platforms use identical `src/mcpHandler.ts`

### 6. Testing & Validation
- **✅ TypeScript build** — `npm run build` passes cleanly (`tsconfig.vercel.json` scoped to Edge handler)
- **✅ Production runtime** — `tools/list` returns **24** tools on `espen-mcp-server-d6.vercel.app`
- **✅ Real D6 data** — school **1352**: `get_learner_absentees` / `get_learner_discipline` return live rows; sample learner **5484** April 2026 has both absence and discipline rows
- **✅ Multi-school** — school whitelist + name mapping via environment variables

## 📊 Current Environment

| Setting | Value |
|---------|-------|
| **Primary School** | Laerskool Monumentpark (`school_login_id=1352`) |
| **API Base URL** | `https://integrate.d6plus.co.za/api` |
| **Auth** | Production integrator credentials |
| **Mock Mode** | `false` in production, `true` for local dev |
| **Schools Whitelisted** | 13 via `D6_ALLOWED_SCHOOL_LOGIN_IDS` |
| **Vercel URL** | `https://espen-mcp-server-d6.vercel.app/sse` |

## 📁 Key Files

```
espen-d6-mcp-server/
├── api/mcp.ts                     # Vercel Edge Function entry point
├── src/mcpHandler.ts              # Shared MCP handler (24 tools, all logic)
├── src/cloudflare-worker-minimal.ts  # Cloudflare Worker entry point
├── vercel.json                    # Vercel rewrites (/sse → /api/mcp)
├── tsconfig.vercel.json           # Build config for Vercel
├── package.json                   # Dependencies + scripts
├── README.md                      # User-facing docs
├── MCP_SERVER_ARCHITECTURE.md      # Architecture, tools catalogue, §10 change log
├── D6_INTEGRATION.md              # D6 API integration reference
└── VERCEL_DEPLOYMENT_GUIDE.md     # Deployment instructions
```

## 🚀 Next Steps

### For Sync Worker
1. **Marks**: Use `get_marks_for_learners` as primary marks sync engine — batch 50-100 learner IDs per call
2. **Subjects**: Use `get_learner_subjects` per learner (bulk `get_all_subjects` is a stub; D6 bulk route unconfirmed)
3. Pull learner IDs from Supabase, chunk into batches of 50-100
4. Call tool per batch, hash/dedupe in Supabase
5. If `partial: true`, re-queue the batch
6. Use `term` / `academic_year` filters for incremental sync
7. **Do NOT use** `get_all_subjects` or `get_all_marks` for authoritative sync — they are stubs/sampling tools

### Remaining Work
- [ ] **Supabase sync worker** — marks/subjects via `get_marks_for_learners` + `get_learner_subjects`; extend for **`get_learner_absentees` / `get_learner_discipline`** (respect **31-day** D6 window per call)
- [ ] **Bulk subjects route** — confirm with D6 whether `GET /v1/currplus/subjects/{loginId}` exists; if so, wire up `getAllSubjectsFromD6` in the `get_all_subjects` handler
- [ ] **Timeout/partial path** — runtime test with genuinely slow D6 responses
- [ ] **Additional schools** — validate `get_marks_for_learners` across all 13 whitelisted schools
- [ ] **Vercel Preview bypass** — configure `VERCEL_AUTOMATION_BYPASS_SECRET` for pre-merge testing

## 📈 Success Metrics
- ✅ **MCP Server**: Production-ready (24/24 tools live on Vercel)
- ✅ **Authentication**: Working with production integrator
- ✅ **Data Access**: Full AdminPlus (incl. absentees/discipline) + Curriculum+ for school 1352
- ✅ **Batch Sync**: `get_marks_for_learners` validated on real data
- ✅ **Deployment**: Auto-deploy from `main` via Vercel
- ✅ **Multi-school**: 13 schools whitelisted and accessible 