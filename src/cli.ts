import { Command } from "commander";
import { authenticateGarmin, clearStoredSession, sessionExists } from "./garmin/auth.js";
import { closeCache, getCache } from "./garmin/cache.js";
import { resetGarminClient } from "./garmin/client.js";
import { createMcpServer } from "./server.js";
import { assertGarminCredentials, appConfig } from "./config.js";
import { configureLogger, logger } from "./utils/logger.js";
import { packageVersion } from "./version.js";
import { runSetup } from "./setup.js";
import { printLiveCheckResults, runLiveCheck } from "./check.js";

// SECTION: CLI Commands

async function runStart(): Promise<void> {
  assertGarminCredentials();
  configureLogger(appConfig.logPath);

  const server = createMcpServer();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down GarminBud server");
    await server.close();
    closeCache();
    process.exit(0);
  };

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("exit", () => {
    closeCache();
  });

  await server.start();
}

async function runAuth(): Promise<void> {
  configureLogger(appConfig.logPath);
  clearStoredSession();
  resetGarminClient();
  await authenticateGarmin(true);
  console.log("Garmin authentication successful. Session saved.");
}

function runCacheClear(): void {
  const cache = getCache();
  const removed = cache.clear();
  console.log(`Cleared ${removed} cache entries.`);
}

async function runStatus(): Promise<void> {
  const cache = getCache();
  const cacheStats = cache.stats();

  console.log("GarminBud status");
  console.log(`Session: ${sessionExists() ? "present" : "missing"}`);
  console.log(`Cache entries: ${cacheStats.entries}`);
  console.log(`Expired cache entries: ${cacheStats.expiredEntries}`);
}

async function runCheck(): Promise<void> {
  const results = await runLiveCheck();
  printLiveCheckResults(results);

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("garmin-bud")
    .description("GarminBud — MCP server for Garmin Connect fitness data")
    .version(packageVersion);

  program
    .command("start")
    .description("Start the MCP server using stdio transport")
    .action(async () => {
      try {
        await runStart();
      } catch (error) {
        logger.error({ error }, "Failed to start MCP server");
        process.exitCode = 1;
      }
    });

  program
    .command("auth")
    .description("Force Garmin re-authentication")
    .action(async () => {
      try {
        await runAuth();
      } catch (error) {
        logger.error({ error }, "Garmin authentication failed");
        console.error(error instanceof Error ? error.message : "Authentication failed");
        process.exitCode = 1;
      }
    });

  const cacheCommand = program.command("cache").description("Manage local cache");

  cacheCommand
    .command("clear")
    .description("Clear all cached Garmin data")
    .action(() => {
      try {
        runCacheClear();
      } catch (error) {
        logger.error({ error }, "Failed to clear cache");
        process.exitCode = 1;
      }
    });

  program
    .command("setup")
    .description("Interactive first-time setup — credentials, auth, and MCP client config")
    .action(async () => {
      try {
        await runSetup();
      } catch (error) {
        logger.error({ error }, "Setup failed");
        console.error(error instanceof Error ? error.message : "Setup failed");
        process.exitCode = 1;
      }
    });

  program
    .command("check")
    .description("Run live diagnostics against all GarminBud tools")
    .action(async () => {
      try {
        await runCheck();
      } catch (error) {
        logger.error({ error }, "Live check failed");
        console.error(error instanceof Error ? error.message : "Live check failed");
        process.exitCode = 1;
      }
    });

  program
    .command("status")
    .description("Show session and cache status")
    .action(async () => {
      try {
        await runStatus();
      } catch (error) {
        logger.error({ error }, "Failed to read status");
        process.exitCode = 1;
      }
    });

  return program;
}
