import { readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";
import { getActiveSessionUser } from "@/lib/auth/session";
import { canUserAfford, getUserCredits, deductCredits, getUserPlanKey } from "@/lib/credits";
import { applyWatermark } from "@/lib/server/watermark";
import { uploadPosterToR2 } from "@/lib/server/r2-poster";
import { db } from "@/lib/db";
import { generationHistory } from "@/lib/db/schema";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const POSTER_CREDIT_COST = 10;

// 字体在模块级别缓存，避免每次请求重复读文件
let _fonts: { name: string; data: Buffer; weight: 400; style: "normal" }[] | null = null;

function getFonts() {
  if (!_fonts) {
    const inter = readFileSync(
      path.join(process.cwd(), "public/fonts/inter-regular.woff")
    );
    const mono = readFileSync(
      path.join(process.cwd(), "public/fonts/jetbrains-mono-regular.woff")
    );
    _fonts = [
      { name: "Inter", data: inter, weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
    ];
  }
  return _fonts;
}

export async function POST(request: Request): Promise<Response> {
  // ── 1. Auth ────────────────────────────────────────────────────
  const access = await getActiveSessionUser(request.headers);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }
  const userId = access.user.id;

  // ── 2. Parse form data ─────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const beforeImage = formData.get("beforeImage") as File | null;
  const afterImage = formData.get("afterImage") as File | null;
  const templateId = formData.get("templateId") as string | null;
  const headline = formData.get("headline") as string | null;

  if (!beforeImage || !afterImage || !templateId || !headline) {
    return Response.json(
      { error: "Missing required fields: beforeImage, afterImage, templateId, headline" },
      { status: 400 }
    );
  }

  if (!(beforeImage instanceof File) || !(afterImage instanceof File)) {
    return Response.json(
      { error: "Missing required fields: beforeImage and afterImage must be files" },
      { status: 400 }
    );
  }
  if (typeof templateId !== "string" || typeof headline !== "string") {
    return Response.json(
      { error: "Missing required fields: templateId and headline must be strings" },
      { status: 400 }
    );
  }

  const renderer = getRenderer(templateId);
  if (!renderer) {
    return Response.json(
      { error: `Unknown templateId: ${templateId}` },
      { status: 400 }
    );
  }

  if (beforeImage.size > MAX_FILE_SIZE || afterImage.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "Image files must be under 10MB each" },
      { status: 400 }
    );
  }

  // ── 3. Credits check ───────────────────────────────────────────
  const affordable = await canUserAfford(userId, POSTER_CREDIT_COST);
  if (!affordable) {
    const available = await getUserCredits(userId);
    return Response.json(
      { error: "Insufficient credits", required: POSTER_CREDIT_COST, available },
      { status: 402 }
    );
  }

  // ── 4. Render PNG ──────────────────────────────────────────────
  try {
    const [beforeImageDataUrl, afterImageDataUrl] = await Promise.all([
      fileToDataUrl(beforeImage),
      fileToDataUrl(afterImage),
    ]);

    function getTextField(name: string): string | undefined {
      const raw = formData.get(name);
      if (typeof raw !== "string") return undefined;
      const clean = raw.split("\n")[0].trim();
      if (clean.startsWith("--")) return undefined;
      return clean || undefined;
    }

    const cleanedHeadline = (getTextField("headline") ?? headline).slice(0, 36);

    const renderInput: RenderInput = {
      beforeImageDataUrl,
      afterImageDataUrl,
      templateId,
      headline: cleanedHeadline,
      businessName: getTextField("businessName"),
      phone: getTextField("phone"),
      serviceArea: getTextField("serviceArea"),
      isLicensed: formData.get("isLicensed") === "true",
      isInsured: formData.get("isInsured") === "true",
      googleReviewCount: (() => {
        const raw = getTextField("googleReviewCount");
        if (!raw) return undefined;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : undefined;
      })(),
    };

    const element = renderer(renderInput);
    const svg = await satori(element, {
      width: 1080,
      height: 1080,
      fonts: getFonts(),
    });
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 6 })
      .toBuffer();

    // ── 4b. Apply watermark for free users ────────────────────────
    const userPlanKey = await getUserPlanKey(userId);
    const isFreePlan = !userPlanKey || userPlanKey === "free";
    const finalBuffer = isFreePlan ? await applyWatermark(pngBuffer) : pngBuffer;

    // ── 5. Upload to R2 (throws on failure → caught below) ───────
    const resultUrl = await uploadPosterToR2(finalBuffer, userId);

    // ── 6. Deduct credits ─────────────────────────────────────────
    const deductResult = await deductCredits(userId, POSTER_CREDIT_COST, "poster_generation");
    if (!deductResult.success) {
      return Response.json({ error: "Failed to deduct credits" }, { status: 500 });
    }

    // ── 7. Write history (degraded on failure — PNG still returned) ─
    // resultUrl may be null when R2 is not configured; schema allows null.
    // We always write history so users can see their generation activity.
    try {
      await db.insert(generationHistory).values({
        id: randomUUID(),
        userId,
        type: "poster",
        prompt: cleanedHeadline,
        resultUrl,
        status: "completed",
        creditsUsed: POSTER_CREDIT_COST,
        metadata: JSON.stringify({ templateId, headline: cleanedHeadline }),
      });
    } catch (histErr) {
      console.error("[posters/render] Failed to write history:", histErr);
    }

    // ── 8. Return PNG ─────────────────────────────────────────────
    return new Response(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="brago-post.png"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[posters/render] Render failed:", err);
    return Response.json({ error: "Render failed" }, { status: 500 });
  }
}
