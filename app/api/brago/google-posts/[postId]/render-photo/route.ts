import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { brandProfile, googlePost, googlePostPhoto } from "@/lib/db/schema";
import { composeProofImage } from "@/lib/brago/compose/proof-image";
import { validateOutputImage } from "@/lib/brago/compose/gates";
import { buildOverlayText } from "@/lib/brago/compose/overlay";
import {
  buildGooglePostKey,
  bufferToDataUrl,
  isR2Ready,
  uploadBuffer,
} from "@/lib/brago/r2-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

async function fetchBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1] ?? "";
    return Buffer.from(base64, "base64");
  }
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch image failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function loadBrand(userId: string): Promise<{
  logo: Buffer | null;
  businessName: string | null;
}> {
  const rows = await db
    .select()
    .from(brandProfile)
    .where(eq(brandProfile.userId, userId))
    .limit(1);
  const bp = rows[0];
  if (!bp) return { logo: null, businessName: null };
  let logo: Buffer | null = null;
  if (bp.logoUrl) {
    try {
      logo = await fetchBuffer(bp.logoUrl);
    } catch {
      logo = null;
    }
  }
  return { logo, businessName: bp.businessName ?? null };
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

  const brand = await loadBrand(access.user.id);
  const overlayText = buildOverlayText(post.serviceArea, post.serviceType);

  try {
    let composed: Buffer;
    let bestPhotoId: string | null = null;
    let usedBeforeId: string | null = null;
    let usedAfterId: string | null = null;

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
      const afterBuf = await fetchBuffer(photo.processedUrl ?? photo.originalUrl);
      composed = await composeProofImage({
        mode: "single_after",
        after: afterBuf,
        overlayText,
        watermark: brand,
      });
      bestPhotoId = photoId;
      usedAfterId = photoId;
    } else {
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
      composed = await composeProofImage({
        mode: "before_after",
        after: afterBuf,
        before: beforeBuf,
        overlayText,
        watermark: brand,
      });
      bestPhotoId = afterId;
      usedBeforeId = beforeId;
      usedAfterId = afterId;
    }

    const gate = await validateOutputImage(composed, { overlayText });
    if (!gate.ok) {
      return NextResponse.json(
        { error: "image_gate_failed", issues: gate.issues },
        { status: 422 },
      );
    }

    const key = buildGooglePostKey(
      access.user.id,
      postId,
      "final",
      `${mode === "single_after" ? "single" : "proof"}_${randomUUID()}.jpg`,
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
        bestPhotoId,
        imageMode: mode,
        beforePhotoId: usedBeforeId ?? post.beforePhotoId,
        afterPhotoId: usedAfterId ?? post.afterPhotoId,
        finalImageUrl: finalUrl,
      })
      .where(eq(googlePost.id, postId));

    return NextResponse.json({ finalUrl, mode, overlayText });
  } catch (err) {
    console.error("[brago render-photo]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render failed" },
      { status: 500 },
    );
  }
}
