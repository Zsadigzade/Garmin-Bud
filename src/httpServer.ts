import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { closeCache } from "./garmin/cache.js";
import { assertGarminCredentials, assertMcpApiKey, appConfig } from "./config.js";
import { createMcpServerInstance } from "./server.js";
import { configureLogger, logger } from "./utils/logger.js";
import { buildWatchSummary, type WatchSummary } from "./watchApi.js";

// SECTION: HTTP MCP Server

const MAX_BODY_BYTES = 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const WATCH_API_CACHE_TTL_MS = 5 * 60_000;

const requestLog = new Map<string, { count: number; windowStart: number }>();
let watchApiCache: { summary: WatchSummary; expiresAt: number } | null = null;

export interface HttpMcpServer {
  start: () => Promise<void>;
  close: () => Promise<void>;
}

function getClientKey(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(clientKey);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestLog.set(clientKey, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isAuthorized(req: IncomingMessage): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 && token === appConfig.mcpApiKey;
}

async function getCachedWatchSummary(): Promise<WatchSummary> {
  const now = Date.now();
  if (watchApiCache && now < watchApiCache.expiresAt) {
    return watchApiCache.summary;
  }

  const summary = await buildWatchSummary();
  watchApiCache = {
    summary,
    expiresAt: now + WATCH_API_CACHE_TTL_MS,
  };
  return summary;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;

    if (total > MAX_BODY_BYTES) {
      throw new Error("Request body too large");
    }

    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return undefined;
  }

  return JSON.parse(raw) as unknown;
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isAuthorized(req)) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="garmin-bud"');
    sendJson(res, 401, {
      error: "Unauthorized",
      message: "Missing or invalid Authorization: Bearer token.",
    });
    return;
  }

  const clientKey = getClientKey(req);
  if (isRateLimited(clientKey)) {
    sendJson(res, 429, {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Try again in a minute.",
    });
    return;
  }

  const server = createMcpServerInstance();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);

    const parsedBody = req.method === "POST" ? await readJsonBody(req) : undefined;
    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    logger.error({ error }, "HTTP MCP request failed");

    if (!res.headersSent) {
      sendJson(res, 500, {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  } finally {
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  }
}

export function createHttpMcpServer(): HttpMcpServer {
  let httpServer: http.Server | null = null;

  return {
    async start(): Promise<void> {
      assertGarminCredentials();
      assertMcpApiKey();
      configureLogger(appConfig.logPath);

      httpServer = http.createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const pathname = normalizePathname(url.pathname);

        if (pathname === "/" || pathname === "") {
          sendJson(res, 200, {
            service: "garmin-bud",
            endpoints: {
              health: "/health",
              watch: "/api/watch",
              mcp: "/mcp",
            },
            message: "Use GET /api/watch with Authorization: Bearer token for the watch widget.",
          });
          return;
        }

        if (pathname === "/health") {
          sendJson(res, 200, { status: "ok", service: "garmin-bud" });
          return;
        }

        if (pathname === "/api/watch") {
          if (req.method !== "GET") {
            sendJson(res, 405, { error: "Method Not Allowed", message: "Use GET for /api/watch." });
            return;
          }

          if (!isAuthorized(req)) {
            res.setHeader("WWW-Authenticate", 'Bearer realm="garmin-bud"');
            sendJson(res, 401, {
              error: "Unauthorized",
              message: "Missing or invalid Authorization: Bearer token.",
            });
            return;
          }

          try {
            const summary = await getCachedWatchSummary();
            sendJson(res, 200, summary);
          } catch (error) {
            logger.error({ error }, "Watch API request failed");
            sendJson(res, 500, {
              error: "Internal Server Error",
              message: "Failed to build watch summary.",
            });
          }
          return;
        }

        if (pathname === "/mcp") {
          if (req.method !== "POST") {
            sendJson(res, 405, {
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: "Method not allowed. Use POST for MCP requests.",
              },
              id: null,
            });
            return;
          }

          await handleMcpRequest(req, res);
          return;
        }

        sendJson(res, 404, { error: "Not Found" });
      });

      await new Promise<void>((resolve, reject) => {
        httpServer!.listen(appConfig.mcpPort, appConfig.mcpHost, (error?: Error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      logger.info(
        { host: appConfig.mcpHost, port: appConfig.mcpPort },
        "GarminBud HTTP MCP server listening"
      );
    },
    async close(): Promise<void> {
      if (!httpServer) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        httpServer!.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      httpServer = null;
      watchApiCache = null;
      closeCache();
    },
  };
}

export function getRemoteConnectorInstructions(publicUrl: string): string {
  return [
    "Remote MCP connector setup:",
    "",
    `1. Start the server: garmin-bud serve`,
    `2. Expose HTTPS (e.g. Cloudflare Tunnel): cloudflared tunnel --url http://127.0.0.1:${appConfig.mcpPort}`,
    `3. Use your public URL + /mcp as the connector endpoint`,
    "",
    "Claude.ai:",
    "- Settings → Connectors → Add custom connector",
    `- URL: ${publicUrl.replace(/\/$/, "")}/mcp`,
    "- Authentication: Bearer token (your GARMIN_MCP_API_KEY from .env)",
    "",
    "ChatGPT (Developer Mode):",
    "- Settings → Connectors → create MCP connector",
    `- Server URL: ${publicUrl.replace(/\/$/, "")}/mcp`,
    "- Auth: Bearer token with GARMIN_MCP_API_KEY",
    "- Note: ChatGPT MCP auth behavior may differ; test after Claude.ai works",
    "",
    `Health check: ${publicUrl.replace(/\/$/, "")}/health`,
  ].join("\n");
}
