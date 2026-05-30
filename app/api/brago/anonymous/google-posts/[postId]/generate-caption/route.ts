import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import { generateCaption } from "@/lib/brago/caption/generate";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    anonId?: string;
    customContext?: string;
    serviceArea?: string | null;
    serviceType?: string;
  };
  const anonId = body?.anonId;
  const customContext = body?.customContext;
  if (!anonId) return NextResponse.json({ error: "missing_anon_id" }, { status: 400 });

  const postRows = await db
    .select()
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)))
    .limit(1);
  const post = postRows[0];
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Persist the late-arriving fields (location + tighter serviceType) before generating
  const updates: { serviceArea?: string | null; serviceType?: string } = {};
  if (body.serviceArea !== undefined) updates.serviceArea = body.serviceArea || null;
  if (body.serviceType && body.serviceType !== post.serviceType) updates.serviceType = body.serviceType;
  if (Object.keys(updates).length) {
    await db
      .update(googlePost)
      .set(updates)
      .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)));
  }
  const effectiveServiceArea = updates.serviceArea !== undefined ? updates.serviceArea : post.serviceArea;
  const effectiveServiceType = updates.serviceType ?? post.serviceType;

  let out;
  try {
    out = await generateCaption({
      userId: "anon",
      googlePostId: postId,
      industry: post.industry as Industry,
      serviceType: effectiveServiceType,
      serviceArea: effectiveServiceArea,
      language: post.language as CaptionLanguage,
      customInstruction: customContext || undefined,
    });
  } catch (err) {
    console.error("[anon caption] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "caption_failed" }, { status: 502 });
  }

  await db
    .update(googlePost)
    .set({
      caption: out.caption,
      captionPolicyJson: JSON.stringify(out.policy),
      status: "ready",
    })
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)));

  return NextResponse.json({ caption: out.caption, policy: out.policy, source: out.source });
}
