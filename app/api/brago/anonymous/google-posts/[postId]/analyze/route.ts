import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import { getVisionProvider } from "@/lib/brago/vision/provider";
import type { Industry } from "@/lib/brago/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const body = (await req.json().catch(() => ({}))) as { anonId?: string };
  const anonId = body?.anonId;
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
  if (photos.length === 0) {
    return NextResponse.json({ error: "no_photos" }, { status: 400 });
  }

  const provider = getVisionProvider();
  let analysis;
  try {
    analysis = await provider.analyzeGooglePostPhotos({
      industry: post.industry as Industry,
      serviceType: post.serviceType,
      serviceArea: post.serviceArea,
      photos: photos.map((p) => ({ photoId: p.id, url: p.processedUrl ?? p.originalUrl })),
    });
  } catch (err) {
    console.error("[anon analyze] provider error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "vision_failed" }, { status: 502 });
  }

  // Patch photo rows (same as authenticated route)
  for (const item of analysis.photos) {
    await db
      .update(googlePostPhoto)
      .set({
        detectedRole: item.role,
        roleConfidence: Math.round(item.roleConfidence * 100),
        bestAfterScore: Math.round(item.bestAfterScore * 10),
        cropHintJson: JSON.stringify(item.cropHint),
        riskFlagsJson: JSON.stringify(item.riskFlags),
        whySelected: item.why,
      })
      .where(and(eq(googlePostPhoto.id, item.photoId), eq(googlePostPhoto.googlePostId, postId)));
  }

  await db
    .update(googlePost)
    .set({
      bestPhotoId: analysis.recommendedPhotoId ?? null,
      imageMode: analysis.proofRecommendation.mode,
      beforePhotoId: analysis.proofRecommendation.beforePhotoId ?? null,
      afterPhotoId: analysis.proofRecommendation.afterPhotoId ?? null,
      proofRecommendationJson: JSON.stringify(analysis.proofRecommendation),
    })
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)));

  return NextResponse.json({
    recommendation: {
      bestPhotoId: analysis.recommendedPhotoId ?? null,
      why: analysis.photos.find((p) => p.photoId === analysis.recommendedPhotoId)?.why ?? null,
      proofRecommendation: analysis.proofRecommendation,
    },
  });
}
