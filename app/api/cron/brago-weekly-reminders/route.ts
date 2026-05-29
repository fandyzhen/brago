import { NextRequest, NextResponse } from "next/server";
import { runWeeklyReminders } from "@/lib/brago/reminders/cron-handler";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && auth === `Bearer ${secret}`) return true;
  // Vercel Cron sends a different header.
  if (secret && req.headers.get("x-cron-secret") === secret) return true;
  // Basic Auth fallback to match existing cron handler.
  const username = process.env.CRON_JOBS_USERNAME;
  const password = process.env.CRON_JOBS_PASSWORD;
  if (username && password) {
    const expected = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    if (auth === expected) return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runWeeklyReminders();
  return NextResponse.json({ ok: true, ...result });
}
