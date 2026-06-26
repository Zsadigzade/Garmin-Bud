import { appConfig } from "../config.js";
import { buildToolCacheKey, withCache } from "../garmin/cache.js";
import { withGarminClient } from "../garmin/client.js";
import type { HeartRateDaySummary, ToolTextResult } from "../garmin/types.js";
import type { ToolDefinition } from "./types.js";
import { mapInBatches } from "../utils/batch.js";
import {
  average,
  calculateTrend,
  formatIsoDate,
  getDateRange,
} from "../utils/helpers.js";

// SECTION: Heart Rate Mapping

async function fetchHeartRateDays(days: number): Promise<HeartRateDaySummary[]> {
  const dates = getDateRange(days);

  return withGarminClient(async (client) => {
    const summaries = await mapInBatches(dates, async (date) => {
      try {
        const heartRate = await client.getHeartRate(date);
        if (!heartRate) {
          return null;
        }

        const samples = (heartRate.heartRateValues ?? [])
          .flat()
          .filter((entry): entry is { heartrate: number } => entry != null)
          .map((entry) => entry.heartrate);
        const averageHeartRate = samples.length > 0 ? average(samples) : null;

        if (heartRate.restingHeartRate == null && averageHeartRate == null) {
          return null;
        }

        return {
          date: formatIsoDate(date),
          restingHeartRate: heartRate.restingHeartRate ?? null,
          maxHeartRate: heartRate.maxHeartRate ?? null,
          minHeartRate: heartRate.minHeartRate ?? null,
          averageHeartRate,
        };
      } catch {
        return null;
      }
    });

    return summaries.filter((summary): summary is HeartRateDaySummary => summary !== null);
  });
}

// SECTION: Tool Handler

export async function getHeartRateTrends(input: { days?: number }): Promise<ToolTextResult> {
  const days = input.days ?? 30;
  const cacheKey = buildToolCacheKey("get_heart_rate_trends", { days });

  const summaries = await withCache(cacheKey, appConfig.cacheTtlStats, async () => {
    return fetchHeartRateDays(days);
  });

  if (summaries.length === 0) {
    return {
      type: "text",
      text: `No heart rate data found for the last ${days} days.`,
    };
  }

  const restingValues = summaries
    .map((summary) => summary.restingHeartRate)
    .filter((value): value is number => value !== null);

  const trend = calculateTrend(restingValues, true);
  const currentResting = restingValues[0] ?? null;
  const baselineResting = average(restingValues);

  const recentLines = summaries.slice(0, 7).map((summary) => {
    return `${summary.date}: resting ${summary.restingHeartRate ?? "n/a"} bpm, max ${summary.maxHeartRate ?? "n/a"} bpm`;
  });

  const text = [
    `Heart rate trends over ${summaries.length} days:`,
    `Current resting HR: ${currentResting ?? "n/a"} bpm`,
    `Average resting HR: ${Math.round(baselineResting)} bpm`,
    `Trend: ${trend}`,
    "",
    "Recent days:",
    ...recentLines,
  ].join("\n");

  return {
    type: "text",
    text,
  };
}

export const heartRateToolDefinitions: ToolDefinition[] = [
  {
    name: "get_heart_rate_trends",
    description: "Returns resting, max, and average heart rate trends over a time period.",
    inputSchema: {
      days: {
        type: "number",
        description: "Number of days to analyze. Defaults to 30.",
      },
    },
    handler: getHeartRateTrends,
  },
];
