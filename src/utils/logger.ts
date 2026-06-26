import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import type { Logger } from "pino";
import { appConfig } from "../config.js";

let loggerInstance: Logger | null = null;

function createStderrLogger(): Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
    },
    pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        destination: 2,
      },
    })
  );
}

function createFileLogger(logPath: string): Logger {
  const directory = path.dirname(logPath);
  fs.mkdirSync(directory, { recursive: true });

  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
    },
    pino.multistream([
      {
        stream: pino.destination({
          dest: logPath,
          sync: false,
          mkdir: true,
        }),
      },
      {
        stream: pino.transport({
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            destination: 2,
          },
        }),
      },
    ])
  );
}

function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = createStderrLogger();
  }
  return loggerInstance;
}

export function configureLogger(logPath = appConfig.logPath): void {
  loggerInstance = createFileLogger(logPath);
}

export const logger: Logger = new Proxy({} as Logger, {
  get(_target, property, receiver) {
    const instance = getLogger();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
