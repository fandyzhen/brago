import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/session";
import {
  getReminderSettings,
  upsertReminderSettings,
} from "@/lib/brago/reminder-settings";

export const runtime = "nodejs";

const updateSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  enabled: z.boolean().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  hour: z.number().int().min(0).max(23).optional(),
  pausedUntilIsoDate: z.string().datetime().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const row = await getReminderSettings(access.user.id);
  return NextResponse.json({ settings: row });
}

export async function PUT(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid settings" },
      { status: 400 },
    );
  }

  const id = await upsertReminderSettings(access.user.id, {
    timezone: parsed.data.timezone,
    enabled: parsed.data.enabled,
    dayOfWeek: parsed.data.dayOfWeek,
    hour: parsed.data.hour,
    pausedUntil: parsed.data.pausedUntilIsoDate
      ? new Date(parsed.data.pausedUntilIsoDate)
      : parsed.data.pausedUntilIsoDate === null
      ? null
      : undefined,
  });
  return NextResponse.json({ id });
}
