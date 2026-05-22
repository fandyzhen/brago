# 海报积分扣除 + 生成历史 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在海报渲染流程中接入积分扣除（10积分/张），将每次生成上传 R2 并写入历史，新增历史页面让用户回看、下载、重新生成。

**Architecture:** 全流程内联——`POST /api/posters/render` 先验证登录和积分，渲染 PNG 后上传 R2，再扣积分、写 `generationHistory`，最后返回 PNG 字节流。历史记录通过 `GET /api/posters/history` 分页返回，`/history` 页面展示网格卡片。`/create` 支持 query 参数预填，实现"重新生成"流程。

**Tech Stack:** Drizzle ORM、`@/lib/credits`（canUserAfford/deductCredits/getUserCredits）、`@aws-sdk/client-s3`（复用 r2-storage 模式）、Next.js App Router、Vitest

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/server/r2-poster.ts` | 新建 | PNG buffer → R2，返回 public URL 或 null |
| `tests/lib/r2-poster.test.ts` | 新建 | r2-poster 单元测试 |
| `app/api/posters/render/route.ts` | 修改 | 增加 auth + 积分检查 + R2 + history 写入 |
| `tests/api/posters-render.test.ts` | 修改 | 增加 401/402/R2失败/成功路径测试 |
| `app/api/posters/history/route.ts` | 新建 | GET 历史列表（游标分页） |
| `tests/api/posters-history.test.ts` | 新建 | history API 单元测试 |
| `app/[locale]/(protected)/history/page.tsx` | 新建 | 历史页面（网格 + 分页） |
| `app/[locale]/(protected)/create/page.tsx` | 修改 | 读取 ?templateId=&headline= 预填 |
| `features/navigation/components/user-menu.tsx` | 修改 | 添加 History 菜单项 |

---

## Task 1: R2 poster upload 模块

**Files:**
- Create: `lib/server/r2-poster.ts`
- Test: `tests/lib/r2-poster.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/lib/r2-poster.test.ts`：

```typescript
// @vitest-environment node

vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn(() => ({ send: mockSend })),
    PutObjectCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

import { uploadPosterToR2 } from "@/lib/server/r2-poster";

function setEnv(overrides: Record<string, string>) {
  for (const [k, v] of Object.entries(overrides)) {
    process.env[k] = v;
  }
}
function clearStorageEnv() {
  delete process.env.STORAGE_BUCKET_NAME;
  delete process.env.STORAGE_ACCESS_KEY_ID;
  delete process.env.STORAGE_SECRET_ACCESS_KEY;
  delete process.env.STORAGE_ENDPOINT;
  delete process.env.STORAGE_PUBLIC_URL;
}

