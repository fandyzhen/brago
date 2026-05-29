# Brago P0 Phase 4 — Vision Provider + Best After Shot + Before/After Proof

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** 把 spec 第 7 章的核心价值落地：上传完一组照片后，系统自动识别 photo role、推荐 best after、必要时推荐 before/after proof；用户能切换备选图、调整 crop、确认 risk flags。

**Architecture:**
- Provider 抽象：`lib/brago/vision/provider.ts` 定义接口 `analyzeGooglePostPhotos(input)`；默认实现 `volcanic-doubao-vision`（火山引擎多图）；fallback 实现 `fallback-vision`（用文件名/简单启发式给出"无 AI 推荐"，让用户手动选图）。
- 路由：`POST /api/brago/google-posts/[postId]/analyze` — 取本 post 的 photos，喂 provider，写回 `google_post_photo.detectedRole/scores/cropHint/riskFlags`，同时更新 `google_post.bestPhotoId/imageMode/beforePhotoId/afterPhotoId/proofRecommendationJson`。
- 路由：`POST /api/brago/google-posts/[postId]/render-photo` — 根据当前 imageMode + cropHint 用 sharp 渲染 final Google photo（single_after 一张；before_after_proof 两张拼图）。
- 输出页 UI：显示推荐图 + Why this photo + alternatives + risk badge + mode 切换。

**Tech Stack:** 火山引擎 Doubao 视觉模型（多图），sharp（拼图），Zod。

---

## 文件清单

### 服务端
- Create: `lib/brago/vision/types.ts` — re-export from `lib/brago/types.ts`，加 `VisionProvider`/`VisionInput`
- Create: `lib/brago/vision/provider.ts` — 接口 + 默认 export `getVisionProvider()`
- Create: `lib/brago/vision/fallback.ts` — 无 AI 时的 stub
- Create: `lib/brago/vision/doubao.ts` — 火山引擎实现
- Create: `lib/brago/vision/schema.ts` — Zod schema for vision JSON
- Create: `lib/brago/image-compose.ts` — 拼接 before/after proof 模板
- Create: `app/api/brago/google-posts/[postId]/analyze/route.ts`
- Create: `app/api/brago/google-posts/[postId]/render-photo/route.ts`
- Modify: `app/api/brago/google-posts/[postId]/route.ts` — GET 返回带 vision 字段
- Modify: `app/[locale]/(protected)/google-posts/[postId]/page.tsx` — 显示推荐 + alternatives + risk + mode 切换 + Why this photo

### 测试
- Create: `tests/lib/brago-vision-fallback.test.ts`
- Create: `tests/lib/brago-vision-schema.test.ts`
- Create: `tests/lib/brago-image-compose.test.ts`

---

## Task 1: Vision Provider 接口 + Zod schema

**Files:**
- Create: `lib/brago/vision/types.ts`
- Create: `lib/brago/vision/schema.ts`
- Create: `lib/brago/vision/provider.ts`

- [ ] **Step 1: schema.ts**

```ts
import { z } from "zod";

export const cropHintSchema = z.object({
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(1).max(100),
  heightPct: z.number().min(1).max(100),
  preferredAspectRatio: z.enum(["1:1", "4:3"]),
});

export const riskFlagsSchema = z.object({
  visibleFace: z.boolean(),
  visibleLicensePlate: z.boolean(),
  visibleHouseNumber: z.boolean(),
  tooBlurryToUse: z.boolean(),
  tooDarkToUse: z.boolean(),
  likelyCustomerPrivateProperty: z.boolean(),
});

export const scoresSchema = z.object({
  resultVisibility: z.number().min(0).max(10),
  transformationStrength: z.number().min(0).max(10),
  subjectCompleteness: z.number().min(0).max(10),
  trustSignal: z.number().min(0).max(10),
  googleFit: z.number().min(0).max(10),
});

export const photoVisionItemSchema = z.object({
  photoId: z.string(),
  role: z.enum(["before", "after", "process", "detail", "team", "other"]),
  roleConfidence: z.number().min(0).max(1),
  bestAfterScore: z.number().min(0).max(10),
  scores: scoresSchema,
  cropHint: cropHintSchema,
  riskFlags: riskFlagsSchema,
  why: z.string().max(280),
});

export const proofRecommendationSchema = z.object({
  mode: z.enum(["single_after", "before_after_proof"]),
  beforePhotoId: z.string().optional(),
  afterPhotoId: z.string().optional(),
  pairConfidence: z.number().min(0).max(1),
  transformationScore: z.number().min(0).max(10),
  reason: z.string().max(280),
});

export const photoVisionAnalysisSchema = z.object({
  photos: z.array(photoVisionItemSchema),
  recommendedPhotoId: z.string().nullable(),
  alternatives: z.array(z.string()),
  proofRecommendation: proofRecommendationSchema,
});

export type PhotoVisionAnalysis = z.infer<typeof photoVisionAnalysisSchema>;
```

