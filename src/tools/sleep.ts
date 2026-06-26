import type { SleepData } from "../garmin/garminApiTypes.js";
import { appConfig } from "../config.js";
import { buildToolCacheKey, withCache } from "../garmin/cache.js";
import { withGarminClient } from "../garmin/client.js";
import type { SleepNightSummary, ToolTextResult } from "../garmin/types.js";
import type { ToolDefinition } from "./types.js";
import { mapInBatches } from "../utils/batch.js";
import {
  formatDuration,
  formatIsoDate,
  getDateRange,
} from "../utils/helpers.js";

// SECTION: Sleep Mapping

function mapSleepData(date: Date, sleepData: SleepData): SleepNightSummary | null {
  const dailySleep = sleepData.dailySleepDTO;

  if (!dailySleep) {
    return null;
  }

  return {
    date: formatIsoDate(date),
    totalSleepSeconds: dailySleep.sleepTimeSeconds,
    deepSleepSeconds: dailySleep.deepSleepSeconds,
    lightSleepSeconds: dailySleep.lightSleepSeconds,
    remSleepSeconds: dailySleep.remSleepSeconds,
    awakeCount: dailySleep.awakeCount,
    sleepScore: dailySleep.sleepScores?.overall?.value ?? null,
    avgSleepStress: dailySleep.avgSleepStress ?? null,
    avgOvernightHrv: sleepData.avgOvernightHrv ?? null,
    hrvStatus: sleepData.hrvStatus ?? null,
  };
}

async function fetchSleepNights(days: number): Promise<SleepNightSummary[]> {
  const dates = getDateRange(days);

  return withGarminClient(async (client) => {
    const nights = await mapInBatches(dates, async (date) => {
      try {
        const sleepData = await client.getSleepData(date);
        return mapSleepData(date, sleepData);
      } catch {
        return null;
      }
    });

    return nights.filter((night): night is SleepNightSummary => night !== null);
  });
}

function formatSleepNight(night: SleepNightSummary): string {
  return [
    `${night.date}:`,
    `  Total sleep: ${formatDuration(night.totalSleepSeconds)}`,
    `  Deep: ${formatDuration(night.deepSleepSeconds)} | Light: ${formatDuration(night.lightSleepSeconds)} | REM: ${formatDuration(night.remSleepSeconds)}`,
    `  Score: ${night.sleepScore ?? "n/a"} | Awakenings: ${night.awakeCount}`,
    `  Avg sleep stress: ${night.avgSleepStress ?? "n/a"}`,
  ].join("\n");
}

// SECTION: Tool Handler

export async function getSleepDataTool(input: { nights?: number }): Promise<ToolTextResult> {
  const nights = input.nights ?? 7;
  const cacheKey = buildToolCacheKey("get_sleep_data", { nights });

  const sleepNights = await withCache(cacheKey, appConfig.cacheTtlSleep, async () => {
    return fetchSleepNights(nights);
  });

  if (sleepNights.length === 0) {
    return {
      type: "text",
      text: `No sleep data found for the last ${nights} nights.`,
    };
  }

  const averageScoreValues = sleepNights
    .map((night) => night.sleepScore)
    .filter((score): score is number => score !== null);

  const averageScore =
    averageScoreValues.length > 0
      ? Math.round(
          averageScoreValues.reduce((sum, score) => sum + score, 0) /
            averageScoreValues.length
        )
      : null;

  const lines = [
    `Sleep summary for last ${sleepNights.length} recorded nights:`,
    averageScore !== null ? `Average sleep score: ${averageScore}` : "",
    "",
    ...sleepNights.map(formatSleepNight),
  ].filter(Boolean);

  return {
    type: "text",
    text: lines.join("\n"),
  };
}

export const sleepToolDefinitions: ToolDefinition[] = [
  {
    name: "get_sleep_data",
    description: "Returns sleep duration, quality score, stage breakdown, and interruptions for recent nights.",
    inputSchema: {
      nights: {
        type: "number",
        description: "Number of recent nights to include. Defaults to 7.",
      },
    },
    handler: getSleepDataTool,
  },
];
