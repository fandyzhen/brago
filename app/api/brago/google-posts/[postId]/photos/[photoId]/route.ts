import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; photoId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { postId, photoId } = await params;

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

  await db
    .delete(googlePostPhoto)
    .where(
      and(
        eq(googlePostPhoto.id, photoId),
        eq(googlePostPhoto.googlePostId, postId),
      ),
    );
  return NextResponse.json({ ok: true });
}
