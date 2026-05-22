# 海报渲染基础设施 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 server-only 海报渲染管道，实现 `POST /api/posters/render` 接收 before/after 图片，返回 1080×1080 PNG。

**Architecture:** 用户通过 multipart 表单上传两张照片 + 填写标题和品牌信息；API 路由把图片转成 base64 data URL，调用模板注册表找到对应渲染函数，用 satori 把 JSX 渲染成 SVG，再用 sharp 转成 PNG，直接返回字节流。所有模板代码在 `lib/server/poster-templates/` 下，禁止被 client bundle import。

**Tech Stack:** satori 0.10.x（JSX → SVG）、sharp（已安装，SVG → PNG）、Next.js App Router API Route、Vitest

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `lib/server/poster-templates/shared/types.ts` | RenderInput、RenderFn、BragoTemplateMeta 类型 |
| `lib/server/poster-templates/shared/image-utils.ts` | File → base64 data URL 工具函数 |
| `lib/server/poster-templates/pressure-washing/driveway-hero-split.tsx` | 第一个模板：After 大图 + Before 缩略图 |
| `lib/server/poster-templates/registry.ts` | templateId → RenderFn 映射，提供 getRenderer() |
| `lib/poster-templates/public-metadata.ts` | 前端可安全 import 的模板元数据（无渲染逻辑） |
| `app/api/posters/render/route.ts` | POST handler：parse → validate → render → return PNG |
| `public/fonts/inter-regular.ttf` | satori 用字体（下载） |
| `public/fonts/jetbrains-mono-regular.ttf` | 标签字体（下载） |
| `tests/lib/poster-image-utils.test.ts` | image-utils 单元测试 |
| `tests/lib/poster-registry.test.ts` | registry 单元测试 |
| `tests/api/posters-render.test.ts` | API 路由验证测试 |

---

## Task 1：安装 satori + 下载字体

**Files:**
- Run: `pnpm add satori`
- Create: `public/fonts/inter-regular.ttf`
- Create: `public/fonts/jetbrains-mono-regular.ttf`

- [ ] **Step 1: 安装 satori**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm add satori
```

Expected: satori 出现在 dependencies，无安装错误。

- [ ] **Step 2: 创建字体目录并下载字体**

```bash
mkdir -p /Volumes/FZD/开发项目/Brago/public/fonts

# Inter Regular TTF (Google Fonts official GitHub)
curl -L "https://github.com/google/fonts/raw/main/ofl/inter/static/Inter_18pt-Regular.ttf" \
  -o /Volumes/FZD/开发项目/Brago/public/fonts/inter-regular.ttf

# JetBrains Mono Regular TTF
curl -L "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf" \
  -o /Volumes/FZD/开发项目/Brago/public/fonts/jetbrains-mono-regular.ttf
```

- [ ] **Step 3: 验证字体文件存在**

```bash
ls -lh /Volumes/FZD/开发项目/Brago/public/fonts/
```

Expected: 两个 .ttf 文件，各 > 100KB。

- [ ] **Step 4: 验证 satori 可被 import**

```bash
cd /Volumes/FZD/开发项目/Brago && node -e "import('satori').then(m => console.log('satori ok:', Object.keys(m)))"
```

Expected: `satori ok: [ 'default' ]`

---

## Task 2：共享类型定义

**Files:**
- Create: `lib/server/poster-templates/shared/types.ts`

- [ ] **Step 1: 创建类型文件**

创建 `/Volumes/FZD/开发项目/Brago/lib/server/poster-templates/shared/types.ts`：

```typescript
import type React from "react";

export type RenderInput = {
  beforeImageDataUrl: string;  // "data:image/jpeg;base64,..."
  afterImageDataUrl: string;
  templateId: string;
  headline: string;            // 最大 36 字符
  businessName?: string;
  phone?: string;
  serviceArea?: string;
  isLicensed?: boolean;
  isInsured?: boolean;
  googleReviewCount?: number;
};

export type RenderFn = (input: RenderInput) => React.ReactElement;

