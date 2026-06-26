# Garmin MCP Server

Open-source MCP (Model Context Protocol) server that exposes your Garmin Connect fitness data as tools for Claude and other AI agents.

Query activities, sleep, heart rate, recovery, and body composition in natural language — locally, with caching and session persistence.

## Features

- **6 MVP tools** for common fitness questions
- **Local-first** — SQLite cache, session tokens stored in `.garmin/`
- **Cross-platform** — Windows, macOS, Linux (Node.js 20+)
- **MCP stdio transport** — works with Claude Desktop and other MCP clients
- **Automatic re-auth** — retries login when session expires
- **Batched API calls** — concurrency-limited fetches to reduce rate limiting
- **Graceful shutdown** — clean exit on SIGTERM/SIGINT with cache checkpoint
- **22 tests** — auth, cache, helpers, recovery scoring, integration

## Documentation

- [Quickstart](./QUICKSTART.md) — 5-minute setup
- [Project vault](./docs/vault/project-overview.md) — architecture, audit log, decisions
- [Example prompts](./examples/prompts.md)

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide.

```bash
git clone <your-repo-url> garmin-mcp
cd garmin-mcp
npm install
cp .env.example .env
# Edit .env with your Garmin Connect email and password
npm run build
npm run start
```

## MCP Client Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "garmin": {
      "command": "node",
      "args": ["/absolute/path/to/garmin-mcp/dist/index.js", "start"],
      "env": {
        "GARMIN_EMAIL": "your@email.com",
        "GARMIN_PASSWORD": "yourpassword"
      }
    }
  }
}
```

Or use the CLI binary after `npm link`:

```json
{
  "mcpServers": {
    "garmin": {
      "command": "garmin-mcp",
      "args": ["start"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `get_latest_activity` | Most recent activity with distance, pace, HR, elevation |
| `get_activities_range` | Activities between two ISO dates |
| `get_sleep_data` | Sleep duration, stages, score, interruptions |
| `get_heart_rate_trends` | Resting/max/average HR trends |
| `get_recovery_status` | Composite recovery score from HRV, sleep, stress, resting HR |
| `get_body_composition` | Weight, body fat, muscle mass trends |

See [examples/prompts.md](./examples/prompts.md) for sample questions.

## CLI

```bash
garmin-mcp start          # Start MCP server (stdio)
garmin-mcp auth           # Force re-authentication
garmin-mcp cache clear    # Clear cached data
garmin-mcp status         # Show session and cache status
```

## Configuration

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

## Development

```bash
npm install
npm run build
npm test
npm run lint
npm run dev
```

### Testing note

If your project path contains a `#` character, use `npm test` (Node test runner). Vitest may fail due to Vite path parsing — use `npm run test:vitest` only from paths without `#`.

Use `.nvmrc` with nvm/fnm to auto-select Node 20.

### Publishing

Push a version tag to trigger npm publish and GitHub Release (requires `NPM_TOKEN` secret):

```bash
git tag v0.1.1
git push origin v0.1.1
```

## Architecture

```
Claude → MCP Server → Tool Registry → Cache (SQLite) → Garmin Client → Garmin Connect
                                              ↓ miss
                                        Session Auth (.garmin/session.json)
```

## Authentication

This project uses the unofficial [`garmin-connect`](https://www.npmjs.com/package/garmin-connect) npm package with email/password authentication. Garmin's official OAuth API requires enterprise business registration.

**Important:**
- Credentials stay in your local `.env` file
- Session tokens are stored in `.garmin/session.json` — treat like a password
- MFA is not yet supported by the underlying library

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Authentication failed | Verify `.env` credentials, run `garmin-mcp auth` |
| MFA enabled on account | Disable MFA or use an app-specific password if available |
| Stale data | Run `garmin-mcp cache clear` |
| Rate limited | Wait 60 seconds; cached responses are returned when available |
| No sleep/HR data | Ensure your Garmin device has synced to Garmin Connect |

## License

MIT

## Roadmap (Phase 2)

- VO2 max trends
- Workout comparison
- Stress levels
- Training insights
- Docker image