describe("uploadPosterToR2", () => {
  beforeEach(() => {
    clearStorageEnv();
    vi.clearAllMocks();
  });

  it("returns null when R2 env vars are not configured", async () => {
    const result = await uploadPosterToR2(Buffer.from("fake-png"), "user-123");
    expect(result).toBeNull();
  });

  it("returns null when only some env vars are set", async () => {
    setEnv({ STORAGE_BUCKET_NAME: "my-bucket" });
    const result = await uploadPosterToR2(Buffer.from("fake-png"), "user-123");
    expect(result).toBeNull();
  });

  it("uploads to R2 and returns public URL when fully configured", async () => {
    setEnv({
      STORAGE_BUCKET_NAME: "my-bucket",
      STORAGE_ACCESS_KEY_ID: "key123",
      STORAGE_SECRET_ACCESS_KEY: "secret456",
      STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      STORAGE_PUBLIC_URL: "https://cdn.example.com",
    });

    const { __mockSend } = await import("@aws-sdk/client-s3") as unknown as { __mockSend: ReturnType<typeof vi.fn> };
    __mockSend.mockResolvedValueOnce({});

    const result = await uploadPosterToR2(Buffer.from("fake-png"), "user-abc");

    expect(result).toMatch(/^https:\/\/cdn\.example\.com\/posters\/user-abc\//);
    expect(result).toMatch(/\.png$/);
    expect(__mockSend).toHaveBeenCalledOnce();
  });

  it("throws when S3 send fails", async () => {
    setEnv({
      STORAGE_BUCKET_NAME: "my-bucket",
      STORAGE_ACCESS_KEY_ID: "key123",
      STORAGE_SECRET_ACCESS_KEY: "secret456",
      STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      STORAGE_PUBLIC_URL: "https://cdn.example.com",
    });

    const { __mockSend } = await import("@aws-sdk/client-s3") as unknown as { __mockSend: ReturnType<typeof vi.fn> };
    __mockSend.mockRejectedValueOnce(new Error("S3 network error"));

    await expect(uploadPosterToR2(Buffer.from("fake-png"), "user-abc")).rejects.toThrow("S3 network error");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test tests/lib/r2-poster.test.ts
```

期望：FAIL（`uploadPosterToR2` 不存在）

- [ ] **Step 3: 实现 `lib/server/r2-poster.ts`**

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Upload a PNG buffer to Cloudflare R2.
 * Returns the public URL, or null if R2 is not configured.
 * Throws if R2 is configured but the upload fails.
 */
export async function uploadPosterToR2(
  buffer: Buffer,
  userId: string
): Promise<string | null> {
  const bucketName = process.env.STORAGE_BUCKET_NAME;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const endpoint = process.env.STORAGE_ENDPOINT;
  const publicUrl = process.env.STORAGE_PUBLIC_URL;

  // Graceful degradation: if R2 is not configured, skip upload
  if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint || !publicUrl) {
    return null;
  }

  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  const key = `posters/${userId}/${timestamp}-${randomId}.png`;

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    })
  );

  return `${publicUrl}/${key}`;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test tests/lib/r2-poster.test.ts
```

期望：4 passed

- [ ] **Step 5: 提交**

```bash
git add lib/server/r2-poster.ts tests/lib/r2-poster.test.ts
git commit -m "feat: add r2-poster upload module with graceful degradation"
```

---

## Task 2: 更新 render 路由（接入 auth + 积分 + R2 + 历史）

**Files:**
- Modify: `app/api/posters/render/route.ts`
- Modify: `tests/api/posters-render.test.ts`

- [ ] **Step 1: 重写测试文件，加入新 mock 和新用例**

完整替换 `tests/api/posters-render.test.ts`：

```typescript
// @vitest-environment node
import { POST } from "@/app/api/posters/render/route";

// ── 现有 mock（保留不变）──────────────────────────────────────────
vi.mock("satori", () => ({
  default: vi.fn().mockResolvedValue("<svg></svg>"),
}));

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
  })),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    default: {
      ...(actual as unknown as Record<string, unknown>),
      readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-font")),
    },
    readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-font")),
  };
});

// ── 新增 mock ─────────────────────────────────────────────────────
vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(),
}));

vi.mock("@/lib/credits", () => ({
  canUserAfford: vi.fn(),
  getUserCredits: vi.fn(),
  deductCredits: vi.fn(),
}));

vi.mock("@/lib/server/r2-poster", () => ({
  uploadPosterToR2: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn() },
}));

import { getActiveSessionUser } from "@/lib/auth/session";
import { canUserAfford, getUserCredits, deductCredits } from "@/lib/credits";
import { uploadPosterToR2 } from "@/lib/server/r2-poster";
import { db } from "@/lib/db";

// ── 默认 mock 值（登录成功、积分充足、R2 跳过）────────────────────
const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
  role: "user",
  banned: false,
  banExpires: null,
  emailVerified: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: true, user: MOCK_USER });
  vi.mocked(canUserAfford).mockResolvedValue(true);
  vi.mocked(getUserCredits).mockResolvedValue(100);
  vi.mocked(deductCredits).mockResolvedValue({ success: true, remainingCredits: 90 });
  vi.mocked(uploadPosterToR2).mockResolvedValue(null); // R2 not configured
  const insertChain = { values: vi.fn().mockResolvedValue([]) };
  vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);
});

// ── 工具函数 ──────────────────────────────────────────────────────
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

function makeRequest(fd: FormData): Request {
  return new Request("http://localhost/api/posters/render", {
    method: "POST",
    body: fd,
  });
}

// ── 原有测试（保持通过）──────────────────────────────────────────
describe("POST /api/posters/render — validation", () => {
  it("returns 400 when beforeImage is missing", async () => {
    const fd = makeFormData();
    fd.delete("beforeImage");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 400 when afterImage is missing", async () => {
    const fd = makeFormData();
    fd.delete("afterImage");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 400 when headline is missing", async () => {
    const fd = makeFormData();
    fd.delete("headline");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 400 for an unknown templateId", async () => {
    const fd = makeFormData({ templateId: "not_a_real_template" });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unknown templateid/i);
  });

  it("returns 400 when image file exceeds 10MB", async () => {
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    const fd = makeFormData();
    fd.set("beforeImage", bigFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/10mb/i);
  });
});

// ── 新增测试 ──────────────────────────────────────────────────────
describe("POST /api/posters/render — auth & credits", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: false, error: "Unauthorized", status: 401 });
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 402 when user has insufficient credits", async () => {
    vi.mocked(canUserAfford).mockResolvedValue(false);
    vi.mocked(getUserCredits).mockResolvedValue(3);
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toMatch(/insufficient credits/i);
    expect(body.required).toBe(10);
    expect(body.available).toBe(3);
  });

  it("returns 500 and does NOT deduct credits when R2 upload throws", async () => {
    vi.mocked(uploadPosterToR2).mockRejectedValueOnce(new Error("R2 down"));
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(500);
    expect(deductCredits).not.toHaveBeenCalled();
  });
});

describe("POST /api/posters/render — success path", () => {
  it("returns 200 PNG, calls deductCredits and db.insert on success", async () => {
    vi.mocked(uploadPosterToR2).mockResolvedValue("https://cdn.example.com/posters/user-123/abc.png");

    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(deductCredits).toHaveBeenCalledWith("user-123", 10, "poster_generation");
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("still returns 200 PNG even when db.insert fails (degraded mode)", async () => {
    const badInsertChain = { values: vi.fn().mockRejectedValueOnce(new Error("DB down")) };
    vi.mocked(db.insert).mockReturnValueOnce(badInsertChain as unknown as ReturnType<typeof db.insert>);

    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 500 when satori throws", async () => {
    const { default: satoriMock } = await import("satori");
    (satoriMock as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("satori crash"));
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/render failed/i);
  });
});
```

- [ ] **Step 2: 运行测试确认新用例失败**

```bash
pnpm test tests/api/posters-render.test.ts
```

期望：旧的 7 个测试因缺少 auth mock 初始化而失败或混乱；新用例（401/402/R2失败）因路由尚未实现而失败。

- [ ] **Step 3: 完整替换 `app/api/posters/render/route.ts`**

```typescript
import { readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";
import { getActiveSessionUser } from "@/lib/auth/session";
import { canUserAfford, getUserCredits, deductCredits } from "@/lib/credits";
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

    // ── 5. Upload to R2 (throws on failure → caught below) ───────
    const resultUrl = await uploadPosterToR2(pngBuffer, userId);

    // ── 6. Deduct credits ─────────────────────────────────────────
    const deductResult = await deductCredits(userId, POSTER_CREDIT_COST, "poster_generation");
    if (!deductResult.success) {
      return Response.json({ error: "Failed to deduct credits" }, { status: 500 });
    }

    // ── 7. Write history (degraded on failure — PNG still returned) ─
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
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
pnpm test tests/api/posters-render.test.ts
```

期望：13 passed

- [ ] **Step 5: 提交**

```bash
git add app/api/posters/render/route.ts tests/api/posters-render.test.ts
git commit -m "feat: render route — auth guard, 10-credit cost, R2 upload, history write"
```

---

## Task 3: GET /api/posters/history

**Files:**
- Create: `app/api/posters/history/route.ts`
- Create: `tests/api/posters-history.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `tests/api/posters-history.test.ts`：

```typescript
// @vitest-environment node
import { GET } from "@/app/api/posters/history/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const MOCK_USER = { id: "user-123", email: "test@example.com", role: "user", banned: false, banExpires: null, emailVerified: true };

function mockAuth() {
  vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: true, user: MOCK_USER });
}

function mockDbSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);
  return chain;
}

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/posters/history");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: "GET" });
}

