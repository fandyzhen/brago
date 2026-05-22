import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generationHistory } from "@/lib/db/schema";
import { getTemplateById } from "@/lib/poster-templates/public-metadata";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw, MAX_LIMIT);
  const cursor = searchParams.get("cursor"); // ISO timestamp

  if (cursor && isNaN(new Date(cursor).getTime())) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  try {
    const where = and(
      eq(generationHistory.userId, access.user.id),
      eq(generationHistory.type, "poster"),
      cursor ? lt(generationHistory.createdAt, new Date(cursor)) : undefined
    );

    const rows = await db
      .select()
      .from(generationHistory)
      .where(where)
      .orderBy(desc(generationHistory.createdAt))
      .limit(limit + 1); // fetch one extra to determine hasMore

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    const mapped = items.map((row) => {
      let meta: { templateId?: string; headline?: string } = {};
      try {
        meta = row.metadata ? (JSON.parse(row.metadata) as typeof meta) : {};
      } catch {
        // ignore JSON parse errors; fall back to prompt field
      }
      const template = meta.templateId ? getTemplateById(meta.templateId) : undefined;
      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        headline: meta.headline ?? row.prompt,
        templateId: meta.templateId ?? null,
        templateName: template?.name ?? null,
        resultUrl: row.resultUrl,
        creditsUsed: row.creditsUsed,
      };
    });

    const nextCursor =
      hasMore && mapped.length > 0
        ? mapped[mapped.length - 1]!.createdAt
        : null;

    return NextResponse.json({ items: mapped, nextCursor, hasMore });
  } catch (err) {
    console.error("[posters/history GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
