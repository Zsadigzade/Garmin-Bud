# Code Audit — Resolution Log

**Audit date:** 2026-06-26  
**Resolution date:** 2026-06-26  
**Findings:** 26 total — **26 resolved**

## Summary

Deep code analysis identified 2 critical, 7 high, 9 medium, and 8 low issues. All were implemented in a single hardening pass. Test suite expanded from 11 to 22 tests.

---

## Critical (2/2 resolved)

| ID | Issue | Resolution |
|----|-------|------------|
| C1 | pino-pretty wrote to stdout, corrupting MCP stdio | `destination: 2` on pino-pretty; lazy logger init |
| C2 | Credentials validated only on first tool call | `assertGarminCredentials()` in `runStart()` before stdio attach |

## High (7/7 resolved)

| ID | Issue | Resolution |
|----|-------|------------|
| H1 | N+1 parallel API calls in sleep/HR tools | `mapInBatches()` with concurrency 6 in `src/utils/batch.ts` |
| H2 | Body composition sequential fetches | Batched parallel fetches via `mapInBatches()` |
| H3 | `GarminCache.buildKey()` unused | All tools use `buildToolCacheKey()` |
| H4 | Unstable `hashParams` key order | Keys sorted before JSON.stringify |
| H5 | Duplicate session path resolution | `getSessionPath()` in config.ts; auth uses `appConfig.sessionPath` |
| H6 | Hardcoded version strings | `src/version.ts` reads from package.json |
| H7 | Activities truncated at 200 silently | Paginated fetch up to 500; shared pool cache; truncation warning |

## Medium (9/9 resolved)

| ID | Issue | Resolution |
|----|-------|------------|
| M1 | Garmin API responses typed as unknown | `garminApiTypes.ts` + typed `GarminConnectInstance` |
| M2 | Triple cast in tool registry | Shared `ToolDefinition` in `src/tools/types.ts` |
| M3 | Recovery fetched today's incomplete sleep | Yesterday + fallback nights |
| M4 | Mixed local/UTC date filtering | `filterActivitiesByRange()` uses Luxon consistently |
| M5 | GarminApiError was an interface | Proper `class GarminApiError extends Error` |
| M6 | Cache never closed on exit | `closeCache()` + shutdown handlers |
| M7 | Missing await on auth retry | `return await operation(client)` |
| M8 | Raw errors forwarded to MCP client | `sanitizeErrorMessage()` in `formatToolError()` |
| M9 | Unused `getDatesBetween` | Kept; used via shared `filterActivitiesByRange()` helper |

## Low (8/8 resolved)

| ID | Issue | Resolution |
|----|-------|------------|
| L1 | Imports from garmin-connect/dist/ | Replaced with `garminApiTypes.ts` |
| L2 | Test temp dirs not cleaned up | `fs.rmSync(tempDir, { recursive: true })` in afterEach |
| L3 | Logger created .garmin/ at import | Lazy init; file log only after `configureLogger()` |
| L4 | `runCacheClear` unnecessarily async | Changed to sync function |
| L5 | No .nvmrc | Added `.nvmrc` with Node 20 |
| L6 | Weak integration tests | Added validation, error sanitization, version tests |
| L7 | No SIGTERM/SIGINT handlers | Handlers in `runStart()` |
| L8 | No CI publish job | `.github/workflows/publish.yml` for `v*` tags |

---

## New files added

- `src/version.ts`
- `src/utils/batch.ts`
- `src/garmin/garminApiTypes.ts`
- `src/tools/types.ts`
- `.nvmrc`
- `.github/workflows/publish.yml`
- `docs/vault/` (this documentation set)

## Test coverage after audit

**22 tests passing** across auth, cache, helpers, recovery scoring, tool errors, and integration.

Still not covered (future work):

- Live Garmin API tool handler tests (requires mocks or credentials)
- `withGarminClient` auth-retry against real 401 responses
- SIGTERM handler end-to-end
- MCP protocol message structure validation

## Phase 2 blockers updated

| Goal | Previous blocker | Current status |
|------|------------------|----------------|
| Docker image | C1 stdout pollution | **Unblocked** — Dockerfile still needed |
| Workout comparison | H7 200-activity cap | **Partially unblocked** — 500 cap with warning |
| VO2 max trends | No API mapping | Still blocked |
| Stress levels | No endpoint mapped | Still blocked |
| Training insights | No aggregation layer | Still blocked |