- [ ] **Step 2: types.ts**

```ts
export type VisionInput = {
  industry: "pressure_washing" | "auto_detailing" | "cleaning";
  serviceType: string;
  serviceArea?: string | null;
  photos: Array<{
    photoId: string;
    url: string;
  }>;
};

export type VisionProvider = {
  name: string;
  analyzeGooglePostPhotos(input: VisionInput): Promise<import("./schema").PhotoVisionAnalysis>;
};
```

- [ ] **Step 3: provider.ts**

```ts
import "server-only";
import type { VisionProvider } from "./types";
import { createFallbackVisionProvider } from "./fallback";
import { createDoubaoVisionProvider } from "./doubao";

export function getVisionProvider(): VisionProvider {
  const apiKey = process.env.VOLCANO_ENGINE_API_KEY;
  if (apiKey) return createDoubaoVisionProvider();
  return createFallbackVisionProvider();
}

export function isAiVisionAvailable(): boolean {
  return Boolean(process.env.VOLCANO_ENGINE_API_KEY);
}
```

- [ ] **Step 4: zod schema 单测**

`tests/lib/brago-vision-schema.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { photoVisionAnalysisSchema } from "@/lib/brago/vision/schema";

describe("photoVisionAnalysisSchema", () => {
  it("rejects out-of-range crop", () => {
    const bad = {
      photos: [],
      recommendedPhotoId: null,
      alternatives: [],
      proofRecommendation: { mode: "single_after", pairConfidence: 0, transformationScore: 0, reason: "" },
    };
    const parsed = photoVisionAnalysisSchema.safeParse(bad);
    expect(parsed.success).toBe(true);
  });

  it("requires risk flags as booleans", () => {
    const bad = {
      photos: [{
        photoId: "p", role: "after", roleConfidence: 0.9, bestAfterScore: 9,
        scores: { resultVisibility: 9, transformationStrength: 9, subjectCompleteness: 9, trustSignal: 9, googleFit: 9 },
        cropHint: { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100, preferredAspectRatio: "1:1" },
        riskFlags: { visibleFace: "yes" },
        why: "ok",
      }],
      recommendedPhotoId: "p",
      alternatives: [],
      proofRecommendation: { mode: "single_after", pairConfidence: 0, transformationScore: 0, reason: "" },
    };
    expect(photoVisionAnalysisSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 5: 跑测试**

```bash
pnpm test tests/lib/brago-vision-schema.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/brago/vision/schema.ts lib/brago/vision/types.ts lib/brago/vision/provider.ts tests/lib/brago-vision-schema.test.ts
git commit -m "feat(brago): vision provider interface + zod schema"
```

---

## Task 2: Fallback Vision Provider

**Files:**
- Create: `lib/brago/vision/fallback.ts`

- [ ] **Step 1: 实现 stub**

```ts
import "server-only";
import type { VisionProvider, VisionInput } from "./types";
import type { PhotoVisionAnalysis } from "./schema";

export function createFallbackVisionProvider(): VisionProvider {
  return {
    name: "fallback",
    async analyzeGooglePostPhotos(input: VisionInput): Promise<PhotoVisionAnalysis> {
      // 无 AI：不挑图，全部标 role=other，让用户手动选
      const photos = input.photos.map(p => ({
        photoId: p.photoId,
        role: "other" as const,
        roleConfidence: 0.0,
        bestAfterScore: 0,
        scores: { resultVisibility: 0, transformationStrength: 0, subjectCompleteness: 0, trustSignal: 0, googleFit: 0 },
        cropHint: { xPct: 5, yPct: 5, widthPct: 90, heightPct: 90, preferredAspectRatio: "1:1" as const },
        riskFlags: { visibleFace: false, visibleLicensePlate: false, visibleHouseNumber: false, tooBlurryToUse: false, tooDarkToUse: false, likelyCustomerPrivateProperty: false },
        why: "Photo AI not connected. Please pick the best after shot manually.",
      }));
      return {
        photos,
        recommendedPhotoId: null,
        alternatives: input.photos.map(p => p.photoId),
        proofRecommendation: {
          mode: "single_after",
          pairConfidence: 0,
          transformationScore: 0,
          reason: "Photo AI not connected; defaulting to single after.",
        },
      };
    },
  };
}
```

- [ ] **Step 2: 单测**

`tests/lib/brago-vision-fallback.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { createFallbackVisionProvider } from "@/lib/brago/vision/fallback";

