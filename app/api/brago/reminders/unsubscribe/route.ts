import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminderSettings, user } from "@/lib/db/schema";

export const runtime = "nodejs";

async function ensureUser(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return !!rows[0];
}

async function ensureSettingsRow(userId: string) {
  const existing = await db
    .select({ id: reminderSettings.id })
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await db.insert(reminderSettings).values({ id, userId });
  return id;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const userId = typeof body.userId === "string" ? body.userId : undefined;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (!(await ensureUser(userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await ensureSettingsRow(userId);
  await db
    .update(reminderSettings)
    .set({ enabled: false })
    .where(eq(reminderSettings.userId, userId));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const userId = typeof body.userId === "string" ? body.userId : undefined;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (!(await ensureUser(userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await ensureSettingsRow(userId);
  const until = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
  await db
    .update(reminderSettings)
    .set({ pausedUntil: until })
    .where(eq(reminderSettings.userId, userId));
  return NextResponse.json({ ok: true, pausedUntil: until.toISOString() });
}
