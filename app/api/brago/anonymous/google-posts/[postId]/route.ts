import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const anonId = req.nextUrl.searchParams.get("anonId");
  if (!anonId) return NextResponse.json({ error: "missing_anon_id" }, { status: 400 });

  const postRows = await db
    .select()
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)))
    .limit(1);
  const post = postRows[0];
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const photos = await db
    .select()
    .from(googlePostPhoto)
    .where(eq(googlePostPhoto.googlePostId, postId));

  return NextResponse.json({ post, photos });
}
