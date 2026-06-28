import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultEnvPath = path.join(projectRoot, ".env");

loadEnv({ path: defaultEnvPath });

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSessionPath(): string {
  return path.resolve(process.env.GARMIN_SESSION_PATH ?? ".garmin/session.json");
}

export function getProjectRoot(): string {
  return projectRoot;
}

export function getEnvFilePath(): string {
  return defaultEnvPath;
}

export function getDistIndexPath(): string {
  return path.resolve(projectRoot, "dist", "index.js");
}

export function generateMcpApiKey(): string {
  return randomBytes(32).toString("hex");
}

export function writeEnvFile(credentials: { email: string; password: string; apiKey?: string }): string {
  const envPath = getEnvFilePath();
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const existingApiKey = existing.match(/^GARMIN_MCP_API_KEY=(.+)$/m)?.[1]?.trim();
  const apiKey = credentials.apiKey ?? existingApiKey ?? generateMcpApiKey();

  const lines = [
    `GARMIN_EMAIL=${credentials.email}`,
    `GARMIN_PASSWORD=${credentials.password}`,
    `GARMIN_MCP_API_KEY=${apiKey}`,
    "GARMIN_MCP_HOST=127.0.0.1",
    "GARMIN_MCP_PORT=3847",
    "GARMIN_SESSION_PATH=.garmin/session.json",
    "GARMIN_LOG_PATH=.garmin/mcp.log",
    "GARMIN_CACHE_PATH=.garmin/cache.db",
    "CACHE_TTL_ACTIVITIES=1800",
    "CACHE_TTL_SLEEP=7200",
    "CACHE_TTL_STATS=3600",
    "# ANTHROPIC_API_KEY=sk-ant-...",
    "# GARMIN_PUBLIC_URL=https://your-tunnel.trycloudflare.com",
    "",
  ];

  fs.writeFileSync(envPath, lines.join("\n"), "utf8");
  loadEnv({ path: envPath, override: true });
  return envPath;
}

export const appConfig = {
  get garminEmail(): string {
    return process.env.GARMIN_EMAIL ?? "";
  },
  get garminPassword(): string {
    return process.env.GARMIN_PASSWORD ?? "";
  },
  get sessionPath(): string {
    return getSessionPath();
  },
  logPath: path.resolve(process.env.GARMIN_LOG_PATH ?? ".garmin/mcp.log"),
  cachePath: path.resolve(process.env.GARMIN_CACHE_PATH ?? ".garmin/cache.db"),
  cacheTtlActivities: readNumber("CACHE_TTL_ACTIVITIES", 1800),
  cacheTtlSleep: readNumber("CACHE_TTL_SLEEP", 7200),
  cacheTtlStats: readNumber("CACHE_TTL_STATS", 3600),
  get mcpHost(): string {
    return process.env.GARMIN_MCP_HOST ?? "127.0.0.1";
  },
  get mcpPort(): number {
    return readNumber("GARMIN_MCP_PORT", 3847);
  },
  get mcpApiKey(): string {
    return process.env.GARMIN_MCP_API_KEY ?? "";
  },
  get anthropicApiKey(): string {
    return process.env.ANTHROPIC_API_KEY ?? "";
  },
  get publicUrl(): string {
    const envUrl = (process.env.GARMIN_PUBLIC_URL ?? "").replace(/\/$/, "");
    if (envUrl) return envUrl;
    try {
      const setupPath = path.join(projectRoot, ".garmin", "watch-setup.json");
      const data = JSON.parse(fs.readFileSync(setupPath, "utf8")) as { serverUrl?: string };
      return (data.serverUrl ?? "").replace(/\/$/, "");
    } catch {
      return "";
    }
  },
};

export function assertMcpApiKey(): void {
  if (!appConfig.mcpApiKey) {
    throw new Error(
      'Missing GARMIN_MCP_API_KEY. Run "garmin-bud setup" or add GARMIN_MCP_API_KEY to .env before "garmin-bud serve".'
    );
  }
}

export function assertGarminCredentials(): void {
  if (!appConfig.garminEmail || !appConfig.garminPassword) {
    throw new Error(
      "Missing GARMIN_EMAIL or GARMIN_PASSWORD. Copy .env.example to .env and add your credentials."
    );
  }
}