describe("fallback vision provider", () => {
  it("returns null recommendedPhotoId", async () => {
    const p = createFallbackVisionProvider();
    const out = await p.analyzeGooglePostPhotos({
      industry: "pressure_washing",
      serviceType: "driveway",
      photos: [{ photoId: "p1", url: "u1" }, { photoId: "p2", url: "u2" }],
    });
    expect(out.recommendedPhotoId).toBeNull();
    expect(out.proofRecommendation.mode).toBe("single_after");
    expect(out.photos.length).toBe(2);
    expect(out.photos[0].why).toContain("Photo AI not connected");
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add lib/brago/vision/fallback.ts tests/lib/brago-vision-fallback.test.ts
git commit -m "feat(brago): fallback vision provider (no AI mode)"
```

---

## Task 3: Doubao Vision Provider (火山引擎多图)

**Files:**
- Create: `lib/brago/vision/doubao.ts`

- [ ] **Step 1: 写实现**

```ts
import "server-only";
import { volcanoEngineConfig, getHeaders, validateConfig } from "@/lib/volcano-engine/config";
import { photoVisionAnalysisSchema, type PhotoVisionAnalysis } from "./schema";
import type { VisionInput, VisionProvider } from "./types";

const SYSTEM_PROMPT = `You are an expert photographer helping a local home-services business owner pick the best photo for their Google Business Profile.

You will receive multiple photos from one job. Identify each photo's role (before/after/process/detail/team/other). Score each on:
- resultVisibility (0-10): how clearly the finished result is visible
- transformationStrength (0-10): how dramatic the before→after change appears
- subjectCompleteness (0-10): is the subject fully framed?
- trustSignal (0-10): does it look like a real working business?
- googleFit (0-10): would it look right as a Google Business Profile photo?

Flag risks: visibleFace, visibleLicensePlate, visibleHouseNumber, tooBlurryToUse, tooDarkToUse, likelyCustomerPrivateProperty.

For each photo, recommend a square crop (cropHint xPct/yPct/widthPct/heightPct) that frames the result.

Recommend ONE photo as recommendedPhotoId (the strongest after shot). Set proofRecommendation.mode = "before_after_proof" only when:
 - You have a clear before+after pair from the same vantage point, AND
 - pairConfidence >= 0.75 AND transformationScore >= 7 AND
 - no major privacy/risk concerns

Otherwise mode = "single_after".

Output ONLY valid JSON matching the schema (no markdown fences).`;

function buildUserPrompt(input: VisionInput): string {
  return [
    `Industry: ${input.industry}`,
    `Service: ${input.serviceType}`,
    input.serviceArea ? `Area: ${input.serviceArea}` : "",
    "",
    "Photo IDs (in same order as images below):",
    ...input.photos.map(p => `- ${p.photoId}`),
  ].filter(Boolean).join("\n");
}

const VISION_MODEL = process.env.VOLCANO_ENGINE_VISION_MODEL
  || process.env.VOLCANO_ENGINE_TEXT_MODEL
  || "doubao-1-5-vision-pro-250328";

export function createDoubaoVisionProvider(): VisionProvider {
  return {
    name: "doubao",
    async analyzeGooglePostPhotos(input: VisionInput): Promise<PhotoVisionAnalysis> {
      validateConfig();
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(input) },
            ...input.photos.map(p => ({ type: "image_url", image_url: { url: p.url } })),
          ],
        },
      ];

      const res = await fetch(`${volcanoEngineConfig.apiUrl}/chat/completions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          model: VISION_MODEL,
          messages,
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Doubao vision error: ${res.status} ${err}`);
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? "{}";
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof text === "string" ? text : JSON.stringify(text));
      } catch (e) {
        throw new Error(`Doubao vision returned non-JSON: ${String(text).slice(0, 200)}`);
      }
      const result = photoVisionAnalysisSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error("Doubao vision response failed schema validation: " + result.error.message);
      }
      // 业务层防御：模型说 before_after_proof 但分数低 → 降回 single_after
      if (
        result.data.proofRecommendation.mode === "before_after_proof" &&
        (result.data.proofRecommendation.pairConfidence < 0.75
          || result.data.proofRecommendation.transformationScore < 7
          || !result.data.proofRecommendation.beforePhotoId
          || !result.data.proofRecommendation.afterPhotoId)
      ) {
        result.data.proofRecommendation = {
          ...result.data.proofRecommendation,
          mode: "single_after",
          reason: "Pair confidence or transformation too low; defaulting to single after.",
        };
      }
      return result.data;
    },
  };
}
```

注意：spec 14.2 提醒 vision 模型名要查最新文档。代码用 env override + 默认值。用户后续填 env 时可覆盖。

- [ ] **Step 2: Commit**

```bash
git add lib/brago/vision/doubao.ts
git commit -m "feat(brago): doubao multi-image vision provider"
```

---

## Task 4: `lib/brago/image-compose.ts` — before/after proof 拼图

**Files:**
- Create: `lib/brago/image-compose.ts`
- Modify: `lib/brago/image-processing.ts` — 可复用 renderGoogleCrop

- [ ] **Step 1: 测试先**

`tests/lib/brago-image-compose.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { composeBeforeAfterProof } from "@/lib/brago/image-compose";

