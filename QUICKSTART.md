# Quickstart (5 minutes)

Get Garmin MCP running locally and connected to Claude.

## 1. Prerequisites

- Node.js 20 or newer
- A Garmin Connect account with synced device data
- Garmin Connect **MFA disabled** (the underlying library does not support MFA yet)

## 2. Install

```bash
git clone <your-repo-url> garmin-mcp
cd garmin-mcp
npm install
```

## 3. Configure credentials

```bash
cp .env.example .env
```

Edit `.env`:

```env
GARMIN_EMAIL=your@email.com
GARMIN_PASSWORD=yourpassword
```

## 4. Build and authenticate

```bash
npm run build
npx garmin-mcp auth
```

You should see: `Garmin authentication successful. Session saved.`

## 5. Start the MCP server

```bash
npm run start
```

For development with auto-reload:

```bash
npm run dev
```

## 6. Connect to Claude Desktop

Edit your Claude Desktop MCP config:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "garmin": {
      "command": "node",
      "args": ["C:/path/to/garmin-mcp/dist/index.js", "start"],
      "env": {
        "GARMIN_EMAIL": "your@email.com",
        "GARMIN_PASSWORD": "yourpassword"
      }
    }
  }
}
```

Restart Claude Desktop.

## 7. Test it

Ask Claude:

- "What did I do today?"
- "How's my sleep been this week?"
- "Am I recovered enough to train hard?"

## Useful commands

```bash
garmin-mcp status        # Check session + cache
garmin-mcp cache clear   # Force fresh data fetch
garmin-mcp auth          # Re-login if session expired
```

## Next steps

- Read [README.md](./README.md) for full API reference
- Try prompts from [examples/prompts.md](./examples/prompts.md)
- Review [docs/vault/](./docs/vault/project-overview.md) for architecture and audit notes
