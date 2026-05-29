import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  captionHistory,
  googlePost,
  googlePostPhoto,
  uploadConsent,
} from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { postId } = await params;

  const owner = await db
    .select({ id: googlePost.id })
    .from(googlePost)
    .where(
      and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id)),
    )
    .limit(1);
  if (!owner[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(googlePostPhoto)
      .where(eq(googlePostPhoto.googlePostId, postId));
    await tx
      .delete(captionHistory)
      .where(
        and(
          eq(captionHistory.googlePostId, postId),
          eq(captionHistory.userId, access.user.id),
        ),
      );
    await tx
      .delete(uploadConsent)
      .where(
        and(
          eq(uploadConsent.googlePostId, postId),
          eq(uploadConsent.userId, access.user.id),
        ),
      );
    await tx
      .delete(googlePost)
      .where(
        and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id)),
      );
  });

  return NextResponse.json({ ok: true });
}
