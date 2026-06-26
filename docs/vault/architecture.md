# GarminBud — Architecture

**Last updated:** 2026-06-26

## Data flow

```
Claude / Cursor → MCP Server (garmin-bud, stdio) → Tool Registry → Cache (SQLite) → Garmin Client → Garmin Connect
                                                        ↓ miss
                                                  Session Auth (.garmin/session.json)
```

## Startup sequence

1. `garmin-bud setup` → interactive wizard in `setup.ts` (credentials, auth, MCP client config)
2. `garmin-bud start` → `runStart()` in `cli.ts`
2. `assertGarminCredentials()` — fail fast if `.env` is missing credentials
3. `configureLogger()` — enable file logging to `.garmin/mcp.log`
4. Register SIGTERM/SIGINT/exit handlers
5. Connect MCP stdio transport
6. On tool call → `executeTool()` → cache check → `withGarminClient()` → Garmin API

## Source layout

```
src/
├── index.ts          # CLI entry (#!/usr/bin/env node)
├── cli.ts            # Commander: setup, check, start, auth, cache clear, status
├── setup.ts          # Interactive first-time setup wizard
├── check.ts          # Live diagnostics for all 6 tools
├── mcpConfig.ts      # Cursor / Claude Desktop MCP config detection + merge
├── server.ts         # MCP server (id: garmin-bud), sanitized tool errors
├── config.ts         # dotenv, getSessionPath(), assertGarminCredentials()
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
│   ├── sleep.ts
│   ├── heartRate.ts
│   ├── recovery.ts   # yesterday's sleep + fallback
│   └── bodyComposition.ts
└── utils/
    ├── batch.ts      # mapInBatches (default concurrency 6)
    ├── helpers.ts    # dates, trends, hashParams, sanitizeErrorMessage
    └── logger.ts     # lazy init, stderr-only until configureLogger()
```

## Design decisions

### Local-first caching

- SQLite via `better-sqlite3`
- Per-resource TTL: activities 30m, sleep 2h, stats 1h
- Keys via `buildToolCacheKey(tool, params)` with sorted-param `hashParams()`

### API call batching

- `mapInBatches()` limits concurrency to 6
- Sleep, heart rate, body composition: one `withGarminClient()` session per multi-day fetch
- Avoids 30 parallel day-requests that trigger Garmin rate limits

### Activities pool

- Single cached `activities_pool` (up to 500 activities, pages of 100)
- `get_latest_activity` and `get_activities_range` filter from pool
- Truncation warning appended when 500-cap may have been hit

### Authentication

- Credentials in `.env`; tokens in `.garmin/session.json`
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
| `ci.yml` | push/PR to main | typecheck, build, test (22), lint |
| `publish.yml` | push tag `v*` | typecheck, build, test, lint, npm publish, GitHub Release |

Requires `NPM_TOKEN` secret for publish.

## Known remaining gaps

- No HTTP/SSE MCP transport (blocks remote/Docker sidecar)
- No in-flight request deduplication across concurrent tool calls
- Module singletons (`clientInstance`, `cacheInstance`) shared in tests unless reset
- Tool handlers testable via `garmin-bud check` against live Garmin API
- MFA unsupported by underlying `garmin-connect` library

## Related docs

- [Project overview](./project-overview.md)
- [Branding](./branding.md)
- [Code audit — resolved](./code-audit-resolved.md)
