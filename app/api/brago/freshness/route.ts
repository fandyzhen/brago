import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import {
  computeStreakDays,
  freshnessLabel,
  freshnessStatus,
} from "@/lib/brago/reminders/freshness";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const rows = await db
    .select({
      createdAt: googlePost.createdAt,
      postedAt: googlePost.postedAt,
    })
    .from(googlePost)
    .where(eq(googlePost.userId, access.user.id))
    .orderBy(desc(googlePost.createdAt))
    .limit(60);

  const dates = rows.map((r) => r.postedAt ?? r.createdAt);
  const lastPostAt = dates[0] ?? null;
  const streakDays = computeStreakDays(dates);
  return NextResponse.json({
    lastPostAt: lastPostAt ? lastPostAt.toISOString() : null,
    streakDays,
    status: freshnessStatus(lastPostAt),
    label: freshnessLabel(lastPostAt),
  });
}
