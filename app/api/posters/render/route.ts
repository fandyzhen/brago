import { readFileSync } from "fs";
import path from "path";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// 字体在模块级别缓存，避免每次请求重复读文件
let _fonts: { name: string; data: Buffer; weight: 400; style: "normal" }[] | null = null;

function getFonts() {
  if (!_fonts) {
    const inter = readFileSync(
      path.join(process.cwd(), "public/fonts/inter-regular.ttf")
    );
    const mono = readFileSync(
      path.join(process.cwd(), "public/fonts/jetbrains-mono-regular.ttf")
    );
    _fonts = [
      { name: "Inter", data: inter, weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
    ];
  }
  return _fonts;
}

export async function POST(request: Request): Promise<Response> {
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

  // 必填字段验证
  if (!beforeImage || !afterImage || !templateId || !headline) {
    return Response.json(
      { error: "Missing required fields: beforeImage, afterImage, templateId, headline" },
      { status: 400 }
    );
  }

  // 运行时类型守卫
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

  // 模板存在性验证
  const renderer = getRenderer(templateId);
  if (!renderer) {
    return Response.json(
      { error: `Unknown templateId: ${templateId}` },
      { status: 400 }
    );
  }

  // 文件大小验证
  if (beforeImage.size > MAX_FILE_SIZE || afterImage.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "Image files must be under 10MB each" },
      { status: 400 }
    );
  }

  try {
    // 图片转 base64 data URL
    const [beforeImageDataUrl, afterImageDataUrl] = await Promise.all([
      fileToDataUrl(beforeImage),
      fileToDataUrl(afterImage),
    ]);

    // 构建渲染输入
    const renderInput: RenderInput = {
      beforeImageDataUrl,
      afterImageDataUrl,
      templateId,
      headline: headline.slice(0, 36),
      businessName: (formData.get("businessName") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      serviceArea: (formData.get("serviceArea") as string) || undefined,
      isLicensed: formData.get("isLicensed") === "true",
      isInsured: formData.get("isInsured") === "true",
      googleReviewCount: formData.get("googleReviewCount")
        ? parseInt(formData.get("googleReviewCount") as string, 10)
        : undefined,
    };

    // JSX → SVG（satori）
    const element = renderer(renderInput);
    const svg = await satori(element, {
      width: 1080,
      height: 1080,
      fonts: getFonts(),
    });

    // SVG → PNG（sharp）
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 6 })
      .toBuffer();

    return new Response(new Uint8Array(pngBuffer), {
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
