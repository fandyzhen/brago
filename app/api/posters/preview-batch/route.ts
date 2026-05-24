import { readFileSync } from "fs";
import path from "path";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";
import { getActiveSessionUser } from "@/lib/auth/session";
import { canUserAfford, getUserCredits, deductCredits, getUserPlanKey } from "@/lib/credits";
import { applyWatermark } from "@/lib/server/watermark";
import { getTemplateById } from "@/lib/poster-templates/public-metadata";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PREVIEW_BATCH_CREDIT_COST = 10; // 一批 3 张只扣一次
const MAX_TEMPLATES_PER_BATCH = 3;

// 字体在模块级别缓存
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

type PreviewItem =
  | { templateId: string; ok: true; dataUrl: string; name: string }
  | { templateId: string; ok: false; error: string };

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

  const headlineRaw = formData.get("headline");
  if (typeof headlineRaw !== "string" || !headlineRaw.trim()) {
    return Response.json({ error: "Missing required field: headline" }, { status: 400 });
  }

  const beforeFile = formData.get("beforeImage");
  const afterFile = formData.get("afterImage");
  if (!(beforeFile instanceof File) || !(afterFile instanceof File)) {
    return Response.json(
      { error: "Missing required image fields: beforeImage, afterImage" },
      { status: 400 }
    );
  }
  if (beforeFile.size > MAX_FILE_SIZE || afterFile.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Image files must be under 10MB each" }, { status: 400 });
  }

  // templateIds 可以是 templateIds 单字段（JSON 数组）或重复的 templateId
  const templateIds: string[] = [];
  const idsField = formData.get("templateIds");
  if (typeof idsField === "string") {
    try {
      const parsed = JSON.parse(idsField);
      if (Array.isArray(parsed)) {
        for (const v of parsed) if (typeof v === "string" && v.trim()) templateIds.push(v.trim());
      }
    } catch {
      // ignore；继续看 templateId 重复字段
    }
  }
  if (templateIds.length === 0) {
    for (const v of formData.getAll("templateId")) {
      if (typeof v === "string" && v.trim()) templateIds.push(v.trim());
    }
  }
  if (templateIds.length === 0) {
    return Response.json(
      { error: "Missing required field: templateIds (1-3 templateId values)" },
      { status: 400 }
    );
  }
  if (templateIds.length > MAX_TEMPLATES_PER_BATCH) {
    return Response.json(
      { error: `Too many templates — max ${MAX_TEMPLATES_PER_BATCH} per batch` },
      { status: 400 }
    );
  }

  // 校验所有 templateId 都存在 + 不是 collage（multi-area 不走 preview-batch）
  const renderers: Array<{ id: string; render: ReturnType<typeof getRenderer>; name: string }> = [];
  for (const id of templateIds) {
    const r = getRenderer(id);
    const meta = getTemplateById(id);
    if (!r || !meta) {
      return Response.json({ error: `Unknown templateId: ${id}` }, { status: 400 });
    }
    if (meta.layoutFamily === "collage") {
      return Response.json(
        { error: `Template ${id} is a multi-area collage and cannot be used in preview-batch` },
        { status: 400 }
      );
    }
    renderers.push({ id, render: r, name: meta.name });
  }

  // ── 3. Credits check（按一批 10 积分而不是 30）──────────────────
  const affordable = await canUserAfford(userId, PREVIEW_BATCH_CREDIT_COST);
  if (!affordable) {
    const available = await getUserCredits(userId);
    return Response.json(
      { error: "Insufficient credits", required: PREVIEW_BATCH_CREDIT_COST, available },
      { status: 402 }
    );
  }

  // ── 4. 共享准备：读图 + 文本字段 ──────────────────────────────
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
  const userPlanKey = await getUserPlanKey(userId);
  const isFreePlan = !userPlanKey || userPlanKey === "free";

  // ── 5. 并行渲染 ────────────────────────────────────────────────
  const fonts = getFonts();
  const renderOne = async (entry: { id: string; render: ReturnType<typeof getRenderer>; name: string }): Promise<PreviewItem> => {
    try {
      const renderInput: RenderInput = {
        beforeImageDataUrl: beforeDataUrl,
        afterImageDataUrl: afterDataUrl,
        templateId: entry.id,
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
      // render 一定有值——已经在校验阶段确认过
      const element = entry.render!(renderInput);
      const svg = await satori(element, { width: 1080, height: 1080, fonts });
      const pngBuffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 6 }).toBuffer();
      const finalBuffer = isFreePlan ? await applyWatermark(pngBuffer) : pngBuffer;
      const dataUrl = `data:image/png;base64,${finalBuffer.toString("base64")}`;
      return { templateId: entry.id, ok: true, dataUrl, name: entry.name };
    } catch (err) {
      console.error(`[posters/preview-batch] Render failed for ${entry.id}:`, err);
      return { templateId: entry.id, ok: false, error: "Render failed" };
    }
  };

  let previews: PreviewItem[];
  try {
    previews = await Promise.all(renderers.map(renderOne));
  } catch (err) {
    console.error("[posters/preview-batch] Batch render crashed:", err);
    return Response.json({ error: "Render failed" }, { status: 500 });
  }

  // 如果全部失败，整批不扣积分
  const anySucceeded = previews.some((p) => p.ok);
  if (!anySucceeded) {
    return Response.json({ error: "All template renders failed" }, { status: 500 });
  }

  // ── 6. 扣积分（至少 1 张成功才扣）──────────────────────────────
  const deductResult = await deductCredits(
    userId,
    PREVIEW_BATCH_CREDIT_COST,
    "poster_preview_batch"
  );
  if (!deductResult.success) {
    return Response.json({ error: "Failed to deduct credits" }, { status: 500 });
  }

  return Response.json({
    previews,
    creditsCharged: PREVIEW_BATCH_CREDIT_COST,
    remainingCredits: deductResult.remainingCredits,
  });
}