export type BragoTemplateMeta = {
  id: string;
  name: string;
  industry: "pressure_washing" | "auto_detailing";
  channel: "google_business_profile" | "facebook_nextdoor" | "instagram";
  layoutFamily: "split" | "hero_photo" | "stacked" | "collage";
  photoPairCount: 1 | 2 | 3 | 4;
  previewImage: string;  // 公开 URL，用于前端展示预览图
};
```

- [ ] **Step 2: TypeScript 类型检查通过**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm exec tsc --noEmit 2>&1 | grep "poster-templates"
```

Expected: 无输出（无错误）。

---

## Task 3：image-utils.ts + 单元测试

**Files:**
- Create: `lib/server/poster-templates/shared/image-utils.ts`
- Create: `tests/lib/poster-image-utils.test.ts`

- [ ] **Step 1: 先写失败测试**

创建 `/Volumes/FZD/开发项目/Brago/tests/lib/poster-image-utils.test.ts`：

```typescript
import { bufferToDataUrl, fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";

describe("bufferToDataUrl", () => {
  it("produces a valid data URL with the given mime type", () => {
    const buffer = Buffer.from("fake-image-bytes");
    const result = bufferToDataUrl(buffer, "image/jpeg");
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.length).toBeGreaterThan("data:image/jpeg;base64,".length);
  });

  it("defaults to image/jpeg when mime type is omitted", () => {
    const buffer = Buffer.from("fake");
    const result = bufferToDataUrl(buffer);
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });
});

describe("fileToDataUrl", () => {
  it("converts a File to a base64 data URL", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    const file = new File([bytes], "test.png", { type: "image/png" });
    const result = await fileToDataUrl(file);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/poster-image-utils.test.ts 2>&1 | tail -5
```

Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 image-utils.ts**

创建 `/Volumes/FZD/开发项目/Brago/lib/server/poster-templates/shared/image-utils.ts`：

```typescript
export function bufferToDataUrl(
  buffer: Buffer,
  mimeType: string = "image/jpeg"
): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type || "image/jpeg";
  return bufferToDataUrl(buffer, mimeType);
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/poster-image-utils.test.ts 2>&1 | tail -5
```

Expected: `Tests  3 passed (3)`

---

## Task 4：第一个模板 — driveway-hero-split.tsx

**Files:**
- Create: `lib/server/poster-templates/pressure-washing/driveway-hero-split.tsx`

布局（用户选定 C 方案）：After 照片全幅大图，Before 照片叠在左下角 260×260，底部黑色信息条。

- [ ] **Step 1: 创建模板文件**

创建 `/Volumes/FZD/开发项目/Brago/lib/server/poster-templates/pressure-washing/driveway-hero-split.tsx`：

```tsx
import type { RenderFn, RenderInput } from "../shared/types";

function buildTrustLine(input: RenderInput): string {
  const parts: string[] = [];
  if (input.serviceArea) parts.push(input.serviceArea);
  if (input.isLicensed && input.isInsured) parts.push("Licensed · Insured");
  else if (input.isLicensed) parts.push("Licensed");
  else if (input.isInsured) parts.push("Insured");
  if (input.googleReviewCount) parts.push(`★★★★★ ${input.googleReviewCount} Google reviews`);
  return parts.join(" · ");
}

export const driveWayHeroSplit: RenderFn = (input: RenderInput) => {
  const trustLine = buildTrustLine(input);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#111111",
      }}
    >
      {/* ── Main photo area ── */}
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        {/* After photo — full bleed */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={input.afterImageDataUrl}
          alt="after"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* AFTER pill label */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            display: "flex",
            background: "rgba(0,0,0,0.72)",
            color: "#ffffff",
            padding: "5px 14px",
            borderRadius: 24,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 15,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            AFTER
          </span>
        </div>

        {/* Before thumbnail — bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 28,
            width: 260,
            height: 260,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 10,
            border: "3px solid rgba(255,255,255,0.9)",
          }}
        >
          {/* Inner wrapper: position:relative so the BEFORE label can be absolute */}
          <div style={{ flex: 1, display: "flex", position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={input.beforeImageDataUrl}
              alt="before"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* BEFORE pill label */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                display: "flex",
                background: "rgba(0,0,0,0.72)",
                color: "#ffffff",
                padding: "3px 9px",
                borderRadius: 20,
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                BEFORE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom info bar ── */}
      <div
        style={{
          background: "#111111",
          color: "#ffffff",
          padding: "28px 36px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Headline */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#ffffff",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        {/* Trust line */}
        {trustLine.length > 0 && (
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.55)",
              marginTop: 10,
              display: "flex",
            }}
          >
            {trustLine}
          </div>
        )}

        {/* Phone */}
        {input.phone && (
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.40)",
              marginTop: 5,
              display: "flex",
            }}
          >
            {input.phone}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: TypeScript 检查通过**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm exec tsc --noEmit 2>&1 | grep "driveway"
```

