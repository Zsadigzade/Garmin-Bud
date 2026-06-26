import { appConfig } from "../config.js";
import { buildToolCacheKey, withCache } from "../garmin/cache.js";
import { withGarminClient } from "../garmin/client.js";
import type { BodyCompositionEntry, ToolTextResult } from "../garmin/types.js";
import type { ToolDefinition } from "./types.js";
import { mapInBatches } from "../utils/batch.js";
import {
  calculateTrend,
  formatIsoDate,
  getDateRange,
} from "../utils/helpers.js";

// SECTION: Body Composition Mapping

async function fetchBodyComposition(days: number): Promise<BodyCompositionEntry[]> {
  const dates = getDateRange(days);

  const entries = await withGarminClient(async (client) => {
    const batches = await mapInBatches(dates, async (date) => {
      const weightData = await client.getDailyWeightData(date);
      return weightData.dateWeightList.map((entry) => ({
        date: entry.calendarDate || formatIsoDate(date),
        weightKg: entry.weight ?? null,
        bodyFatPercent: entry.bodyFat ?? null,
        muscleMassKg: entry.muscleMass ?? null,
        bmi: entry.bmi ?? null,
      }));
    });

    return batches.flat();
  });

  const uniqueByDate = new Map<string, BodyCompositionEntry>();
  for (const entry of entries) {
    uniqueByDate.set(entry.date, entry);
  }

  return Array.from(uniqueByDate.values()).sort((left, right) =>
    right.date.localeCompare(left.date)
  );
}

// SECTION: Tool Handler

export async function getBodyComposition(input: { days?: number }): Promise<ToolTextResult> {
  const days = input.days ?? 30;
  const cacheKey = buildToolCacheKey("get_body_composition", { days });

  const entries = await withCache(cacheKey, appConfig.cacheTtlStats, async () => {
    return fetchBodyComposition(days);
  });

  if (entries.length === 0) {
    return {
      type: "text",
      text: `No body composition data found for the last ${days} days.`,
    };
  }

  const current = entries[0];
  const baseline = entries[entries.length - 1];

  const weightTrend = calculateTrend(
    entries.map((entry) => entry.weightKg).filter((value): value is number => value !== null),
    true
  );
  const bodyFatTrend = calculateTrend(
    entries
      .map((entry) => entry.bodyFatPercent)
      .filter((value): value is number => value !== null),
    true
  );
  const muscleTrend = calculateTrend(
    entries
      .map((entry) => entry.muscleMassKg)
      .filter((value): value is number => value !== null),
    false
  );

  const weightDelta =
    current?.weightKg !== null &&
    current?.weightKg !== undefined &&
    baseline?.weightKg !== null &&
    baseline?.weightKg !== undefined
      ? current.weightKg - baseline.weightKg
      : null;

  const bodyFatDelta =
    current?.bodyFatPercent !== null &&
    current?.bodyFatPercent !== undefined &&
    baseline?.bodyFatPercent !== null &&
    baseline?.bodyFatPercent !== undefined
      ? current.bodyFatPercent - baseline.bodyFatPercent
      : null;

  const lines = entries.slice(0, 10).map((entry) => {
    return `${entry.date}: ${entry.weightKg?.toFixed(1) ?? "n/a"} kg | body fat ${entry.bodyFatPercent?.toFixed(1) ?? "n/a"}% | muscle ${entry.muscleMassKg?.toFixed(1) ?? "n/a"} kg`;
  });

  const text = [
    `Body composition over ${entries.length} recorded days:`,
    `Current weight: ${current?.weightKg?.toFixed(1) ?? "n/a"} kg`,
    `Current body fat: ${current?.bodyFatPercent?.toFixed(1) ?? "n/a"}%`,
    `Current muscle mass: ${current?.muscleMassKg?.toFixed(1) ?? "n/a"} kg`,
    `Weight change from baseline: ${weightDelta !== null ? `${weightDelta.toFixed(1)} kg` : "n/a"}`,
    `Body fat change from baseline: ${bodyFatDelta !== null ? `${bodyFatDelta.toFixed(1)}%` : "n/a"}`,
    `Weight trend: ${weightTrend}`,
    `Body fat trend: ${bodyFatTrend}`,
    `Muscle trend: ${muscleTrend}`,
    "",
    "Recent entries:",
    ...lines,
  ].join("\n");

  return {
    type: "text",
    text,
  };
}

export const bodyCompositionToolDefinitions: ToolDefinition[] = [
  {
    name: "get_body_composition",
    description: "Returns weight, body fat, and muscle mass trends over a time period.",
    inputSchema: {
      days: {
        type: "number",
        description: "Number of days to analyze. Defaults to 30.",
      },
    },
    handler: getBodyComposition,
  },
];
