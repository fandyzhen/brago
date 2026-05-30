import "server-only";
import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { anonymousQuota } from "@/lib/db/schema";

// TEMP for dev/QA: 10 trials/day per IP. Launch checklist P0-4 tracks
// the switch back to "1 per week" before going live.
export const DAILY_TRIAL_LIMIT = 10;

export class TrialQuotaExceededError extends Error {
  constructor() {
    super("trial_quota_exceeded");
    this.name = "TrialQuotaExceededError";
  }
}

export function hashIp(ip: string): string {
  const salt = process.env.BETTER_AUTH_SECRET || "";
  return crypto.createHash("sha256").update(`${salt}|${ip}`).digest("hex");
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

export async function assertTrialQuota(input: {
  ipHash: string;
  anonId: string;
}): Promise<void> {
  const today = todayUtc();
  const id = crypto.randomUUID();
  const rows = await db
    .insert(anonymousQuota)
    .values({
      id,
      ipHash: input.ipHash,
      usageDate: today,
      count: 1,
      lastAnonId: input.anonId,
    })
    .onConflictDoUpdate({
      target: [anonymousQuota.ipHash, anonymousQuota.usageDate],
      set: {
        count: sql`${anonymousQuota.count} + 1`,
        lastAnonId: input.anonId,
      },
    })
    .returning({ count: anonymousQuota.count });

  const count = rows[0]?.count ?? 0;
  if (count > DAILY_TRIAL_LIMIT) {
    throw new TrialQuotaExceededError();
  }
}