Expected: 无输出。

---

## Task 5：registry.ts + 单元测试

**Files:**
- Create: `lib/server/poster-templates/registry.ts`
- Create: `tests/lib/poster-registry.test.ts`

- [ ] **Step 1: 先写失败测试**

创建 `/Volumes/FZD/开发项目/Brago/tests/lib/poster-registry.test.ts`：

```typescript
import { getRenderer, getRegisteredTemplateIds } from "@/lib/server/poster-templates/registry";

describe("poster template registry", () => {
  it("contains the first pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_hero_split");
  });

  it("returns a render function for a valid template id", () => {
    const renderer = getRenderer("pressure_driveway_hero_split");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("returns null for an unknown template id", () => {
    const renderer = getRenderer("nonexistent_template_id");
    expect(renderer).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/poster-registry.test.ts 2>&1 | tail -5
```

Expected: FAIL。

- [ ] **Step 3: 实现 registry.ts**

创建 `/Volumes/FZD/开发项目/Brago/lib/server/poster-templates/registry.ts`：

```typescript
import type { RenderFn } from "./shared/types";
import { driveWayHeroSplit } from "./pressure-washing/driveway-hero-split";

const REGISTRY: Record<string, RenderFn> = {
  pressure_driveway_hero_split: driveWayHeroSplit,
};

export function getRenderer(templateId: string): RenderFn | null {
  return REGISTRY[templateId] ?? null;
}

export function getRegisteredTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/poster-registry.test.ts 2>&1 | tail -5
```

Expected: `Tests  3 passed (3)`

---

## Task 6：public-metadata.ts（前端安全元数据）

**Files:**
- Create: `lib/poster-templates/public-metadata.ts`

- [ ] **Step 1: 创建文件**

创建 `/Volumes/FZD/开发项目/Brago/lib/poster-templates/public-metadata.ts`：

```typescript
import type { BragoTemplateMeta } from "@/lib/server/poster-templates/shared/types";

// 这个文件可以被 client 端 import。
// 不要在这里 import 任何 lib/server/poster-templates/ 下的渲染逻辑。

export const POSTER_TEMPLATES: BragoTemplateMeta[] = [
  {
    id: "pressure_driveway_hero_split",
    name: "Driveway Hero Split",
    industry: "pressure_washing",
    channel: "google_business_profile",
    layoutFamily: "hero_photo",
    photoPairCount: 1,
    previewImage: "/template-previews/pressure_driveway_hero_split.webp",
  },
];

export function getTemplateById(id: string): BragoTemplateMeta | undefined {
  return POSTER_TEMPLATES.find((t) => t.id === id);
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm exec tsc --noEmit 2>&1 | grep "public-metadata"
```

Expected: 无输出。

---

## Task 7：API 路由 /api/posters/render + 验证测试

**Files:**
- Create: `app/api/posters/render/route.ts`
- Create: `tests/api/posters-render.test.ts`

- [ ] **Step 1: 先写失败的验证测试**

创建目录并创建 `/Volumes/FZD/开发项目/Brago/tests/api/posters-render.test.ts`：

