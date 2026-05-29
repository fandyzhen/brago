import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminderSettings } from "@/lib/db/schema";

export type ReminderSettings = typeof reminderSettings.$inferSelect;

export async function getReminderSettings(
  userId: string,
): Promise<ReminderSettings | null> {
  const rows = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export type ReminderPatch = Partial<{
  timezone: string;
  enabled: boolean;
  dayOfWeek: number;
  hour: number;
  pausedUntil: Date | null;
  lastSentAt: Date | null;
}>;

export async function upsertReminderSettings(
  userId: string,
  patch: ReminderPatch,
): Promise<string> {
  const existing = await getReminderSettings(userId);
  if (existing) {
    await db
      .update(reminderSettings)
      .set(patch)
      .where(eq(reminderSettings.id, existing.id));
    return existing.id;
  }
  const id = randomUUID();
  await db.insert(reminderSettings).values({
    id,
    userId,
    timezone: patch.timezone ?? "America/New_York",
    enabled: patch.enabled ?? true,
    dayOfWeek: patch.dayOfWeek ?? 1,
    hour: patch.hour ?? 9,
    pausedUntil: patch.pausedUntil ?? null,
    lastSentAt: patch.lastSentAt ?? null,
  });
  return id;
}
