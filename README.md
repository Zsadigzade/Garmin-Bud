# GarminBud

**Talk to your Garmin data.**

GarminBud is an open-source MCP server that connects your Garmin Connect fitness data to Claude, Cursor, and other AI assistants. Ask about workouts, sleep, heart rate, recovery, and body composition in plain English — privately, on your machine.

> **Disclaimer:** GarminBud is an unofficial community project. It is not affiliated with, endorsed by, or sponsored by Garmin Ltd. Garmin Connect is a trademark of Garmin Ltd.

[![CI](https://github.com/Zsadigzade/garmin-bud/actions/workflows/ci.yml/badge.svg)](https://github.com/Zsadigzade/garmin-bud/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](.nvmrc)

## Try it

Once connected to your MCP client, ask things like:

- *"What did I do today?"*
- *"How's my sleep been this week?"*
- *"Am I recovered enough to train hard tomorrow?"*
- *"Is my resting heart rate trending down?"*

See [examples/prompts.md](./examples/prompts.md) for more ideas.

## Why GarminBud

- **Private** — credentials stay in your local `.env`; data is cached on your machine
- **Local-first** — SQLite cache, session tokens in `.garmin/`
- **Works everywhere** — Windows, macOS, Linux (Node.js 20+)
- **Any MCP client** — Claude Desktop, Cursor, and other stdio-compatible clients
- **Smart fetching** — batched API calls and automatic re-auth when sessions expire

## Quick start

```bash
git clone https://github.com/Zsadigzade/garmin-bud.git
cd garmin-bud
npm install
npm run build
npx garmin-bud setup
```

The setup wizard walks you through credentials, authentication, and connecting Cursor or Claude Desktop — no MCP config editing required.

Full walkthrough: [QUICKSTART.md](./QUICKSTART.md)

## Claude Code plugin (recommended)

Install as a [Claude Code plugin](https://code.claude.com/docs/en/plugins) — skills **and** MCP server in one step:

```bash
/plugin marketplace add Zsadigzade/garmin-bud
/plugin install garmin-bud@garmin-bud
```

Set credentials, then restart Claude Code:

```bash
export GARMIN_EMAIL="your@email.com"
export GARMIN_PASSWORD="yourpassword"
```

| Command | What it does |
|---------|----------------|
| `/garmin-bud:garmin-bud-setup` | First-time setup and diagnostics |
| `/garmin-bud:garmin-bud` | Ask about workouts, sleep, recovery, HR, stress, VO2 max |

Plugin files live in [`plugin/`](./plugin/). See [`plugin/README.md`](./plugin/README.md).

## Claude Code skills (in-repo)

This repo also ships project skills in [`.claude/skills/`](./.claude/skills/) for development without installing the plugin:

| Command | What it does |
|---------|----------------|
| `/garmin-bud-setup` | Install, authenticate, configure MCP, run live check |
| `/garmin-bud` | Ask about workouts, sleep, recovery, HR, stress, VO2 max |

Open the repo in **Claude Code** (`claude` in this directory) — skills load automatically.

To use skills in **every** project without the plugin, copy them to `~/.claude/skills/`.

After setup, restart your MCP client and try `/garmin-bud` with *"What did I do today?"*

## Connect to Claude Desktop

Edit `claude_desktop_config.json`:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "garmin-bud": {
      "command": "node",
      "args": ["C:/path/to/garmin-bud/dist/index.js", "start"],
      "env": {
        "GARMIN_EMAIL": "your@email.com",
        "GARMIN_PASSWORD": "yourpassword"
      }
    }
  }
}
```

After `npm link`, you can use the CLI directly:

```json
{
  "mcpServers": {
    "garmin-bud": {
      "command": "garmin-bud",
      "args": ["start"]
    }
  }
}
```

Restart your MCP client, then start asking questions.

## Tools

| Tool | What it answers |
|------|-----------------|
| `get_latest_activity` | Your most recent workout — distance, pace, HR, elevation |
| `get_activities_range` | Activities between two dates |
| `get_sleep_data` | Sleep duration, stages, score, awakenings |
| `get_heart_rate_trends` | Resting, max, and average HR over time |
| `get_recovery_status` | Recovery score from HRV, sleep, stress, resting HR |
| `get_body_composition` | Weight, body fat, and muscle mass trends |
| `get_stress_levels` | Daily stress averages and trends |
| `get_vo2_max_trends` | VO2 max fitness trends over time |
| `get_training_insights` | Combined weekly summary (activities, sleep, recovery, stress) |

## CLI

```bash
garmin-bud setup          # Interactive first-time setup (recommended)
garmin-bud serve          # Remote HTTP MCP for web AI (claude.ai, ChatGPT)
garmin-bud check          # Live diagnostics against all tools
garmin-bud start          # Start the MCP server (stdio)
garmin-bud auth           # Force re-authentication
garmin-bud cache clear    # Clear cached data
garmin-bud status         # Show session and cache status
garmin-bud --version      # Print version
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

## Security & privacy

- Credentials live only in your local `.env` file — never sent to a third party
- Session tokens in `.garmin/session.json` are as sensitive as a password
- Tool errors are sanitized before reaching the AI client
- Uses the unofficial [`garmin-connect`](https://www.npmjs.com/package/garmin-connect) npm package (not Garmin's enterprise OAuth API)
- **MFA is not supported** by the underlying library — disable MFA or use an app-specific password

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Authentication failed | Verify `.env` credentials, run `garmin-bud auth` |
| MFA enabled on account | Disable MFA or use an app-specific password |
| Stale data | Run `garmin-bud cache clear` |
| Rate limited | Wait 60 seconds; cached responses are used when available |
| No sleep/HR data | Ensure your Garmin device has synced to Garmin Connect |
| Server won't start | Check that `GARMIN_EMAIL` and `GARMIN_PASSWORD` are set in `.env` |

## Development

```bash
npm install
npm run build
npm test          # 25 tests via Node test runner
npm run lint
npm run dev       # Start with auto-reload
```

Use `.nvmrc` with nvm/fnm for Node 20. If your project path contains `#`, use `npm test` instead of `npm run test:vitest`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/VAULT.md](./docs/VAULT.md) for architecture and design notes (Obsidian vault, outside this repo).

## Roadmap

- [ ] VO2 max trends
- [ ] Workout comparison
- [ ] Stress levels
- [ ] Training insights
- [ ] Docker image

## License

MIT — see [LICENSE](./LICENSE).

Garmin Connect is a trademark of Garmin Ltd. This project is not affiliated with Garmin Ltd.