```typescript
import { POST } from "@/app/api/posters/render/route";

// Mock satori 和 sharp，避免渲染真实 PNG 影响单元测试速度
vi.mock("satori", () => ({
  default: vi.fn().mockResolvedValue("<svg></svg>"),
}));

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
  })),
}));

// Mock fs.readFileSync for font loading
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-font")),
  };
});

function makeFormData(overrides: Record<string, string | File> = {}): FormData {
  const formData = new FormData();
  const fakeFile = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
  formData.append("beforeImage", fakeFile);
  formData.append("afterImage", fakeFile);
  formData.append("templateId", "pressure_driveway_hero_split");
  formData.append("headline", "Test headline");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("POST /api/posters/render", () => {
  it("returns 400 when beforeImage is missing", async () => {
    const formData = makeFormData();
    formData.delete("beforeImage");
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when afterImage is missing", async () => {
    const formData = makeFormData();
    formData.delete("afterImage");
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when headline is missing", async () => {
    const formData = makeFormData();
    formData.delete("headline");
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 for an unknown templateId", async () => {
    const formData = makeFormData({ templateId: "not_a_real_template" });
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown templateid/i);
  });

  it("returns 200 with Content-Type image/png for valid input", async () => {
    const formData = makeFormData();
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });
});
```

- [ ] **Step 2: 创建目录并运行测试，确认失败**

```bash
mkdir -p /Volumes/FZD/开发项目/Brago/tests/api
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/api/posters-render.test.ts 2>&1 | tail -5
```

Expected: FAIL（route 不存在）。

- [ ] **Step 3: 实现 API 路由**

创建目录并创建 `/Volumes/FZD/开发项目/Brago/app/api/posters/render/route.ts`：

```typescript
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
      .png({ quality: 90 })
      .toBuffer();

    return new Response(pngBuffer, {
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
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/api/posters-render.test.ts 2>&1 | tail -8
```

Expected: `Tests  5 passed (5)`

如果 mock 报错，检查 vi.mock 的路径是否与 import 路径一致。

---

## Task 8：全量验证 + 端到端冒烟测试

**Files:** 无新文件，验证阶段。

- [ ] **Step 1: 运行全量测试**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test 2>&1 | tail -8
```

Expected: 所有测试通过，无 FAIL。

- [ ] **Step 2: Lint 检查**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm lint 2>&1 | tail -5
```

Expected: 0 errors，0 warnings（如有 `@next/next/no-img-element` 警告，是因为 img 标签在 server-only 文件中，可在该文件顶部加 `/* eslint-disable @next/next/no-img-element */`）。

- [ ] **Step 3: 启动开发服务器**

```bash
cd /Volumes/FZD/开发项目/Brago && NEXT_TELEMETRY_DISABLED=1 node_modules/.bin/next dev --port 3000 2>&1 &
sleep 15 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200`

- [ ] **Step 4: 端到端 curl 冒烟测试**

准备两张测试图片（任意 JPG）：

```bash
# 用 curl 下载两张占位图
curl -L "https://picsum.photos/800/600" -o /tmp/before.jpg
curl -L "https://picsum.photos/800/600?random=2" -o /tmp/after.jpg

# 调用渲染 API
curl -X POST http://localhost:3000/api/posters/render \
  -F "beforeImage=@/tmp/before.jpg;type=image/jpeg" \
  -F "afterImage=@/tmp/after.jpg;type=image/jpeg" \
  -F "templateId=pressure_driveway_hero_split" \
  -F "headline=Concrete restored, not replaced." \
  -F "serviceArea=Serving Austin, TX" \
  -F "isLicensed=true" \
  -F "isInsured=true" \
  -F "googleReviewCount=247" \
  -F "phone=(512) 555-0184" \
  -o /tmp/brago-test.png \
  -w "HTTP %{http_code}, Size: %{size_download} bytes\n"
```

Expected: `HTTP 200, Size: >50000 bytes`

- [ ] **Step 5: 用 Finder/Preview 查看 PNG**

```bash
open /tmp/brago-test.png
```

Expected: 打开一张 1080×1080 PNG，能看出：
- After 大图全幅
- 左下角 Before 缩略图（白色边框）
- AFTER/BEFORE 标签（黑底白字 mono 字体）
- 底部黑色信息条：标题 + 服务区域 + 评价数 + 电话

- [ ] **Step 6: 提交**

```bash
cd /Volumes/FZD/开发项目/Brago && git add -A && git commit -m "feat: add poster render infrastructure

- Install satori, add Inter + JetBrains Mono fonts to public/fonts/
- Add shared types, image-utils, template registry
- First template: pressure_driveway_hero_split (After big photo + Before thumbnail)
- POST /api/posters/render: multipart upload → 1080x1080 PNG response
- Tests: image-utils (3), registry (3), API validation (5)"
```
