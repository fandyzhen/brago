import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import {
  getVisionProvider,
  isAiVisionAvailable,
} from "@/lib/brago/vision/provider";
import type { Industry } from "@/lib/brago/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const photos = await db
    .select()
    .from(googlePostPhoto)
    .where(eq(googlePostPhoto.googlePostId, postId));
  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos to analyze" }, { status: 400 });
  }

  const provider = getVisionProvider();
  let analysis;
  try {
    analysis = await provider.analyzeGooglePostPhotos({
      industry: post.industry as Industry,
      serviceType: post.serviceType,
      serviceArea: post.serviceArea,
      photos: photos.map((p) => ({
        photoId: p.id,
        url: p.processedUrl ?? p.originalUrl,
      })),
    });
  } catch (err) {
    console.error("[brago analyze] provider error", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Vision provider failed",
      },
      { status: 502 },
    );
  }

  // Patch back into photo rows.
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
      .where(
        and(
          eq(googlePostPhoto.id, item.photoId),
          eq(googlePostPhoto.googlePostId, postId),
        ),
      );
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
    .where(
      and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id)),
    );

  return NextResponse.json({
    analysis,
    aiAvailable: isAiVisionAvailable(),
  });
}
