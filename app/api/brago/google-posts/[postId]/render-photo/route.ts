import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import { renderGoogleCrop, type CropPct } from "@/lib/brago/image-processing";
import { composeBeforeAfterProof } from "@/lib/brago/image-compose";
import {
  buildGooglePostKey,
  bufferToDataUrl,
  isR2Ready,
  uploadBuffer,
} from "@/lib/brago/r2-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CROP: CropPct = {
  xPct: 5,
  yPct: 5,
  widthPct: 90,
  heightPct: 90,
};

async function fetchBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1] ?? "";
    return Buffer.from(base64, "base64");
  }
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch image failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { postId } = await params;

  const postRow = await db
    .select()
    .from(googlePost)
    .where(
      and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id)),
    )
    .limit(1);
  const post = postRow[0];
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const mode =
    (body.mode as "single_after" | "before_after_proof" | undefined) ??
    (post.imageMode as "single_after" | "before_after_proof");
  const photoIdOverride = body.photoId as string | undefined;
  const beforeIdOverride = body.beforePhotoId as string | undefined;
  const afterIdOverride = body.afterPhotoId as string | undefined;

  try {
    if (mode === "single_after") {
      const photoId = photoIdOverride ?? post.bestPhotoId;
      if (!photoId) {
        return NextResponse.json(
          { error: "Choose an after photo before rendering." },
          { status: 400 },
        );
      }
      const photo = (
        await db
          .select()
          .from(googlePostPhoto)
          .where(
            and(
              eq(googlePostPhoto.id, photoId),
              eq(googlePostPhoto.googlePostId, postId),
            ),
          )
          .limit(1)
      )[0];
      if (!photo) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }
      const src = await fetchBuffer(photo.processedUrl ?? photo.originalUrl);
      let crop = DEFAULT_CROP;
      if (photo.cropHintJson) {
        try {
          const parsed = JSON.parse(photo.cropHintJson) as Partial<CropPct>;
          crop = {
            xPct: parsed.xPct ?? DEFAULT_CROP.xPct,
            yPct: parsed.yPct ?? DEFAULT_CROP.yPct,
            widthPct: parsed.widthPct ?? DEFAULT_CROP.widthPct,
            heightPct: parsed.heightPct ?? DEFAULT_CROP.heightPct,
          };
        } catch {
          crop = DEFAULT_CROP;
        }
      }
      const rendered = await renderGoogleCrop(src, crop, { outputEdge: 1080 });
      const key = buildGooglePostKey(
        access.user.id,
        postId,
        "final",
        `single_${randomUUID()}.jpg`,
      );
      const finalUrl = isR2Ready()
        ? await uploadBuffer({
            key,
            body: rendered,
            contentType: "image/jpeg",
          })
        : bufferToDataUrl(rendered, "image/jpeg");
      await db
        .update(googlePost)
        .set({
          bestPhotoId: photoId,
          imageMode: "single_after",
          finalImageUrl: finalUrl,
        })
        .where(eq(googlePost.id, postId));
      return NextResponse.json({ finalUrl, mode });
    }

    // before_after_proof
    const beforeId = beforeIdOverride ?? post.beforePhotoId;
    const afterId = afterIdOverride ?? post.afterPhotoId ?? post.bestPhotoId;
    if (!beforeId || !afterId) {
      return NextResponse.json(
        { error: "Need both a before and an after photo for the proof image." },
        { status: 400 },
      );
    }
    const photos = await db
      .select()
      .from(googlePostPhoto)
      .where(eq(googlePostPhoto.googlePostId, postId));
    const before = photos.find((p) => p.id === beforeId);
    const after = photos.find((p) => p.id === afterId);
    if (!before || !after) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    const [beforeBuf, afterBuf] = await Promise.all([
      fetchBuffer(before.processedUrl ?? before.originalUrl),
      fetchBuffer(after.processedUrl ?? after.originalUrl),
    ]);
    const composed = await composeBeforeAfterProof(beforeBuf, afterBuf);
    const key = buildGooglePostKey(
      access.user.id,
      postId,
      "final",
      `proof_${randomUUID()}.jpg`,
    );
    const finalUrl = isR2Ready()
      ? await uploadBuffer({
          key,
          body: composed,
          contentType: "image/jpeg",
        })
      : bufferToDataUrl(composed, "image/jpeg");

    await db
      .update(googlePost)
      .set({
        bestPhotoId: afterId,
        imageMode: "before_after_proof",
        beforePhotoId: beforeId,
        afterPhotoId: afterId,
        finalImageUrl: finalUrl,
      })
      .where(eq(googlePost.id, postId));
    return NextResponse.json({ finalUrl, mode });
  } catch (err) {
    console.error("[brago render-photo]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Render failed",
      },
      { status: 500 },
    );
  }
}
