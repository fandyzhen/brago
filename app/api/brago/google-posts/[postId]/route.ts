import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth/session";
import {
  getGooglePostById,
  getGooglePostPhotos,
} from "@/lib/brago/google-posts";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { postId } = await params;
  const post = await getGooglePostById(postId, access.user.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const photos = await getGooglePostPhotos(postId);
  return NextResponse.json({ post, photos });
}
