import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import { generateCaption } from "@/lib/brago/caption/generate";
import { canUserAfford, deductCredits } from "@/lib/credits";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";
import { isAiTextAvailable } from "@/lib/brago/caption/text-provider";
import { scoreOutput } from "@/lib/brago/quality/score";

export const runtime = "nodejs";

const CAPTION_CREDIT_COST = Math.max(
  0,
  Math.floor(Number(process.env.BRAGO_CAPTION_CREDIT_COST ?? "1")),
);

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
  const language: CaptionLanguage =
    (body.language as CaptionLanguage | undefined) ??
    (post.language as CaptionLanguage | undefined) ??
    "en";

  const useAi = isAiTextAvailable();
  if (useAi && CAPTION_CREDIT_COST > 0) {
    if (!(await canUserAfford(access.user.id, CAPTION_CREDIT_COST))) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 },
      );
    }
  }

  const out = await generateCaption({
    userId: access.user.id,
    googlePostId: postId,
    industry: post.industry as Industry,
    serviceType: post.serviceType,
    serviceArea: post.serviceArea,
    language,
    customInstruction:
      typeof body.customInstruction === "string"
        ? (body.customInstruction as string)
        : undefined,
  });

  if (useAi && out.source === "ai" && CAPTION_CREDIT_COST > 0) {
    await deductCredits(
      access.user.id,
      CAPTION_CREDIT_COST,
      "brago_caption_ai",
      postId,
    );
  }

  await db
    .update(googlePost)
    .set({
      caption: out.caption,
      language,
      captionPolicyJson: JSON.stringify(out.policy),
      status: "ready",
    })
    .where(eq(googlePost.id, postId));

  const quality = scoreOutput({
    caption: out.caption,
    language,
    ctx: { serviceType: post.serviceType, serviceArea: post.serviceArea },
    recentCaptions: [], // 路由层不重复查 history；scoring 仍计 must-pass
    image: {
      isAiGenerated: false,
      hasBragoWatermark: false,
      overlayText: "", // 渲染阶段才有 overlay；此处不阻塞
    },
  });

  return NextResponse.json({
    caption: out.caption,
    source: out.source,
    policy: out.policy,
    quality,
  });
}
