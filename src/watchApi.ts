import { executeTool } from "./tools/index.js";

// SECTION: Watch API

export interface WatchRecovery {
  score: number;
  label: string;
}

export interface WatchSleep {
  hours: number;
  score: number | null;
  label: string;
}

export interface WatchActivity {
  name: string;
  distance_km: number | null;
  date: string;
}

export interface WatchStress {
  avg: number;
  label: string;
}

export interface WatchVo2Max {
  value: number;
  trend: string;
}

export interface WatchSummary {
  recovery: WatchRecovery | null;
  sleep: WatchSleep | null;
  activity: WatchActivity | null;
  stress: WatchStress | null;
  vo2max: WatchVo2Max | null;
  updated_at: string;
}

function isNoData(text: string): boolean {
  return /^No .+ found/i.test(text.trim());
}

function averageComponentScores(text: string): number | null {
  const components = [...text.matchAll(/- (?:HRV|Sleep|Stress|Resting HR):\s*(\d+)/gi)];
  if (components.length === 0) {
    return null;
  }

  const total = components.reduce((sum, match) => sum + Number.parseInt(match[1] ?? "", 10), 0);
  return Math.round(total / components.length);
}

function parseRecovery(text: string): WatchRecovery | null {
  if (isNoData(text)) {
    return null;
  }

  const headerMatch = text.match(/Recovery score:\s*(null|\d+)\/100\s*(?:\(([^)]+)\))?/i);
  if (!headerMatch) {
    return null;
  }

  const rawScore = headerMatch[1]?.toLowerCase();
  const status = headerMatch[2]?.trim().toLowerCase() ?? "";
  const score =
    rawScore === "null" || !rawScore
      ? averageComponentScores(text)
      : Number.parseInt(rawScore, 10);

  if (score === null || !Number.isFinite(score)) {
    return null;
  }

  let label = "Moderate";
  if (status === "recovered") {
    label = "Ready";
  } else if (status === "fatigued") {
    label = "Rest";
  } else if (status === "good") {
    label = "Light";
  }

  return { score, label };
}

function parseDurationHours(duration: string): number | null {
  const hourMatch = duration.match(/(\d+)h/);
  const minuteMatch = duration.match(/(\d+)m/);
  const hours = hourMatch ? Number.parseInt(hourMatch[1] ?? "", 10) : 0;
  const minutes = minuteMatch ? Number.parseInt(minuteMatch[1] ?? "", 10) : 0;

  if (!hourMatch && !minuteMatch) {
    return null;
  }

  return Math.round((hours + minutes / 60) * 10) / 10;
}

function parseSleep(text: string): WatchSleep | null {
  if (isNoData(text)) {
    return null;
  }

  const avgScoreMatch = text.match(/Average sleep score:\s*(\d+)/i);
  const nightBlocks = text.split(/\n(?=\d{4}-\d{2}-\d{2}:)/);
  const latestNight = nightBlocks.length > 1 ? nightBlocks[1] : nightBlocks[0];

  const totalSleepMatch = latestNight?.match(/Total sleep:\s*([^\n]+)/i);
  const scoreMatch = latestNight?.match(/Score:\s*(\d+)/i);

  const hours = totalSleepMatch ? parseDurationHours(totalSleepMatch[1] ?? "") : null;
  const score = scoreMatch
    ? Number.parseInt(scoreMatch[1] ?? "", 10)
    : avgScoreMatch
      ? Number.parseInt(avgScoreMatch[1] ?? "", 10)
      : null;

  if (hours === null && score === null) {
    return null;
  }

  let label = "Fair";
  const effectiveScore = score ?? 0;
  if (effectiveScore >= 80) {
    label = "Great";
  } else if (effectiveScore >= 60) {
    label = "Good";
  } else if (effectiveScore > 0 && effectiveScore < 60) {
    label = "Poor";
  }

  return {
    hours: hours ?? 0,
    score,
    label,
  };
}

function parseActivity(text: string): WatchActivity | null {
  if (isNoData(text)) {
    return null;
  }

  const nameMatch = text.match(/^Activity:\s*(.+)$/m);
  const dateMatch = text.match(/^Date:\s*(.+)$/m);
  const distanceKmMatch = text.match(/^Distance:\s*([\d.]+)\s*km/mi);
  const distanceMMatch = text.match(/^Distance:\s*([\d.]+)\s*m$/mi);

  if (!nameMatch) {
    return null;
  }

  let distanceKm: number | null = null;
  if (distanceKmMatch) {
    distanceKm = Math.round(Number.parseFloat(distanceKmMatch[1] ?? "") * 100) / 100;
  } else if (distanceMMatch) {
    distanceKm = Math.round((Number.parseFloat(distanceMMatch[1] ?? "") / 1000) * 100) / 100;
  }

  return {
    name: nameMatch[1]?.trim() ?? "Activity",
    distance_km: distanceKm,
    date: dateMatch?.[1]?.trim() ?? "",
  };
}

function stressLabel(avg: number): string {
  if (avg <= 25) {
    return "Low";
  }
  if (avg <= 50) {
    return "Medium";
  }
  return "High";
}

function parseStress(text: string): WatchStress | null {
  if (isNoData(text)) {
    return null;
  }

  const avgMatch = text.match(/Average stress:\s*(\d+)/i);
  if (!avgMatch) {
    return null;
  }

  const avg = Number.parseInt(avgMatch[1] ?? "", 10);
  return { avg, label: stressLabel(avg) };
}

function parseVo2Max(text: string): WatchVo2Max | null {
  if (isNoData(text)) {
    return null;
  }

  const currentMatch = text.match(/Current VO2 max:\s*([\d.]+)/i);
  const trendMatch = text.match(/Trend:\s*(\w+)/i);

  if (!currentMatch) {
    return null;
  }

  return {
    value: Math.round(Number.parseFloat(currentMatch[1] ?? "") * 10) / 10,
    trend: trendMatch?.[1]?.trim() ?? "stable",
  };
}

async function safeExecuteTool(name: string, args: Record<string, unknown>): Promise<string | null> {
  try {
    const result = await executeTool(name, args);
    if (isNoData(result.text)) {
      return null;
    }
    return result.text;
  } catch {
    return null;
  }
}

export async function buildWatchSummary(): Promise<WatchSummary> {
  const [recoveryText, sleepText, activityText, stressText, vo2Text] = await Promise.all([
    safeExecuteTool("get_recovery_status", {}),
    safeExecuteTool("get_sleep_data", { nights: 1 }),
    safeExecuteTool("get_latest_activity", {}),
    safeExecuteTool("get_stress_levels", { days: 7 }),
    safeExecuteTool("get_vo2_max_trends", { days: 30 }),
  ]);

  return {
    recovery: recoveryText ? parseRecovery(recoveryText) : null,
    sleep: sleepText ? parseSleep(sleepText) : null,
    activity: activityText ? parseActivity(activityText) : null,
    stress: stressText ? parseStress(stressText) : null,
    vo2max: vo2Text ? parseVo2Max(vo2Text) : null,
    updated_at: new Date().toISOString(),
  };
}
