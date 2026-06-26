# GarminBud — Project Overview

**Status:** Active · v0.1.0  
**Last updated:** 2026-06-26

## What it is

**GarminBud** — *Talk to your Garmin data.*

An open-source MCP (Model Context Protocol) server that exposes Garmin Connect fitness data as tools for Claude, Cursor, and other AI agents. Users query activities, sleep, heart rate, recovery, and body composition in natural language — locally, with SQLite caching and session persistence.

> Unofficial community project — not affiliated with Garmin Ltd. See [branding.md](./branding.md).

## Repository

| | |
|---|---|
| **Product** | GarminBud |
| **Package** | `garmin-bud` |
| **CLI** | `garmin-bud` |
| **Remote** | https://github.com/Zsadigzade/garmin-bud |
| **License** | MIT |
| **Node** | >= 20 (`.nvmrc`) |
| **Author** | Zsadigzade |

## Features

- 6 MCP tools for common fitness questions
- **Interactive setup wizard** — `garmin-bud setup` (credentials, auth, MCP client config)
- **Live diagnostics** — `garmin-bud check` tests all 6 tools without an MCP client
- Local-first — SQLite cache, session tokens in `.garmin/`
- Cross-platform — Windows, macOS, Linux
- MCP stdio transport — Claude Desktop, Cursor, other MCP clients
- Automatic re-auth when sessions expire
- Batched API calls (concurrency 6) to reduce rate limiting
- Graceful shutdown on SIGTERM/SIGINT
- 26 tests — auth, cache, helpers, recovery scoring, integration, MCP config

## Onboarding (recommended)

```bash
npm install
npm run build
garmin-bud setup
```

The wizard:

1. Prompts for Garmin Connect email/password (password masked)
2. Writes `.env` and authenticates
3. Detects Cursor and Claude Desktop
4. Merges `garmin-bud` into the chosen MCP config(s)
5. Optionally runs `garmin-bud check`

Full walkthrough: [QUICKSTART.md](../../QUICKSTART.md)

## MVP tools (6)

| Tool | Purpose |
|------|---------|
| `get_latest_activity` | Most recent workout with distance, pace, HR |
| `get_activities_range` | Activities between ISO dates |
| `get_sleep_data` | Sleep duration, stages, score |
| `get_heart_rate_trends` | Resting/max/average HR trends |
| `get_recovery_status` | Composite recovery score + recommendation |
| `get_body_composition` | Weight, body fat, muscle trends |

Sample prompts: [examples/prompts.md](../../examples/prompts.md)

## CLI commands

```bash
garmin-bud setup          # Interactive first-time setup (credentials + MCP clients)
garmin-bud check          # Live diagnostics against all 6 Garmin tools
garmin-bud start          # Start MCP server (stdio)
garmin-bud auth           # Force re-authentication
garmin-bud cache clear    # Clear cached data
garmin-bud status         # Show session and cache status
garmin-bud --version      # Print version from package.json
```

## Key constraints

- Uses unofficial [`garmin-connect`](https://www.npmjs.com/package/garmin-connect) npm package
- Email/password auth only — **MFA not supported**
- MCP stdio transport only (no HTTP/SSE yet)
- Local storage: `.garmin/session.json`, `.garmin/cache.db`, `.garmin/mcp.log`
- `better-sqlite3` is a native module — must match the Node version that launches the MCP server (see known issues below)

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GARMIN_EMAIL` | — | Garmin Connect email |
| `GARMIN_PASSWORD` | — | Garmin Connect password |
| `GARMIN_SESSION_PATH` | `.garmin/session.json` | Session token storage |
| `GARMIN_LOG_PATH` | `.garmin/mcp.log` | Log file path |
| `GARMIN_CACHE_PATH` | `.garmin/cache.db` | SQLite cache database |
| `CACHE_TTL_ACTIVITIES` | `1800` | Activity cache TTL (seconds) |
| `CACHE_TTL_SLEEP` | `7200` | Sleep cache TTL (seconds) |
| `CACHE_TTL_STATS` | `3600` | Stats cache TTL (seconds) |

## Live testing (2026-06-26)

Verified against a real Garmin Connect account (MFA off):

| Check | Result |
|-------|--------|
| `garmin-bud setup` auth | Pass |
| Cursor MCP config merge | Pass |
| `get_latest_activity` | Pass (e.g. Prague Tennis, 3.94 km) |
| `get_activities_range` | Pass after date-format fix |
| `get_sleep_data` | Pass after null-safety fix |
| `get_heart_rate_trends` | Pass after null-safety fix |
| `get_recovery_status` | Pass |
| `get_body_composition` | Pass |
| Cursor in-chat MCP | Fail — Node ABI mismatch on `better-sqlite3` |

## Known issues

| Issue | Impact | Workaround |
|-------|--------|------------|
| Cursor uses bundled Node (ABI 127) vs system Node 24 (ABI 137) | MCP server fails to start in Cursor | Rebuild `better-sqlite3` for Cursor's Node, or pin MCP `command` to a Node 20 binary |
| MFA enabled on account | Auth fails | Disable 2FA at [Garmin Security Center](https://www.garmin.com/en-US/account/security/mfa/) |
| ECG-enabled accounts | Permanent 2FA may be irreversible | Not compatible with current library |
| Credentials in MCP config `env` | Password stored in plain text in `mcp.json` | Prefer `.env` only when MCP cwd is project root; document trade-off |

## Phase 2 roadmap

- [ ] Fix Cursor Node ABI mismatch (rebuild script or `preinstall` hook)
- [ ] `garmin-bud connect cursor\|claude` — standalone MCP config command
- [ ] Publish to npm — `npx garmin-bud setup`
- [ ] VO2 max trends
- [ ] Workout comparison
- [ ] Stress levels
- [ ] Training insights
- [ ] Docker image (stdio fix applied — Dockerfile still needed)

## Related docs

- [Branding](./branding.md)
- [Architecture](./architecture.md)
- [Code audit — resolved](./code-audit-resolved.md)
- [README](../../README.md)
- [CHANGELOG](../../CHANGELOG.md)
- [CONTRIBUTING](../../CONTRIBUTING.md)
