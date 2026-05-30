import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import { uploadBuffer, buildAnonTmpKey, isR2Ready } from "@/lib/brago/r2-upload";

export const runtime = "nodejs";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!isR2Ready()) {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  const anonId = (form.get("anonId") as string | null) ?? "";
  const postId = (form.get("postId") as string | null) ?? "";

  if (!file || !anonId || !postId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: googlePost.id })
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId), gt(googlePost.createdAt, cutoff)))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "post_not_found_or_expired" }, { status: 404 });
  }

  const photoId = `gpp_${crypto.randomUUID()}`;
  const suffix = (file.name || "upload.jpg").split("/").pop() || "upload.jpg";
  const key = buildAnonTmpKey(anonId, photoId, suffix);
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadBuffer({ key, body: buffer, contentType: file.type });

  await db.insert(googlePostPhoto).values({
    id: photoId,
    googlePostId: postId,
    userId: null,
    originalUrl: url,
  });

  return NextResponse.json({ photoId, url });
}
