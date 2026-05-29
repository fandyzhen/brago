import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import {
  makeThumbnail,
  standardizePhoto,
} from "@/lib/brago/image-processing";
import {
  buildGooglePostKey,
  bufferToDataUrl,
  isR2Ready,
  uploadBuffer,
} from "@/lib/brago/r2-upload";
import {
  convertHeicToJpegBuffer,
  isHeicFilename,
  isHeicMime,
} from "@/lib/brago/heic-fallback";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;

type UploadedSummary = {
  id: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  processedUrl: string | null;
  detectedRole: string | null;
};

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files: File[] = [];
  for (const value of form.values()) {
    if (value instanceof File) files.push(value);
    if (files.length >= MAX_FILES) break;
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const inserted: UploadedSummary[] = [];
  const skipped: { name: string; reason: string }[] = [];

  let sortOrder = 0;
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      skipped.push({ name: file.name, reason: "file too large" });
      continue;
    }
    const raw: Buffer = Buffer.from(await file.arrayBuffer());
    let working: Buffer = raw;
    const mime = (file.type || "image/jpeg").toLowerCase();
    if (isHeicMime(mime) || isHeicFilename(file.name)) {
      try {
        working = Buffer.from(await convertHeicToJpegBuffer(raw));
      } catch (err) {
        console.error("[brago photos upload] heic-convert failed", err);
        skipped.push({ name: file.name, reason: "heic decode failed" });
        continue;
      }
    }

    let processed: Buffer;
    let thumb: Buffer;
    try {
      processed = await standardizePhoto(working);
      thumb = await makeThumbnail(working);
    } catch (err) {
      console.error("[brago photos upload] sharp failed", err);
      skipped.push({ name: file.name, reason: "image processing failed" });
      continue;
    }

    const id = randomUUID();
    const safeSuffix = `${id}.jpg`;

    let originalUrl: string;
    let processedUrl: string;
    let thumbnailUrl: string;

    if (isR2Ready()) {
      try {
        originalUrl = await uploadBuffer({
          key: buildGooglePostKey(access.user.id, postId, "original", safeSuffix),
          body: working,
          contentType: "image/jpeg",
        });
        processedUrl = await uploadBuffer({
          key: buildGooglePostKey(access.user.id, postId, "processed", safeSuffix),
          body: processed,
          contentType: "image/jpeg",
        });
        thumbnailUrl = await uploadBuffer({
          key: buildGooglePostKey(access.user.id, postId, "thumbnail", safeSuffix),
          body: thumb,
          contentType: "image/jpeg",
        });
      } catch (err) {
        console.error(
          "[brago photos upload] R2 upload failed, falling back to data URL",
          err,
        );
        originalUrl = bufferToDataUrl(working, "image/jpeg");
        processedUrl = bufferToDataUrl(processed, "image/jpeg");
        thumbnailUrl = bufferToDataUrl(thumb, "image/jpeg");
      }
    } else {
      originalUrl = bufferToDataUrl(working, "image/jpeg");
      processedUrl = bufferToDataUrl(processed, "image/jpeg");
      thumbnailUrl = bufferToDataUrl(thumb, "image/jpeg");
    }

    await db.insert(googlePostPhoto).values({
      id,
      googlePostId: postId,
      userId: access.user.id,
      originalUrl,
      processedUrl,
      thumbnailUrl,
      originalMimeType: mime,
      sortOrder,
    });
    sortOrder += 1;

    inserted.push({
      id,
      originalUrl,
      thumbnailUrl,
      processedUrl,
      detectedRole: null,
    });
  }

  if (inserted.length === 0) {
    return NextResponse.json(
      { error: "All uploads failed", skipped },
      { status: 500 },
    );
  }

  return NextResponse.json({
    photos: inserted,
    totalAccepted: inserted.length,
    skipped,
    storage: isR2Ready() ? "r2" : "data-url",
  });
}
