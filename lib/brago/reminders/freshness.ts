export function computeStreakDays(
  dates: Array<Date | string | null | undefined>,
  now: Date = new Date(),
): number {
  const dayKeys = new Set<string>();
  for (const d of dates) {
    if (!d) continue;
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) continue;
    dayKeys.add(dt.toISOString().slice(0, 10));
  }
  if (dayKeys.size === 0) return 0;

  let count = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dayKeys.has(key)) {
      count++;
    } else if (count > 0) {
      break;
    }
  }
  return count;
}

export function freshnessLabel(
  lastPostAt: Date | string | null,
  now: Date = new Date(),
): string {
  if (!lastPostAt) {
    return "No Google post yet — upload today's job to get started.";
  }
  const dt = lastPostAt instanceof Date ? lastPostAt : new Date(lastPostAt);
  if (Number.isNaN(dt.getTime())) {
    return "No Google post yet — upload today's job to get started.";
  }
  const ms = now.getTime() - dt.getTime();
  const days = ms / (24 * 60 * 60 * 1000);
  if (days <= 7) return "Fresh this week";
  if (days <= 14) return "Last post 1+ week ago — time for a new one.";
  return "No Google post this week";
}

export type FreshnessStatus = "fresh" | "stale" | "empty";

export function freshnessStatus(
  lastPostAt: Date | string | null,
  now: Date = new Date(),
): FreshnessStatus {
  if (!lastPostAt) return "empty";
  const dt = lastPostAt instanceof Date ? lastPostAt : new Date(lastPostAt);
  if (Number.isNaN(dt.getTime())) return "empty";
  const ms = now.getTime() - dt.getTime();
  return ms <= 7 * 24 * 60 * 60 * 1000 ? "fresh" : "stale";
}
