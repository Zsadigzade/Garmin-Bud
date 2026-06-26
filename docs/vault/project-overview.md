# garmin-mcp — Project Overview

**Status:** Active · v0.1.0 (post-audit hardening applied)  
**Last updated:** 2026-06-26

## What it is

Open-source MCP (Model Context Protocol) server that exposes Garmin Connect fitness data as tools for Claude and other AI agents. Users query activities, sleep, heart rate, recovery, and body composition in natural language — locally, with SQLite caching and session persistence.

## Repository

- **Package:** `garmin-mcp`
- **Remote:** https://github.com/Zsadigzade/-Garmin.git
- **License:** MIT
- **Node:** >= 20 (see `.nvmrc`)

## MVP tools (6)

| Tool | Purpose |
|------|---------|
| `get_latest_activity` | Most recent workout with distance, pace, HR |
| `get_activities_range` | Activities between ISO dates |
| `get_sleep_data` | Sleep duration, stages, score |
| `get_heart_rate_trends` | Resting/max/average HR trends |
| `get_recovery_status` | Composite recovery score + recommendation |
| `get_body_composition` | Weight, body fat, muscle trends |

## Key constraints

- Uses unofficial [`garmin-connect`](https://www.npmjs.com/package/garmin-connect) npm package
- Email/password auth only — **MFA not supported**
- MCP stdio transport (Claude Desktop compatible)
- Local storage: `.garmin/session.json`, `.garmin/cache.db`, `.garmin/mcp.log`

## Phase 2 roadmap (not yet implemented)

- VO2 max trends
- Workout comparison
- Stress levels
- Training insights
- Docker image (stdio fix applied — Dockerfile still needed)

## Related docs

- [Architecture](./architecture.md)
- [Code audit — resolved](./code-audit-resolved.md)
- [README](../../README.md)
- [CHANGELOG](../../CHANGELOG.md)
