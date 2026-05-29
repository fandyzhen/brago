import "server-only";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { googlePost, reminderSettings, user } from "@/lib/db/schema";
import { WeeklyReminderEmail } from "./email-template";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Brago <noreply@brago.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://brago.app";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type CronResult = {
  sent: number;
  skipped: number;
  failures: number;
  reason?: string;
};

export async function runWeeklyReminders(
  now: Date = new Date(),
): Promise<CronResult> {
  let sent = 0;
  let skipped = 0;
  let failures = 0;

  if (!RESEND_API_KEY) {
    console.warn(
      "[brago weekly reminders] RESEND_API_KEY not configured — noop",
    );
    return { sent, skipped, failures, reason: "resend_not_configured" };
  }

  const resend = new Resend(RESEND_API_KEY);
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  const candidates = await db
    .select({
      settings: reminderSettings,
      user: user,
    })
    .from(reminderSettings)
    .innerJoin(user, eq(user.id, reminderSettings.userId))
    .where(
      and(
        eq(reminderSettings.enabled, true),
        or(
          isNull(reminderSettings.pausedUntil),
          lt(reminderSettings.pausedUntil, now),
        ),
        or(
          isNull(reminderSettings.lastSentAt),
          lt(reminderSettings.lastSentAt, sevenDaysAgo),
        ),
      ),
    );

  for (const row of candidates) {
    try {
      const recent = await db
        .select({ id: googlePost.id, createdAt: googlePost.createdAt })
        .from(googlePost)
        .where(eq(googlePost.userId, row.user.id))
        .orderBy(desc(googlePost.createdAt))
        .limit(1);
      const last = recent[0]?.createdAt;
      const hasFreshPost =
        last && now.getTime() - last.getTime() <= SEVEN_DAYS_MS;
      if (hasFreshPost) {
        skipped++;
        continue;
      }

      const unsubUrl = `${APP_URL}/reminders/unsubscribe?u=${encodeURIComponent(row.user.id)}`;
      const manageUrl = `${APP_URL}/settings/reminders`;
      const html = await render(
        WeeklyReminderEmail({
          appUrl: APP_URL,
          manageUrl,
          unsubscribeUrl: unsubUrl,
          firstName: row.user.name?.split(" ")[0] ?? undefined,
        }),
      );

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: row.user.email,
        subject: "You have not posted to Google this week",
        html,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
        },
      });

      await db
        .update(reminderSettings)
        .set({ lastSentAt: now })
        .where(eq(reminderSettings.userId, row.user.id));
      sent++;
    } catch (err) {
      console.error("[brago weekly reminders] failed", err);
      failures++;
    }
  }
  return { sent, skipped, failures };
}