describe("GET /api/posters/history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: false, error: "Unauthorized", status: 401 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns empty items when no history exists", async () => {
    mockAuth();
    mockDbSelect([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.hasMore).toBe(false);
    expect(body.nextCursor).toBeNull();
  });

  it("returns mapped items with correct fields", async () => {
    mockAuth();
    const row = {
      id: "hist-1",
      createdAt: new Date("2026-05-22T10:00:00Z"),
      prompt: "Driveway Clean",
      resultUrl: "https://cdn.example.com/posters/abc.png",
      creditsUsed: 10,
      metadata: JSON.stringify({ templateId: "pressure_driveway_hero_split", headline: "Driveway Clean" }),
      type: "poster",
      status: "completed",
    };
    mockDbSelect([row]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    const item = body.items[0];
    expect(item.id).toBe("hist-1");
    expect(item.headline).toBe("Driveway Clean");
    expect(item.templateId).toBe("pressure_driveway_hero_split");
    expect(item.templateName).toBe("Driveway Hero Split");
    expect(item.resultUrl).toBe("https://cdn.example.com/posters/abc.png");
    expect(item.creditsUsed).toBe(10);
    expect(item.createdAt).toBe("2026-05-22T10:00:00.000Z");
  });

  it("sets hasMore=true and nextCursor when more items exist", async () => {
    mockAuth();
    // Return 21 rows (limit defaults to 20, we fetch limit+1)
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `hist-${i}`,
      createdAt: new Date(`2026-05-22T${String(10 + i).padStart(2, "0")}:00:00Z`),
      prompt: `headline ${i}`,
      resultUrl: null,
      creditsUsed: 10,
      metadata: JSON.stringify({ templateId: "pressure_driveway_hero_split", headline: `headline ${i}` }),
      type: "poster",
      status: "completed",
    }));
    mockDbSelect(rows);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.items).toHaveLength(20);
    expect(body.hasMore).toBe(true);
    expect(body.nextCursor).not.toBeNull();
  });

  it("respects custom limit parameter", async () => {
    mockAuth();
    mockDbSelect([]);
    const chain = vi.mocked(db.select)();
    await GET(makeRequest({ limit: "5" }));
    // limit(6) called because we fetch limit+1
    expect(chain.limit).toHaveBeenCalledWith(6);
  });

  it("handles corrupted metadata gracefully", async () => {
    mockAuth();
    const row = {
      id: "hist-bad",
      createdAt: new Date("2026-05-22T10:00:00Z"),
      prompt: "Fallback headline",
      resultUrl: null,
      creditsUsed: 10,
      metadata: "NOT_VALID_JSON",
      type: "poster",
      status: "completed",
    };
    mockDbSelect([row]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].headline).toBe("Fallback headline"); // falls back to prompt
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test tests/api/posters-history.test.ts
```

期望：FAIL（route 不存在）

- [ ] **Step 3: 实现 `app/api/posters/history/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generationHistory } from "@/lib/db/schema";
import { getTemplateById } from "@/lib/poster-templates/public-metadata";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw, MAX_LIMIT);
  const cursor = searchParams.get("cursor"); // ISO timestamp

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [
      eq(generationHistory.userId, access.user.id),
      eq(generationHistory.type, "poster"),
    ];

    if (cursor) {
      conditions.push(lt(generationHistory.createdAt, new Date(cursor)));
    }

    const rows = await db
      .select()
      .from(generationHistory)
      .where(and(...conditions))
      .orderBy(desc(generationHistory.createdAt))
      .limit(limit + 1); // fetch one extra to determine hasMore

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    const mapped = items.map((row) => {
      let meta: { templateId?: string; headline?: string } = {};
      try {
        meta = row.metadata ? (JSON.parse(row.metadata) as typeof meta) : {};
      } catch {
        // ignore JSON parse errors; fall back to prompt field
      }
      const template = meta.templateId ? getTemplateById(meta.templateId) : undefined;
      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        headline: meta.headline ?? row.prompt,
        templateId: meta.templateId ?? null,
        templateName: template?.name ?? null,
        resultUrl: row.resultUrl,
        creditsUsed: row.creditsUsed,
      };
    });

    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1]!.createdAt.toISOString()
        : null;

    return NextResponse.json({ items: mapped, nextCursor, hasMore });
  } catch (err) {
    console.error("[posters/history GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm test tests/api/posters-history.test.ts
```

期望：6 passed

- [ ] **Step 5: 提交**

```bash
git add app/api/posters/history/route.ts tests/api/posters-history.test.ts
git commit -m "feat: add GET /api/posters/history with cursor pagination"
```

---

## Task 4: /create 页面接受 query 预填参数

**Files:**
- Modify: `app/[locale]/(protected)/create/page.tsx`

- [ ] **Step 1: 在文件顶部 import 中加入 `useSearchParams`**

在 `app/[locale]/(protected)/create/page.tsx` 第 4 行，将：

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
```

改为：

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
```

- [ ] **Step 2: 修改 `CreatePage` 函数中的 state 初始化，读取 query 参数**

找到以下代码块（约第 160-175 行）：

```typescript
export default function CreatePage() {
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    POSTER_TEMPLATES[0]?.id ?? ""
  );
  const [headline, setHeadline] = useState("");
```

替换为：

```typescript
export default function CreatePage() {
  const searchParams = useSearchParams();
  const initTemplate =
    searchParams.get("templateId") ?? POSTER_TEMPLATES[0]?.id ?? "";
  const initHeadline = decodeURIComponent(searchParams.get("headline") ?? "");

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initTemplate);
  const [headline, setHeadline] = useState(initHeadline);
```

- [ ] **Step 3: 在 `handleGenerate` 函数中加入 402 积分不足的错误处理**

找到以下代码块：

```typescript
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setGenerateState({ status: "error", message: err.error ?? "Render failed" });
        return;
      }
```

替换为：

```typescript
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        const msg =
          res.status === 402
            ? `Insufficient credits — need ${(err as { required?: number }).required ?? 10} credits`
            : (err.error ?? "Render failed");
        setGenerateState({ status: "error", message: msg });
        return;
      }
