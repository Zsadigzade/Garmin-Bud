# Code Audit — Resolution Log

**Project:** GarminBud (`garmin-bud`)  
**Audit date:** 2026-06-26  
**Resolution date:** 2026-06-26  
**Rebrand date:** 2026-06-26  
**Findings:** 26 total — **26 resolved**

## Summary

Deep code analysis identified 2 critical, 7 high, 9 medium, and 8 low issues. All were implemented in a single hardening pass. Test suite expanded from 11 to 22 tests. Product subsequently rebranded from `garmin-mcp` to **GarminBud**.

---

## Rebrand (2026-06-26)

| Item | Before | After |
|------|--------|-------|
| Product name | Garmin MCP Server | **GarminBud** |
| Tagline | — | Talk to your Garmin data. |
| npm / CLI | `garmin-mcp` | `garmin-bud` |
| MCP server id | `garmin-mcp` | `garmin-bud` |
| GitHub repo | `Zsadigzade/-Garmin` | `Zsadigzade/garmin-bud` |
| Local data dir | `.garmin/` | `.garmin/` (unchanged) |

Docs added/updated: README (product page), QUICKSTART, CONTRIBUTING, LICENSE, vault, canvas.

See [branding.md](./branding.md) for full identity reference.

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
| M9 | Unused `getDatesBetween` | Kept; date logic centralized in `filterActivitiesByRange()` |

## Low (8/8 resolved)

| ID | Issue | Resolution |
|----|-------|------------|
| L1 | Imports from garmin-connect/dist/ | Replaced with `garminApiTypes.ts` |
| L2 | Test temp dirs not cleaned up | `fs.rmSync(tempDir, { recursive: true })` in afterEach |
| L3 | Logger created .garmin/ at import | Lazy init; file log only after `configureLogger()` |
| L4 | `runCacheClear` unnecessarily async | Changed to sync function |
| L5 | No .nvmrc | Added `.nvmrc` with Node 20 |
| L6 | Weak integration tests | Expanded to 22 tests: validation, sanitization, version, recovery |
| L7 | No SIGTERM/SIGINT handlers | Handlers in `runStart()` |
| L8 | No CI publish job | `.github/workflows/publish.yml` for `v*` tags |

---

## Files added during hardening + rebrand

**Source:**
- `src/version.ts`
- `src/utils/batch.ts`
- `src/garmin/garminApiTypes.ts`
- `src/tools/types.ts`

**Project:**
- `.nvmrc`
- `LICENSE`
- `CONTRIBUTING.md`
- `.github/workflows/publish.yml`
- `docs/vault/` (this documentation set)

## Test coverage

**22 tests passing** across:

- Auth session persistence (2)
- GarminCache — miss, TTL, buildKey stability, clear (5)
- Tool registry (1)
- Helpers — dates, trends, hashParams, filterActivitiesByRange, sanitization (6)
- Recovery scoring (2)
- Tool errors — rate limit formatting (1)
- Integration — server, version, executeTool validation, error sanitization (5)

### Still not covered (future work)

- Automated live Garmin API tests in CI (requires credentials or mocks)
- `withGarminClient` auth-retry against real 401 responses
- SIGTERM handler end-to-end
- MCP protocol message structure validation

---

## Post-audit: usability + live testing (2026-06-26)

Added setup wizard, live diagnostics, and fixed bugs found during first real-account test.

### New commands

| Command | File | Purpose |
|---------|------|---------|
| `garmin-bud setup` | `src/setup.ts` | Interactive credentials, auth, MCP client config |
| `garmin-bud check` | `src/check.ts` | Live API test for all 6 tools |

### New modules

| File | Purpose |
|------|---------|
| `src/mcpConfig.ts` | Detect Cursor / Claude Desktop, merge `garmin-bud` into MCP JSON |
| `src/setup.ts` | readline wizard, password masking, optional live check |
| `src/check.ts` | Tool-by-tool pass/fail summary |

### Live-test bugs found and fixed

| Tool | Symptom | Root cause | Fix |
|------|---------|------------|-----|
| `get_sleep_data` | `Cannot read properties of undefined (reading 'overall')` | Garmin omits `sleepScores` on some nights | Optional chaining `sleepScores?.overall`; per-night try/catch |
| `get_heart_rate_trends` | `Cannot read properties of null (reading 'heartrate')` | Null entries in `heartRateValues` arrays | Null-safe flat/filter; skip days with no data |
| `get_activities_range` | No activities despite recent workout | Garmin `startTimeLocal` uses `yyyy-MM-dd HH:mm:ss`, not ISO | Added `parseActivityLocalDateTime()` (ISO + SQL formats) |
| `recovery.ts` | TS build error after type change | `sleepScores` made optional | `sleep?.sleepScores?.overall?.value` |

### Config changes

- `appConfig.garminEmail` / `garminPassword` changed to getters (reload after setup writes `.env`)
- Added `writeEnvFile()`, `getDistIndexPath()`, `getProjectRoot()`

### Test suite

Expanded from 25 → **26 tests** (added `tests/mcpConfig.test.ts` + Garmin datetime filter test).

### Live test result

All 6 tools pass via `garmin-bud check` against real account. Cursor in-chat MCP blocked by `better-sqlite3` Node ABI mismatch — documented in architecture and project overview.

### Still open after live test

| Issue | Notes |
|-------|-------|
| Cursor Node ABI | Rebuild native module for Cursor's bundled Node |
| Plaintext password in `mcp.json` | Setup wizard writes credentials to MCP config `env` |
| ECG permanent MFA | Some accounts cannot disable 2FA — incompatible with library |

## Phase 2 blockers (current)

| Goal | Status | Notes |
|------|--------|-------|
| Docker image | Unblocked (C1 fixed) | Dockerfile still needed |
| Workout comparison | Partially unblocked (H7) | 500-activity cap with warning |
| VO2 max trends | Blocked | No API mapping in garminConnect.ts |
| Stress levels | Blocked | getDailyStress() not wrapped |
| Training insights | Blocked | No cross-tool aggregation layer |

## Related docs

- [Branding](./branding.md)
- [Architecture](./architecture.md)
- [Project overview](./project-overview.md)
