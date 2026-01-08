# Supabase Delta Sync (source_hash + last_synced_at)

Scope: worker-side (not MCP). Use this doc to stage migrations and upsert logic once the sync worker repo is identified.

## Schema (per synced table)
```sql
ALTER TABLE <table_name>
  ADD COLUMN IF NOT EXISTS source_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_run_id TEXT;

CREATE INDEX IF NOT EXISTS idx_<table_name>_source_hash ON <table_name>(source_hash);
CREATE INDEX IF NOT EXISTS idx_<table_name>_last_synced_at ON <table_name>(last_synced_at);
```
Apply to: learners, subjects, enrolments, marks, attendance, discipline, parents/staff (or any table mirrored from D6).

## Normalization + hashing
- Normalize objects before hashing: recursively sort keys, drop volatile/request fields, convert `undefined` → `null`, trim strings where appropriate, normalize dates to ISO 8601, treat `null` and `''` consistently.
- Compute `source_hash = sha256(canonical_json_string)`.
- When D6 supplies a trusted timestamp, persist as `source_updated_at` (nullable).

## Upsert algorithm (worker)
1) Compute `row_hash` from normalized payload.
2) Fetch existing by PK (or composite PK).
3) If missing → INSERT with `source_hash`, `last_synced_at = now()`, optional `source_updated_at`, `sync_run_id`.
4) If exists:
   - If `source_updated_at` present and incoming `<= existing.source_updated_at` **and** hashes equal → SKIP.
   - Else if `row_hash === existing.source_hash` → SKIP (optionally set `last_synced_at` if you want “seen”).
   - Else → UPDATE data + `source_hash`, `last_synced_at = now()`, optional `source_updated_at`, `sync_run_id`.
5) Keep MCP stateless: no DB lookups in MCP; all decisions happen in worker.

## Optional sync metadata
- Accept caller flag (or new endpoint) to include `meta.synced_at` (server timestamp when MCP fetched from D6). Default: off.

## QA checklist
- A1 No-change run: after baseline sync, rerun → Inserts=0, Updates=0, Skips≈rows.
- A2 Single-field change: edit one record in D6 → exactly one row updated, hash changes only there.
- A3 Ordering change: reorder payload → 0 updates (hash canonicalization stable).
- A4 Null vs empty: normalize and ensure reruns don’t churn on `null`/`""`.
- B1 Bulk completeness: bulk tool count matches per-learner aggregation.
- B2 Pagination: page_size=200, iterate until cursor null → no gaps/dupes.
- B3 Tenant scoping: calling with unauthorized school_id returns 403/blocked (MCP-level allowlist).
- B4 Performance: bulk + hashing materially faster than per-learner sync and avoids timeouts/rate limits.