```

- [ ] **Step 4: 运行 lint 确认无报错**

```bash
pnpm lint
```

期望：0 errors, 0 warnings

- [ ] **Step 5: 提交**

```bash
git add "app/[locale]/(protected)/create/page.tsx"
git commit -m "feat: /create reads ?templateId & ?headline query params, shows 402 error"
```

---

## Task 5: /history 页面

**Files:**
- Create: `app/[locale]/(protected)/history/page.tsx`

- [ ] **Step 1: 创建页面文件**

新建 `app/[locale]/(protected)/history/page.tsx`：

```typescript
"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Background } from "@/components/background";
import { Container } from "@/components/container";
import { Button } from "@/components/button";

// ── Types ─────────────────────────────────────────────────────────────────

type HistoryItem = {
  id: string;
  createdAt: string;
  headline: string;
  templateId: string | null;
  templateName: string | null;
  resultUrl: string | null;
  creditsUsed: number;
};

type HistoryResponse = {
  items: HistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── PosterCard ─────────────────────────────────────────────────────────────

function PosterCard({ item }: { item: HistoryItem }) {
  const regenHref = `/create?templateId=${encodeURIComponent(item.templateId ?? "")}&headline=${encodeURIComponent(item.headline)}`;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-900 flex flex-col">
      {/* Thumbnail */}
      <div className="aspect-square bg-neutral-100 dark:bg-neutral-800 relative">
        {item.resultUrl ? (
          <img
            src={item.resultUrl}
            alt={item.headline}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-neutral-400">
            No preview
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-0.5 flex-1">
        <p className="text-sm font-medium truncate" title={item.headline}>
          {item.headline}
        </p>
        {item.templateName && (
          <p className="text-xs text-neutral-400">{item.templateName}</p>
        )}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
          <span>{timeAgo(item.createdAt)}</span>
          <span>{item.creditsUsed} credits</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        {item.resultUrl ? (
          <a
            href={item.resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Download
          </a>
        ) : (
          <span className="flex-1 text-center text-xs py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 opacity-40 cursor-not-allowed select-none">
            Download
          </span>
        )}
        <Link
          href={regenHref}
          className="flex-1 text-center text-xs py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
        >
          Re-generate
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchHistory = useCallback(async (nextCursor: string | null = null) => {
    const params = new URLSearchParams({ limit: "20" });
    if (nextCursor) params.set("cursor", nextCursor);

    const res = await fetch(`/api/posters/history?${params.toString()}`);
    if (!res.ok) return;
    const data: HistoryResponse = await res.json();
    return data;
  }, []);

  // Initial load
  useEffect(() => {
    fetchHistory()
      .then((data) => {
        if (data) {
          setItems(data.items);
          setCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchHistory]);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchHistory(cursor);
      if (data) {
        setItems((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-1">Post History</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Your previously generated social posts.
              </p>
            </div>
            <Link href="/create">
              <Button>Create new</Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-neutral-100 dark:bg-neutral-800" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-neutral-400 text-sm mb-4">
                No posts yet. Generate your first social post!
              </p>
              <Link href="/create">
                <Button>Create your first post</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                  <PosterCard key={item.id} item={item} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </Container>
    </div>
  );
}
```

- [ ] **Step 2: 运行 lint 确认无报错**

```bash
pnpm lint
```

期望：0 errors, 0 warnings

- [ ] **Step 3: 提交**

```bash
git add "app/[locale]/(protected)/history/page.tsx"
git commit -m "feat: add /history page with poster grid, pagination, re-generate link"
```

---

## Task 6: 导航菜单添加 History 链接

**Files:**
- Modify: `features/navigation/components/user-menu.tsx`

- [ ] **Step 1: 在 import 中加入 `IconHistory`**

找到：

```typescript
import {
  IconUser,
  IconLogout,
  IconLayoutDashboard,
  IconShield,
  IconCoins,
  IconSettings,
  IconPhoto,
} from "@tabler/icons-react";
```

替换为：

```typescript
import {
  IconUser,
  IconLogout,
  IconLayoutDashboard,
  IconShield,
  IconCoins,
  IconSettings,
  IconPhoto,
  IconHistory,
} from "@tabler/icons-react";
```

- [ ] **Step 2: 在 "Create Post" 链接后插入 "History" 链接**

找到：

```typescript
            <Link
              href={`/${locale}/create`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-hover transition-colors"
            >
              <IconPhoto className="w-4 h-4" />
              Create Post
            </Link>

            <Link
              href={`/${locale}/settings`}
```

替换为：

```typescript
            <Link
              href={`/${locale}/create`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-hover transition-colors"
            >
              <IconPhoto className="w-4 h-4" />
              Create Post
            </Link>

            <Link
              href={`/${locale}/history`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-hover transition-colors"
            >
              <IconHistory className="w-4 h-4" />
              History
            </Link>

            <Link
              href={`/${locale}/settings`}
```

- [ ] **Step 3: 运行 lint**

```bash
pnpm lint
```

期望：0 errors, 0 warnings

- [ ] **Step 4: 提交**

```bash
git add features/navigation/components/user-menu.tsx
git commit -m "feat: add History link to user menu"
```

---

## Task 7: 全量验证 + 推送

**Files:** 无新增文件

- [ ] **Step 1: 运行全量测试**

```bash
pnpm test
```

期望：所有测试通过（原有 89 个 + 新增约 23 个 = ~112 passed，0 failed）

- [ ] **Step 2: 运行 lint**

```bash
pnpm lint
```

期望：0 errors, 0 warnings

- [ ] **Step 3: TypeScript 类型检查**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

期望：无 TypeScript 错误（build 成功或仅有已知的非 TS 警告）

- [ ] **Step 4: 推送到 GitHub**

```bash
git push origin main
```

- [ ] **Step 5: 确认成功标准**

手动检查（启动 `pnpm dev`）：

1. 未登录时访问 `/create` → 被重定向到 `/login` ✅
2. 登录后访问 `/create`，积分为 0 时点击 Generate → 显示 "Insufficient credits — need 10 credits" ✅
3. 积分充足时生成 → 下载 PNG，访问 `/history` 看到新记录 ✅
4. 点击历史卡片的 Re-generate → 跳转 `/create?templateId=...&headline=...` 并预填 ✅
5. R2 未配置时（本地开发）：历史记录写入成功，但 resultUrl 为 null，Download 按钮禁用 ✅