async function makeJpeg(w: number, h: number, color: string): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: color } }).jpeg().toBuffer();
}

describe("composeBeforeAfterProof", () => {
  it("returns 1080x1080 jpeg", async () => {
    const before = await makeJpeg(2000, 1500, "#333333");
    const after = await makeJpeg(2000, 1500, "#cccccc");
    const out = await composeBeforeAfterProof(before, after);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
    expect(meta.format).toBe("jpeg");
  });
});
```

- [ ] **Step 2: 实现**

```ts
import "server-only";
import sharp from "sharp";

const CANVAS = 1080;
const LABEL_HEIGHT = 64;

function labelSvg(text: string, side: "left" | "right"): Buffer {
  const half = CANVAS / 2;
  const x = side === "left" ? 24 : half + 24;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${LABEL_HEIGHT}">
  <rect x="${x - 12}" y="14" rx="6" ry="6" width="84" height="36" fill="rgba(0,0,0,0.55)"/>
  <text x="${x}" y="40" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="600" fill="#ffffff">${text}</text>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

export async function composeBeforeAfterProof(
  beforeBuffer: Buffer,
  afterBuffer: Buffer,
  options: { edge?: number } = {},
): Promise<Buffer> {
  const edge = options.edge ?? CANVAS;
  const half = Math.floor(edge / 2);
  const beforeCrop = await sharp(beforeBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: half, height: edge, fit: "cover" })
    .modulate({ saturation: 1.04, brightness: 1.0 })
    .jpeg({ quality: 92 })
    .toBuffer();
  const afterCrop = await sharp(afterBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: half, height: edge, fit: "cover" })
    .modulate({ saturation: 1.04, brightness: 1.02 })
    .jpeg({ quality: 92 })
    .toBuffer();

  const composed = await sharp({
    create: { width: edge, height: edge, channels: 3, background: "#000000" },
  })
    .composite([
      { input: beforeCrop, top: 0, left: 0 },
      { input: afterCrop, top: 0, left: half },
      { input: labelSvg("Before", "left"), top: edge - LABEL_HEIGHT - 16, left: 0 },
      { input: labelSvg("After", "right"), top: edge - LABEL_HEIGHT - 16, left: 0 },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
  return composed;
}
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test tests/lib/brago-image-compose.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/brago/image-compose.ts tests/lib/brago-image-compose.test.ts
git commit -m "feat(brago): before/after proof composer"
```

---

## Task 5: `/api/brago/google-posts/[postId]/analyze`

**Files:**
- Create: `app/api/brago/google-posts/[postId]/analyze/route.ts`

- [ ] **Step 1: 写 route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import { getVisionProvider, isAiVisionAvailable } from "@/lib/brago/vision/provider";
import type { Industry } from "@/lib/brago/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;

  const postRow = await db.select().from(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id))).limit(1);
  const post = postRow[0];
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await db.select().from(googlePostPhoto).where(eq(googlePostPhoto.googlePostId, postId));
  if (photos.length === 0) return NextResponse.json({ error: "No photos" }, { status: 400 });

  const provider = getVisionProvider();
  let analysis;
  try {
    analysis = await provider.analyzeGooglePostPhotos({
      industry: post.industry as Industry,
      serviceType: post.serviceType,
      serviceArea: post.serviceArea,
      photos: photos.map(p => ({ photoId: p.id, url: p.processedUrl ?? p.originalUrl })),
    });
  } catch (err) {
    console.error("[analyze] provider error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Vision failed" }, { status: 502 });
  }

  // 写回 photo 行
  for (const item of analysis.photos) {
    await db.update(googlePostPhoto).set({
      detectedRole: item.role,
      roleConfidence: Math.round(item.roleConfidence * 100),
      bestAfterScore: Math.round(item.bestAfterScore * 10),
      cropHintJson: JSON.stringify(item.cropHint),
      riskFlagsJson: JSON.stringify(item.riskFlags),
      whySelected: item.why,
    }).where(and(eq(googlePostPhoto.id, item.photoId), eq(googlePostPhoto.googlePostId, postId)));
  }

  // 写回 post
  await db.update(googlePost).set({
    bestPhotoId: analysis.recommendedPhotoId,
    imageMode: analysis.proofRecommendation.mode,
    beforePhotoId: analysis.proofRecommendation.beforePhotoId ?? null,
    afterPhotoId: analysis.proofRecommendation.afterPhotoId ?? null,
    proofRecommendationJson: JSON.stringify(analysis.proofRecommendation),
    status: analysis.recommendedPhotoId ? "draft" : "draft",
  }).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id)));

  return NextResponse.json({ analysis, aiAvailable: isAiVisionAvailable() });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/analyze/route.ts"
git commit -m "feat(api): analyze (vision) endpoint"
```

---

## Task 6: `/api/brago/google-posts/[postId]/render-photo`

**Files:**
- Create: `app/api/brago/google-posts/[postId]/render-photo/route.ts`

- [ ] **Step 1: 写 route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import { renderGoogleCrop } from "@/lib/brago/image-processing";
import { composeBeforeAfterProof } from "@/lib/brago/image-compose";
import { buildGooglePostKey, bufferToDataUrl, isR2Ready, uploadBuffer } from "@/lib/brago/r2-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

async function fetchBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("fetch image failed");
  return Buffer.from(await r.arrayBuffer());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;

  const postRow = await db.select().from(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id))).limit(1);
  const post = postRow[0];
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const mode = (body.mode as "single_after" | "before_after_proof") || post.imageMode || "single_after";

  let finalUrl: string;
  if (mode === "single_after") {
    const photoId: string | null = body.photoId ?? post.bestPhotoId;
    if (!photoId) return NextResponse.json({ error: "No photo selected" }, { status: 400 });
    const photo = await db.select().from(googlePostPhoto).where(and(eq(googlePostPhoto.id, photoId), eq(googlePostPhoto.googlePostId, postId))).limit(1);
    if (!photo[0]) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    const src = await fetchBuffer(photo[0].processedUrl ?? photo[0].originalUrl);
    const crop = photo[0].cropHintJson ? JSON.parse(photo[0].cropHintJson) : { xPct: 5, yPct: 5, widthPct: 90, heightPct: 90, preferredAspectRatio: "1:1" };
    const rendered = await renderGoogleCrop(src, crop, { outputEdge: 1080 });
    const key = buildGooglePostKey(access.user.id, postId, "processed", `final_${randomUUID()}.jpg`);
    finalUrl = isR2Ready()
      ? await uploadBuffer({ key, body: rendered, contentType: "image/jpeg" })
      : bufferToDataUrl(rendered, "image/jpeg");
    await db.update(googlePost).set({ bestPhotoId: photoId, imageMode: "single_after" }).where(eq(googlePost.id, postId));
  } else {
    const beforeId: string | null = body.beforePhotoId ?? post.beforePhotoId;
    const afterId: string | null = body.afterPhotoId ?? post.afterPhotoId;
    if (!beforeId || !afterId) return NextResponse.json({ error: "Need before + after photo" }, { status: 400 });
    const photos = await db.select().from(googlePostPhoto).where(eq(googlePostPhoto.googlePostId, postId));
    const before = photos.find(p => p.id === beforeId);
    const after = photos.find(p => p.id === afterId);
    if (!before || !after) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    const beforeBuf = await fetchBuffer(before.processedUrl ?? before.originalUrl);
    const afterBuf = await fetchBuffer(after.processedUrl ?? after.originalUrl);
    const composed = await composeBeforeAfterProof(beforeBuf, afterBuf);
    const key = buildGooglePostKey(access.user.id, postId, "processed", `proof_${randomUUID()}.jpg`);
    finalUrl = isR2Ready()
      ? await uploadBuffer({ key, body: composed, contentType: "image/jpeg" })
      : bufferToDataUrl(composed, "image/jpeg");
    await db.update(googlePost).set({ bestPhotoId: afterId, imageMode: "before_after_proof", beforePhotoId: beforeId, afterPhotoId: afterId }).where(eq(googlePost.id, postId));
  }

  return NextResponse.json({ finalUrl });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/render-photo/route.ts"
