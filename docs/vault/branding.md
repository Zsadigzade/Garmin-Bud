# GarminBud — Branding

**Last updated:** 2026-06-26

## Identity

| Field | Value |
|-------|-------|
| **Display name** | GarminBud |
| **Tagline** | Talk to your Garmin data. |
| **One-liner** | MCP server that connects Garmin Connect to Claude, Cursor, and other AI assistants |
| **Tone** | Friendly, approachable, general audience (not dev-only) |
| **Primary onboarding** | `garmin-bud setup` — no MCP knowledge required |

## Technical identifiers

| Context | Name |
|---------|------|
| npm package | `garmin-bud` |
| CLI binary | `garmin-bud` |
| MCP server handshake | `garmin-bud` |
| Claude Desktop config key | `garmin-bud` |
| GitHub repo | `garmin-bud` |
| Local data directory | `.garmin/` (unchanged — avoids breaking existing installs) |

## Previous names (deprecated)

| Old | Replaced by |
|-----|-------------|
| Garmin MCP Server | GarminBud |
| `garmin-mcp` (npm/CLI) | `garmin-bud` |
| GitHub repo `-Garmin` | `garmin-bud` |

## Trademark disclaimer

GarminBud is an **unofficial community project**. It is not affiliated with, endorsed by, or sponsored by Garmin Ltd. Garmin Connect is a trademark of Garmin Ltd.

This disclaimer appears prominently in the README and should be kept in any public-facing material.

## GitHub repo settings (recommended)

- **Description:** Talk to your Garmin data — MCP server for Claude & Cursor
- **Topics:** `garmin`, `garmin-connect`, `mcp`, `model-context-protocol`, `claude`, `cursor`, `fitness`, `health`, `garminbud`
- **Website:** https://github.com/Zsadigzade/garmin-bud#readme

## npm metadata

```json
{
  "name": "garmin-bud",
  "description": "GarminBud — talk to your Garmin Connect data through Claude and other MCP clients",
  "repository": "github.com/Zsadigzade/garmin-bud",
  "homepage": "https://github.com/Zsadigzade/garmin-bud#readme"
}
```

## Naming rationale

- **GarminBud** — friendly "buddy" vibe; obvious Garmin connection; works for runners, gym-goers, and casual wellness users
- **`garmin-bud` slug** — matches GitHub repo; easy to remember; standard kebab-case for npm
- Kept `.garmin/` for local storage to avoid migration pain for early adopters

## Related docs

- [Project overview](./project-overview.md)
- [README](../../README.md)
