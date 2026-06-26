# GarminBud Vault

Internal knowledge base for **GarminBud** — architecture, branding, audit history, and design decisions.

| Document | Description |
|----------|-------------|
| [project-overview.md](./project-overview.md) | Product summary, tools, constraints, roadmap |
| [branding.md](./branding.md) | Name, tagline, npm/CLI identifiers, disclaimer |
| [architecture.md](./architecture.md) | Data flow, source layout, design decisions |
| [code-audit-resolved.md](./code-audit-resolved.md) | Code audit resolution log + post-audit live fixes |

## External references

- [README](../../README.md) — user-facing documentation
- [QUICKSTART](../../QUICKSTART.md) — setup wizard walkthrough
- [CONTRIBUTING](../../CONTRIBUTING.md) — contribution guide
- [CHANGELOG](../../CHANGELOG.md) — release history
- [LICENSE](../../LICENSE) — MIT license
- [examples/prompts.md](../../examples/prompts.md) — sample Claude prompts

## Quick facts

| | |
|---|---|
| **Product** | GarminBud |
| **Tagline** | Talk to your Garmin data. |
| **Package / CLI** | `garmin-bud` |
| **MCP server id** | `garmin-bud` |
| **Repo** | https://github.com/Zsadigzade/garmin-bud |
| **Version** | 0.1.0 |
| **Tests** | 26 passing |
| **Recommended onboarding** | `garmin-bud setup` |
| **Live API verification** | `garmin-bud check` |

## Live testing status (2026-06-26)

First real-account test completed successfully via setup wizard:

- Auth with MFA disabled — OK
- Cursor `mcp.json` auto-configured — OK
- `garmin-bud check` — 6/6 tools passed after null-safety and date-parsing fixes
- Cursor MCP in-chat — blocked by `better-sqlite3` Node ABI mismatch (Cursor bundled Node vs system Node 24)

See [architecture.md](./architecture.md#known-remaining-gaps) for the Node version gap and workaround.