git commit -m "feat(api): render-photo (single_after | before_after_proof)"
```

---

## Task 7: 输出页 UI — 推荐 + alternatives + risk + mode 切换

**Files:**
- Modify: `app/[locale]/(protected)/google-posts/[postId]/page.tsx`

- [ ] **Step 1: 大改 UI**

把页面改为：
- 顶部展示当前 final image (从 `/render-photo` 拿，或先 thumbnail of bestPhoto)
- "Why this photo?" — 取 `whySelected` 字段
- mode toggle: `Single after` / `Before & after proof`
- alternatives: photos 列表，点击切换 bestPhotoId
- Risk badge: 如 visibleFace = true，显示 `⚠ Face visible — confirm before posting`
- 主操作：`Generate Google photo` 调 `/render-photo`，`Copy Google post`（caption 在 Phase 5）
- 次操作：`Try another photo`、`Mark as posted`

完整代码（client component）：

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Container } from "@/components/container";

type Photo = {
  id: string;
  thumbnailUrl: string;
  processedUrl: string;
  detectedRole: string | null;
  roleConfidence: number | null;
  bestAfterScore: number | null;
  whySelected: string | null;
  riskFlagsJson: string | null;
};

type Post = {
  id: string;
  industry: string;
  serviceType: string;
  serviceArea: string | null;
  status: "draft" | "ready" | "posted_manually" | "archived";
  language: "en" | "es";
  imageMode: "single_after" | "before_after_proof";
  bestPhotoId: string | null;
  beforePhotoId: string | null;
  afterPhotoId: string | null;
  caption: string | null;
  proofRecommendationJson: string | null;
};

export default function Page() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  const refetch = useCallback(async () => {
    if (!postId) return;
    const [postRes, photoRes] = await Promise.all([
      fetch(`/api/brago/google-posts/${postId}`).then(r => r.json()),
      fetch(`/api/brago/google-posts/${postId}/photos`).then(r => r.json()),
    ]);
    setPost(postRes.post);
    setPhotos(photoRes.photos ?? []);
  }, [postId]);

  useEffect(() => { refetch(); }, [refetch]);

  const analyze = async () => {
    setBusy("Analyzing photos");
    setError(null);
    try {
      const res = await fetch(`/api/brago/google-posts/${postId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analyze failed");
      setAiAvailable(Boolean(data.aiAvailable));
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  const renderPhoto = async (mode?: "single_after" | "before_after_proof", photoId?: string) => {
    setBusy("Generating Google photo");
    setError(null);
    try {
      const res = await fetch(`/api/brago/google-posts/${postId}/render-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode ?? post?.imageMode, photoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Render failed");
      setFinalUrl(data.finalUrl);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  const markPosted = async () => {
    setBusy("Marking");
    await fetch(`/api/brago/google-posts/${postId}/mark-posted`, { method: "POST" });
    await refetch();
    setBusy(null);
  };

  if (!post) return <Container className="py-10"><p>Loading…</p></Container>;
  const recommendedPhoto = photos.find(p => p.id === post.bestPhotoId) ?? photos[0];
  const recRisks = recommendedPhoto?.riskFlagsJson ? JSON.parse(recommendedPhoto.riskFlagsJson) : {};
  const proofRec = post.proofRecommendationJson ? JSON.parse(post.proofRecommendationJson) : null;

  return (
    <Container className="py-10 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Google post for {post.serviceType}</h1>
      <p className="text-xs text-muted-foreground mb-4">Status: {post.status}{aiAvailable === false ? " · Photo AI not connected" : ""}</p>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos uploaded.</p>
      ) : (
        <>
          {!post.bestPhotoId && (
            <button onClick={analyze} disabled={!!busy} className="mb-4 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50">
              {busy === "Analyzing photos" ? "Analyzing…" : "Find the best after shot"}
            </button>
          )}

          {finalUrl ? (
            <img src={finalUrl} alt="" className="w-full rounded-xl border mb-3" />
          ) : recommendedPhoto ? (
            <img src={recommendedPhoto.thumbnailUrl} alt="" className="w-full rounded-xl border mb-3" />
          ) : null}

          {recommendedPhoto?.whySelected && (
            <p className="text-xs text-muted-foreground mb-2">Why this photo? {recommendedPhoto.whySelected}</p>
          )}

          {(recRisks.visibleFace || recRisks.visibleLicensePlate || recRisks.visibleHouseNumber) && (
            <div className="text-xs rounded-md bg-yellow-100 text-yellow-900 p-2 mb-3">
              {recRisks.visibleFace && "⚠ Face visible. "}
              {recRisks.visibleLicensePlate && "⚠ License plate visible. "}
              {recRisks.visibleHouseNumber && "⚠ House number visible. "}
              Confirm before posting.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              disabled={!!busy}
              onClick={() => renderPhoto("single_after")}
              className={`rounded-md border px-3 py-2 text-xs ${post.imageMode === "single_after" ? "bg-foreground text-background" : ""}`}>
              Single after
            </button>
            <button
              disabled={!!busy || !(post.beforePhotoId && post.afterPhotoId)}
              onClick={() => renderPhoto("before_after_proof")}
              className={`rounded-md border px-3 py-2 text-xs ${post.imageMode === "before_after_proof" ? "bg-foreground text-background" : ""}`}>
              Before & after proof
            </button>
          </div>

          {proofRec && (
            <p className="text-xs text-muted-foreground mb-3">
              Brago suggests: <strong>{proofRec.mode}</strong>. {proofRec.reason}
            </p>
          )}

          {photos.length > 1 && (
            <details className="mb-4">
              <summary className="text-xs cursor-pointer">See alternatives</summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photos.map(p => (
                  <button key={p.id}
                    onClick={() => renderPhoto("single_after", p.id)}
                    className={`relative aspect-square overflow-hidden rounded-md border ${p.id === post.bestPhotoId ? "ring-2 ring-blue-500" : ""}`}>
                    <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    {p.detectedRole && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 text-white text-[10px] px-1">{p.detectedRole}</span>
                    )}
                  </button>
                ))}
              </div>
            </details>
          )}

          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

          <div className="flex gap-2">
            <button onClick={markPosted} disabled={!!busy || post.status === "posted_manually"} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">
              {post.status === "posted_manually" ? "Marked as posted" : "Mark as posted"}
            </button>
          </div>
        </>
      )}
    </Container>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(protected)/google-posts/[postId]/page.tsx"
git commit -m "feat(output): vision-driven best after + mode + alternatives + risks"
```

---

## Task 8: Phase 4 收尾

- [ ] **Step 1: lint/test/build**

```bash
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 2: 注意**：vision provider 在没有 VOLCANO_ENGINE_API_KEY 时自动走 fallback；不会 break build。生产侧 spec 14.3 要求 UI 显示 `Photo AI not connected`，已实现。

- [ ] **Step 3: launch-checklist 更新**

追加：vision model 名（spec 14.2 要求当天确认）需要 owner 填 env `VOLCANO_ENGINE_VISION_MODEL`。

- [ ] **Step 4: Commit**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): mark Phase 4 (vision + best after) complete" --allow-empty
```

## Definition of Done

- 上传后用户可点 `Find the best after shot`，触发 vision；fallback 模式不调外网仍能跑。
- 输出页显示推荐图 + Why + alternatives + risk badge + mode switch。
- `Generate Google photo` 可输出 1080×1080 final（single_after 或 before_after_proof）。
- `pnpm lint && pnpm test && pnpm build` 全绿。
