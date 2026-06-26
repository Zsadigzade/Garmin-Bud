# garmin-mcp — Architecture

**Last updated:** 2026-06-26 (post-audit)

## Data flow

```
Claude → MCP Server (stdio) → Tool Registry → Cache (SQLite) → Garmin Client → Garmin Connect
                                                    ↓ miss
                                              Session Auth (.garmin/session.json)
```

## Source layout

```
src/
├── index.ts          # CLI entry
├── cli.ts            # start, auth, cache clear, status + shutdown handlers
├── server.ts         # MCP server, tool registration, sanitized errors
├── config.ts         # env loading, getSessionPath(), assertGarminCredentials()
├── version.ts        # reads version from package.json
├── garmin/
│   ├── auth.ts       # session persistence, login
│   ├── client.ts     # singleton + withGarminClient retry
│   ├── garminConnect.ts   # typed wrapper around garmin-connect
│   ├── garminApiTypes.ts  # local API type definitions
│   ├── cache.ts      # SQLite cache, buildToolCacheKey(), closeCache()
│   └── types.ts      # domain types, GarminApiError class
├── tools/            # 6 MCP tool handlers
└── utils/
    ├── batch.ts      # mapInBatches (concurrency limit 6)
    ├── helpers.ts    # dates, trends, hashParams, sanitizeErrorMessage
    └── logger.ts     # lazy init, stderr-only until configureLogger()
```

## Design decisions

### Local-first caching

- SQLite via `better-sqlite3`
- Per-resource TTL: activities 30m, sleep 2h, stats 1h
- Keys built via `buildToolCacheKey()` with sorted-param hashing

### API call batching

- Sleep, heart rate, and body composition use `mapInBatches()` with concurrency 6
- Single `withGarminClient()` session per multi-day fetch (not one client per day)

### Activities pool

- Shared `activities_pool` cache entry (up to 500 activities, paginated in pages of 100)
- Range queries filter from pool — no redundant fetches per date range
- Truncation warning when 500-activity cap is hit

### Logging

- Default logger writes to **stderr only** (protects MCP stdio on stdout)
- File logging enabled via `configureLogger()` when server starts

### Shutdown

- SIGTERM/SIGINT/exit handlers close MCP server and SQLite cache

### Version

- Single source: `package.json` via `src/version.ts`

## Authentication flow

1. `runStart()` validates credentials before attaching stdio
2. On tool call, `withGarminClient()` restores session from disk or logs in
3. On 401/403, client resets and re-authenticates once

## Security notes

- Credentials in `.env` only
- Session file treated like a password
- Tool errors sanitized before returning to MCP client (`sanitizeErrorMessage`)

## CI/CD

- **CI** (`.github/workflows/ci.yml`): typecheck, build, test, lint on push/PR
- **Publish** (`.github/workflows/publish.yml`): npm publish + GitHub Release on `v*` tags (requires `NPM_TOKEN`)

## Known remaining gaps

- No HTTP/SSE MCP transport (blocks remote/Docker deployment)
- No in-flight request deduplication across concurrent tool calls
- Tool handlers not integration-tested against live Garmin API (mock-free unit tests only)
- MFA still unsupported by underlying library
