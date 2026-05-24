import { readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getUserPlanKey } from "@/lib/credits";
import { applyWatermark } from "@/lib/server/watermark";
import { getTemplateById } from "@/lib/poster-templates/public-metadata";
import { setBatch, type BatchItem } from "@/lib/server/poster-preview-cache";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEMPLATES_PER_BATCH = 3;
const THUMB_SIZE = 360;
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

type Thumb = { templateId: string; name: string; thumbnailDataUrl: string };

export async function POST(request: Request): Promise<Response> {
  const access = await getActiveSessionUser(request.headers);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const headlineRaw = formData.get("headline");
  if (typeof headlineRaw !== "string" || !headlineRaw.trim()) {
    return Response.json({ error: "Missing required field: headline" }, { status: 400 });
  }
  const beforeFile = formData.get("beforeImage");
  const afterFile = formData.get("afterImage");
  if (!(beforeFile instanceof File) || !(afterFile instanceof File)) {
    return Response.json({ error: "Missing required image fields" }, { status: 400 });
  }
  if (beforeFile.size > MAX_FILE_SIZE || afterFile.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Image files must be under 10MB each" }, { status: 400 });
  }

  const templateIds: string[] = [];
  const idsField = formData.get("templateIds");
  if (typeof idsField === "string") {
    try {
      const parsed = JSON.parse(idsField);
      if (Array.isArray(parsed))
        for (const v of parsed)
          if (typeof v === "string" && v.trim()) templateIds.push(v.trim());
    } catch {
      /* fall through */
    }
  }
  if (templateIds.length === 0) {
    return Response.json({ error: "Missing required field: templateIds" }, { status: 400 });
  }
  if (templateIds.length > MAX_TEMPLATES_PER_BATCH) {
    return Response.json(
      { error: `Too many templates — max ${MAX_TEMPLATES_PER_BATCH}` },
      { status: 400 }
    );
  }

  const renderers: Array<{ id: string; render: ReturnType<typeof getRenderer>; name: string }> = [];
  for (const id of templateIds) {
    const r = getRenderer(id);
    const meta = getTemplateById(id);
    if (!r || !meta) return Response.json({ error: `Unknown templateId: ${id}` }, { status: 400 });
    if (meta.layoutFamily === "collage")
      return Response.json({ error: `Template ${id} is collage` }, { status: 400 });
    renderers.push({ id, render: r, name: meta.name });
  }

  const [beforeDataUrl, afterDataUrl] = await Promise.all([
    fileToDataUrl(beforeFile),
    fileToDataUrl(afterFile),
  ]);

  function getTextField(name: string): string | undefined {
    const raw = formData.get(name);
    if (typeof raw !== "string") return undefined;
    const clean = raw.split("\n")[0].trim();
    if (clean.startsWith("--")) return undefined;
    return clean || undefined;
  }

  const cleanedHeadline = headlineRaw.trim().slice(0, 36);
  const description = getTextField("description")?.slice(0, 80);
  const businessName = getTextField("businessName")?.slice(0, 120);
  const phone = getTextField("phone")?.slice(0, 32);
  const serviceArea = getTextField("serviceArea")?.slice(0, 120);
  const isLicensed = formData.get("isLicensed") === "true";
  const isInsured = formData.get("isInsured") === "true";
  const googleReviewCountRaw = getTextField("googleReviewCount");
  const googleReviewCount = googleReviewCountRaw
    ? Number.isFinite(parseInt(googleReviewCountRaw, 10))
      ? parseInt(googleReviewCountRaw, 10)
      : undefined
    : undefined;

  const userPlanKey = await getUserPlanKey(userId);
  const isFreePlan = !userPlanKey || userPlanKey === "free";

  const fonts = getFonts();
  const renderOne = async (entry: {
    id: string;
    render: ReturnType<typeof getRenderer>;
    name: string;
  }): Promise<{ thumb: Thumb | null; error: string | null }> => {
    try {
      const renderInput: RenderInput = {
        beforeImageDataUrl: beforeDataUrl,
        afterImageDataUrl: afterDataUrl,
        templateId: entry.id,
        headline: cleanedHeadline,
        businessName,
        phone,
        serviceArea,
        isLicensed,
        isInsured,
        googleReviewCount,
      };
      const element = entry.render!(renderInput);
      const svg = await satori(element, { width: FULL_SIZE, height: FULL_SIZE, fonts });
      const thumbBuffer = await sharp(Buffer.from(svg))
        .resize(THUMB_SIZE, THUMB_SIZE)
        .png({ compressionLevel: 6 })
        .toBuffer();
      const finalBuffer = isFreePlan ? await applyWatermark(thumbBuffer) : thumbBuffer;
      return {
        thumb: {
          templateId: entry.id,
          name: entry.name,
          thumbnailDataUrl: `data:image/png;base64,${finalBuffer.toString("base64")}`,
        },
        error: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error(`[preview-batch] render failed for ${entry.id}:`, err);
      return { thumb: null, error: `${entry.id} → ${msg}` };
    }
  };

  const results = await Promise.all(renderers.map(renderOne));
  const thumbnails: Thumb[] = results.map((r) => r.thumb).filter((t): t is Thumb => t !== null);
  if (thumbnails.length === 0) {
    const firstError = results.find((r) => r.error)?.error ?? "Unknown render error";
    return Response.json(
      { error: `All template renders failed — ${firstError}` },
      { status: 500 }
    );
  }

  const batchId = randomUUID();
  const items: BatchItem[] = thumbnails.map((t) => ({
    templateId: t.templateId,
    name: t.name,
    thumbnailDataUrl: t.thumbnailDataUrl,
  }));
  setBatch(batchId, {
    userId,
    beforeDataUrl,
    afterDataUrl,
    headline: cleanedHeadline,
    description,
    brandFields: {
      businessName,
      phone,
      serviceArea,
      isLicensed,
      isInsured,
      googleReviewCount,
    },
    items,
  });

  return Response.json({
    batchId,
    thumbnails,
    aiFinalizeEnabled: process.env.ENABLE_AI_FINALIZE === "true",
    expiresAt: Date.now() + 30 * 60 * 1000,
  });
}
