# GarminBud — Claude Code plugin

Installs skills + MCP server for Garmin Connect fitness data.

## Install

```bash
/plugin marketplace add Zsadigzade/garmin-bud
/plugin install garmin-bud@garmin-bud
```

Or from a local clone:

```bash
/plugin marketplace add /path/to/garmin-bud
/plugin install garmin-bud@garmin-bud
```

## Credentials

Set before enabling the plugin:

```bash
export GARMIN_EMAIL="your@email.com"
export GARMIN_PASSWORD="yourpassword"
```

Garmin Connect **MFA must be disabled**.

## Slash commands

| Command | Purpose |
|---------|---------|
| `/garmin-bud:garmin-bud-setup` | First-time setup and diagnostics |
| `/garmin-bud:garmin-bud` | Ask about workouts, sleep, recovery, etc. |

## MCP

The plugin starts the MCP server via the `garmin-bud` CLI. Install it once:

```bash
npm install -g garmin-bud          # after npm publish
# or from source:
git clone https://github.com/Zsadigzade/garmin-bud.git
cd garmin-bud && npm install && npm run build && npm link
```

Then restart Claude Code.

## Unofficial disclaimer

Not affiliated with Garmin Ltd. Uses unofficial Garmin Connect APIs.
