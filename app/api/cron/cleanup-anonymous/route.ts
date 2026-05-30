import { NextRequest, NextResponse } from "next/server";
import { lt, and, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { anonymousQuota, googlePost } from "@/lib/db/schema";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev only
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const quotaDeleted = await db
    .delete(anonymousQuota)
    .where(lt(anonymousQuota.createdAt, sevenDaysAgo))
    .returning({ id: anonymousQuota.id });

  const postDeleted = await db
    .delete(googlePost)
    .where(and(isNotNull(googlePost.anonId), isNull(googlePost.userId), lt(googlePost.createdAt, oneDayAgo)))
    .returning({ id: googlePost.id });

  return NextResponse.json({
    quotaDeleted: quotaDeleted.length,
    postDeleted: postDeleted.length,
  });
}
