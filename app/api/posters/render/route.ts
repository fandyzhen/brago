import { readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";
import type { PhotoPair } from "@/lib/server/poster-templates/shared/multi-area-types";
import { getActiveSessionUser } from "@/lib/auth/session";
import { canUserAfford, getUserCredits, deductCredits, getUserPlanKey } from "@/lib/credits";
import { applyWatermark } from "@/lib/server/watermark";
import { uploadPosterToR2 } from "@/lib/server/r2-poster";
import { db } from "@/lib/db";
import { generationHistory, post, postImagePair } from "@/lib/db/schema";
import { getTemplateById } from "@/lib/poster-templates/public-metadata";

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

  const templateId = formData.get("templateId") as string | null;
  const headline = formData.get("headline") as string | null;

  if (!templateId || !headline || typeof templateId !== "string" || typeof headline !== "string") {
    return Response.json(
      { error: "Missing required fields: templateId, headline" },
      { status: 400 }
    );
  }

  const renderer = getRenderer(templateId);
  if (!renderer) {
    return Response.json({ error: `Unknown templateId: ${templateId}` }, { status: 400 });
  }

  const meta = getTemplateById(templateId);
  const isMultiArea = meta?.layoutFamily === "collage";

  // Collect before/after pairs — either single (legacy) or multi-area (areaN_before/after)
  type RawPair = { before: File; after: File; areaLabel?: string };
  const rawPairs: RawPair[] = [];

  if (isMultiArea) {
    for (let i = 1; i <= 4; i += 1) {
      const b = formData.get(`area${i}_before`);
      const a = formData.get(`area${i}_after`);
      if (b instanceof File && a instanceof File) {
        const label = formData.get(`area${i}_label`);
        rawPairs.push({
          before: b,
          after: a,
          areaLabel: typeof label === "string" && label.trim() ? label.trim() : undefined,
        });
      }
    }
    if (rawPairs.length === 0) {
      // Fall back to legacy single-pair fields
      const b = formData.get("beforeImage");
      const a = formData.get("afterImage");
      if (b instanceof File && a instanceof File) rawPairs.push({ before: b, after: a });
    }
  } else {
    const b = formData.get("beforeImage");
    const a = formData.get("afterImage");
    if (b instanceof File && a instanceof File) rawPairs.push({ before: b, after: a });
  }

  if (rawPairs.length === 0) {
    return Response.json(
      { error: "Missing required image fields (beforeImage/afterImage or areaN_before/areaN_after)" },
      { status: 400 }
    );
  }

  for (const p of rawPairs) {
    if (p.before.size > MAX_FILE_SIZE || p.after.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Image files must be under 10MB each" }, { status: 400 });
    }
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
    const dataUrls = await Promise.all(
      rawPairs.flatMap((p) => [fileToDataUrl(p.before), fileToDataUrl(p.after)])
    );
    const pairs: PhotoPair[] = rawPairs.map((p, i) => ({
      beforeImageDataUrl: dataUrls[i * 2],
      afterImageDataUrl: dataUrls[i * 2 + 1],
      areaLabel: p.areaLabel,
    }));

    function getTextField(name: string): string | undefined {
      const raw = formData.get(name);
      if (typeof raw !== "string") return undefined;
      const clean = raw.split("\n")[0].trim();
      if (clean.startsWith("--")) return undefined;
      return clean || undefined;
    }

    const cleanedHeadline = (getTextField("headline") ?? headline).slice(0, 36);

    const renderInput: RenderInput = {
      beforeImageDataUrl: pairs[0].beforeImageDataUrl,
      afterImageDataUrl: pairs[0].afterImageDataUrl,
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
      photoPairs: isMultiArea ? pairs : undefined,
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

    // ── 7. Write Brago post + image pairs + legacy history ─────────
    try {
      const postId = randomUUID();
      await db.insert(post).values({
        id: postId,
        userId,
        industry: meta?.industry ?? "pressure_washing",
        channel: meta?.channel ?? "google_business_profile",
        layoutMode: isMultiArea ? "multi_area" : "single_pair",
        templateId,
        headline: cleanedHeadline,
        caption: getTextField("caption") ?? null,
        phoneDisplay: meta?.phoneDefault ?? null,
        status: "completed",
        outputUrl: resultUrl,
      });
      await db.insert(postImagePair).values(
        pairs.map((_, i) => ({
          id: randomUUID(),
          postId,
          areaIndex: i,
          areaLabel: pairs[i].areaLabel ?? null,
          // The original uploaded files aren't stored individually (only the rendered poster is uploaded).
          // Future improvement: upload originals to R2 and persist their URLs here.
          beforeImageUrl: null,
          afterImageUrl: null,
        }))
      );

      await db.insert(generationHistory).values({
        id: randomUUID(),
        userId,
        type: "poster",
        prompt: cleanedHeadline,
        resultUrl,
        status: "completed",
        creditsUsed: POSTER_CREDIT_COST,
        metadata: JSON.stringify({ templateId, headline: cleanedHeadline, postId }),
      });
    } catch (histErr) {
      console.error("[posters/render] Failed to write post history:", histErr);
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
