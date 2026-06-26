# GarminBud — Architecture

**Last updated:** 2026-06-26

## Data flow

```
Claude / Cursor → MCP Server (garmin-bud, stdio) → Tool Registry → Cache (SQLite) → Garmin Client → Garmin Connect
                                                        ↓ miss
                                                  Session Auth (.garmin/session.json)
```

## Startup sequences

### First-time setup (`garmin-bud setup`)

1. `runSetup()` in `setup.ts` — readline wizard
2. Prompt email + masked password
3. `writeEnvFile()` → `.env` + reload `process.env`
4. `authenticateGarmin(true)` — clear old session, login, save tokens
5. `detectMcpClients()` — Cursor (`~/.cursor/mcp.json`), Claude Desktop
6. User picks client(s) → `configureGarminBudForClient()` merges config
7. Optional `runLiveCheck()` — calls all 6 tools against live API

### MCP server (`garmin-bud start`)

1. `runStart()` in `cli.ts`
2. `assertGarminCredentials()` — fail fast if `.env` is missing credentials
3. `configureLogger()` — enable file logging to `.garmin/mcp.log`
4. Register SIGTERM/SIGINT/exit handlers
5. Connect MCP stdio transport
6. On tool call → `executeTool()` → cache check → `withGarminClient()` → Garmin API

### Live diagnostics (`garmin-bud check`)

1. `runLiveCheck()` in `check.ts`
2. For each of 6 tools, call `executeTool()` with sensible defaults
3. Summarize pass/fail (data present vs errors vs "no data" messages)
4. Activities range uses 30-day window; other tools use default params

## Source layout

```
src/
├── index.ts          # CLI entry (#!/usr/bin/env node)
├── cli.ts            # Commander: setup, check, start, auth, cache clear, status
├── setup.ts          # Interactive first-time setup wizard
├── check.ts          # Live diagnostics for all 6 tools
├── mcpConfig.ts      # Cursor / Claude Desktop MCP config detection + merge
├── server.ts         # MCP server (id: garmin-bud), sanitized tool errors
├── config.ts         # dotenv, writeEnvFile(), getDistIndexPath(), credential getters
├── version.ts        # reads version from package.json at runtime
├── garmin/
│   ├── auth.ts       # session read/write, login, token restore
│   ├── client.ts     # singleton, withGarminClient() + auth retry
│   ├── garminConnect.ts   # typed wrapper (createRequire)
│   ├── garminApiTypes.ts  # local API shapes (no garmin-connect/dist imports)
│   ├── cache.ts      # SQLite, buildToolCacheKey(), closeCache()
│   └── types.ts      # domain types, GarminApiError class
├── tools/
│   ├── types.ts      # ToolDefinition interface
│   ├── index.ts      # registry, executeTool(), Zod schemas
│   ├── activities.ts # pool cache, pagination up to 500
│   ├── sleep.ts      # per-night fetch with null-safe sleepScores
│   ├── heartRate.ts  # per-day fetch with null-safe heartRateValues
│   ├── recovery.ts   # yesterday's sleep + fallback
│   └── bodyComposition.ts
└── utils/
    ├── batch.ts      # mapInBatches (default concurrency 6)
    ├── helpers.ts    # dates, parseActivityLocalDateTime, trends, sanitizeErrorMessage
    └── logger.ts     # lazy init, stderr-only until configureLogger()
```

## Design decisions

### Interactive setup (2026-06-26)

- No new dependencies — Node `readline/promises` + raw-mode password masking
- `mcpConfig.ts` reads/merges existing MCP JSON without removing other servers
- Resolves absolute path to `dist/index.js` at runtime — user never edits paths
- Credentials written to `.env`; MCP config `env` block duplicates them for clients that don't inherit cwd

### Local-first caching

- SQLite via `better-sqlite3`
- Per-resource TTL: activities 30m, sleep 2h, stats 1h
- Keys via `buildToolCacheKey(tool, params)` with sorted-param `hashParams()`

### API call batching

- `mapInBatches()` limits concurrency to 6
- Sleep, heart rate, body composition: one `withGarminClient()` session per multi-day fetch
- Per-day errors return `null` and are filtered — one bad day doesn't crash the whole fetch

### Activities pool

- Single cached `activities_pool` (up to 500 activities, pages of 100)
- `get_latest_activity` and `get_activities_range` filter from pool
- Truncation warning appended when 500-cap may have been hit
- Garmin returns `startTimeLocal` as `yyyy-MM-dd HH:mm:ss` (not ISO `T` format) — parsed via `parseActivityLocalDateTime()` in `helpers.ts`

### Authentication

- Credentials in `.env` (getters on `appConfig` so reload works after setup)
- Tokens in `.garmin/session.json`
- `withGarminClient()` retries once on auth errors (401/403/token)
- `GarminApiError` class for rate limits (429)

### Logging

- Module import: stderr-only via pino-pretty (`destination: 2`)
- Server start: file + stderr via `configureLogger()`
- Protects MCP stdio — stdout is JSON-RPC only

### Error handling

- Full errors logged server-side via pino
- MCP client receives `sanitizeErrorMessage()` output (strips emails, paths)
- Auth errors include hint: `Run "garmin-bud auth"`

### Shutdown

- SIGTERM/SIGINT → `server.close()` + `closeCache()` → exit 0
- `exit` handler also calls `closeCache()` for WAL checkpoint

### Version

- Single source: `package.json` read by `src/version.ts`
- Used in CLI `--version` and MCP handshake

## Tool registry

Each tool exports a `ToolDefinition` with `name`, `description`, `inputSchema`, and `handler`. Zod schemas in `tools/index.ts` validate MCP inputs. No unsafe casts in registry aggregation.

## CI/CD

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `ci.yml` | push/PR to main | typecheck, build, test (26), lint |
| `publish.yml` | push tag `v*` | typecheck, build, test, lint, npm publish, GitHub Release |

Requires `NPM_TOKEN` secret for publish.

## Known remaining gaps

- **Cursor Node ABI mismatch** — Cursor bundles Node 22 (MODULE 127); dev machine may use Node 24 (MODULE 137). `better-sqlite3` must be rebuilt for the Node binary that launches the MCP server. CLI works; in-chat MCP fails until resolved.
- No HTTP/SSE MCP transport (blocks remote/Docker sidecar)
- No in-flight request deduplication across concurrent tool calls
- Module singletons (`clientInstance`, `cacheInstance`) shared in tests unless reset
- MFA unsupported by underlying `garmin-connect` library
- Password duplicated in MCP client config `env` block — security trade-off for portability

## Related docs

- [Project overview](./project-overview.md)
- [Branding](./branding.md)
- [Code audit — resolved](./code-audit-resolved.md)
