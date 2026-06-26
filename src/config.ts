import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv();

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

export const appConfig = {
  garminEmail: process.env.GARMIN_EMAIL ?? "",
  garminPassword: process.env.GARMIN_PASSWORD ?? "",
  get sessionPath(): string {
    return getSessionPath();
  },
  logPath: path.resolve(process.env.GARMIN_LOG_PATH ?? ".garmin/mcp.log"),
  cachePath: path.resolve(process.env.GARMIN_CACHE_PATH ?? ".garmin/cache.db"),
  cacheTtlActivities: readNumber("CACHE_TTL_ACTIVITIES", 1800),
  cacheTtlSleep: readNumber("CACHE_TTL_SLEEP", 7200),
  cacheTtlStats: readNumber("CACHE_TTL_STATS", 3600),
};

export function assertGarminCredentials(): void {
  if (!appConfig.garminEmail || !appConfig.garminPassword) {
    throw new Error(
      "Missing GARMIN_EMAIL or GARMIN_PASSWORD. Copy .env.example to .env and add your credentials."
    );
  }
}
