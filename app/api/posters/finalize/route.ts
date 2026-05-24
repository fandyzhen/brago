import { readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import satori from "satori";
import sharp from "sharp";
import { db } from "@/lib/db";
import { post, generationHistory } from "@/lib/db/schema";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { getTemplateById } from "@/lib/poster-templates/public-metadata";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";
import { getActiveSessionUser } from "@/lib/auth/session";
import {
  canUserAfford,
  deductCredits,
  getUserCredits,
  getUserPlanKey,
  refundCredits,
} from "@/lib/credits";
import { applyWatermark } from "@/lib/server/watermark";
import { getBatch, markIndexUsed } from "@/lib/server/poster-preview-cache";

const FINALIZE_COST = 10;
const FULL_SIZE = 1080;

let _fonts: { name: string; data: Buffer; weight: 400; style: "normal" }[] | null = null;
function getFonts() {
  if (!_fonts) {
    const inter = readFileSync(path.join(process.cwd(), "public/fonts/inter-regular.woff"));
    const mono = readFileSync(path.join(process.cwd(), "public/fonts/jetbrains-mono-regular.woff"));
    _fonts = [
      { name: "Inter", data: inter, weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
    ];
  }
  return _fonts;
}

type FinalizeBody = { batchId?: unknown; index?: unknown };

export async function POST(request: Request): Promise<Response> {
  const access = await getActiveSessionUser(request.headers);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;

  let body: FinalizeBody;
  try {
    body = (await request.json()) as FinalizeBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const batchId = typeof body.batchId === "string" ? body.batchId : null;
  const index = typeof body.index === "number" ? body.index : -1;
  if (!batchId) return Response.json({ error: "Missing batchId" }, { status: 400 });

  const entry = getBatch(batchId);
  if (!entry) {
    return Response.json({ error: "Preview expired, please regenerate" }, { status: 410 });
  }
  if (entry.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (index < 0 || index >= entry.items.length) {
    return Response.json({ error: "Index out of range" }, { status: 400 });
  }

  // Cache hit: same (batchId, index) already finalized → return cached dataURL, NO charge / NO write.
  if (entry.usedIndices.has(index)) {
    const cached = entry.downloadedDataUrls.get(index);
    if (cached) {
      return Response.json({
        url: cached,
        charged: 0,
        cachedHit: true,
        remainingCredits: await getUserCredits(userId),
      });
    }
  }

  const aiEnabled = process.env.ENABLE_AI_FINALIZE === "true";
  let charged = 0;

  if (aiEnabled) {
    if (!(await canUserAfford(userId, FINALIZE_COST))) {
      return Response.json(
        {
          error: "Insufficient credits",
          required: FINALIZE_COST,
          available: await getUserCredits(userId),
        },
        { status: 402 }
      );
    }
    const dr = await deductCredits(userId, FINALIZE_COST, "poster_ai_finalize");
    if (!dr.success) {
      return Response.json({ error: "Failed to deduct credits" }, { status: 500 });
    }
    charged = FINALIZE_COST;
    // P1-5: insert doubao i2i call here.
    // Spec § 12: when ENABLE_AI_FINALIZE flips on, this is where you replace afterDataUrl
    // with the AI-enhanced version before passing to satori.
  }

  const item = entry.items[index];
  const renderer = getRenderer(item.templateId);
  const meta = getTemplateById(item.templateId);
  if (!renderer || !meta) {
    if (charged > 0) await refundCredits(userId, charged, "poster_ai_finalize_refund");
    return Response.json({ error: "Unknown templateId" }, { status: 500 });
  }

  try {
    const renderInput: RenderInput = {
      beforeImageDataUrl: entry.beforeDataUrl,
      afterImageDataUrl: entry.afterDataUrl,
      templateId: item.templateId,
      headline: entry.headline,
      businessName: entry.brandFields.businessName,
      phone: entry.brandFields.phone,
      serviceArea: entry.brandFields.serviceArea,
      isLicensed: entry.brandFields.isLicensed,
      isInsured: entry.brandFields.isInsured,
      googleReviewCount: entry.brandFields.googleReviewCount,
    };
    const element = renderer(renderInput);
    const svg = await satori(element, { width: FULL_SIZE, height: FULL_SIZE, fonts: getFonts() });
    const fullBuffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 6 }).toBuffer();
    const planKey = await getUserPlanKey(userId);
    const isFree = !planKey || planKey === "free";
    const finalBuffer = isFree ? await applyWatermark(fullBuffer) : fullBuffer;
    const dataUrl = `data:image/png;base64,${finalBuffer.toString("base64")}`;

    // Persist post + generation history (R2 not configured → store dataURL as outputUrl).
    const postId = randomUUID();
    await db.insert(post).values({
      id: postId,
      userId,
      industry: meta.industry,
      channel: meta.channel,
      layoutMode: "single_pair",
      templateId: item.templateId,
      headline: entry.headline,
      caption: entry.description ?? null,
      phoneDisplay: meta.phoneDefault,
      status: "completed",
      outputUrl: dataUrl,
    });
    await db.insert(generationHistory).values({
      id: randomUUID(),
      userId,
      type: "poster",
      prompt: entry.headline,
      resultUrl: dataUrl,
      status: "completed",
      creditsUsed: charged,
      metadata: JSON.stringify({ batchId, index, templateId: item.templateId }),
    });

    markIndexUsed(batchId, index, dataUrl);

    return Response.json({
      url: dataUrl,
      charged,
      cachedHit: false,
      remainingCredits: await getUserCredits(userId),
    });
  } catch (err) {
    console.error("[finalize] render or persist failed:", err);
    if (charged > 0) await refundCredits(userId, charged, "poster_ai_finalize_refund");
    return Response.json({ error: "Render failed" }, { status: 500 });
  }
}
