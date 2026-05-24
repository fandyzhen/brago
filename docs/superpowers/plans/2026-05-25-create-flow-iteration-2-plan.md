# Create 流程二轮重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Create 流程升级为"双输入（description + headline）→ 纯模板 3 张缩略图（免费）→ 选中下载得 1080 高清版"。核心原则：**AI 介入才扣，AI 不介入不扣**。本次（AI 未接入）全程零积分；P1-5 翻 `ENABLE_AI_FINALIZE` flag 后 finalize 路径才扣 10/新模板。

**Architecture:** 引入 server-side 内存 `batchCache`（30min TTL + LRU）作为预览状态容器：preview-batch 渲 3 张 360 缩略图存入；finalize 拿原图重新渲 1080 高清，同 (batchId, index) 命中 cache 不重复渲染。env flag `ENABLE_AI_FINALIZE` 控制 finalize 是否插入豆包 i2i + 扣费两件事，两件事捆绑。

**Tech Stack:** Next.js 16 App Router · satori + sharp · vitest 4 · Drizzle ORM · Better Auth

**Spec reference:** `docs/superpowers/specs/2026-05-25-create-flow-iteration-2-design.md`

---

## File Structure

| 路径 | 操作 | 职责 |
|---|---|---|
| `lib/server/poster-preview-cache.ts` | 新建 | batchCache singleton：set/get/expire/LRU/usedIndices/downloadedDataUrls |
| `app/api/posters/preview-batch/route.ts` | 改造 | 渲 3 张 360 缩略图 + 写 cache + **不扣积分** |
| `app/api/posters/finalize/route.ts` | 新建 | 校验 cache + flag 控制 AI/扣费 + 渲 1080 + 写 post |
| `app/api/posters/caption/route.ts` | 改 | 加 `description` 入参 + LLM 失败 fallback 到 stub |
| `app/[locale]/(protected)/create/page.tsx` | 重写 | 双输入 + 缩略图选中 + Download 按 flag 显示价格 |
| `tests/lib/poster-preview-cache.test.ts` | 新建 | cache TTL / LRU / usedIndices 累加 |
| `tests/lib/orientation-match.test.ts` | 新建 | landscape/portrait/square 推荐顺序 |
| `tests/api/posters-preview-batch.test.ts` | 新建 | 渲 360 缩略图、写 cache、**断言不扣** |
| `tests/api/posters-finalize.test.ts` | 新建 | flag=false 不扣、flag=true 扣 10、cache 命中不扣、410 / 402 / 500 退积分 |
| `tests/api/posters-caption.test.ts` | 改 | 加 description；LLM 失败走 stub 断言 |

---

## Task 1: batchCache 模块 — 写 + getter + TTL

**Files:**
- Create: `lib/server/poster-preview-cache.ts`
- Test: `tests/lib/poster-preview-cache.test.ts`

- [ ] **Step 1: 写失败的测试**

Create `tests/lib/poster-preview-cache.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setBatch,
  getBatch,
  deleteBatch,
  markIndexUsed,
  cleanupExpired,
  _resetForTests,
} from "@/lib/server/poster-preview-cache";

const sampleEntry = () => ({
  userId: "user_1",
  beforeDataUrl: "data:image/png;base64,AAA",
  afterDataUrl: "data:image/png;base64,BBB",
  headline: "Driveway Cleaned",
  description: "Cleaned in 3 hours",
  brandFields: {
    businessName: "Smith Pressure",
    isLicensed: false,
    isInsured: false,
  },
  items: [
    { templateId: "t1", name: "T1", thumbnailDataUrl: "data:image/png;base64,XXX" },
  ],
});

describe("poster-preview-cache", () => {
  beforeEach(() => _resetForTests());

  it("stores and retrieves a batch by id", () => {
    setBatch("batch_1", sampleEntry());
    const got = getBatch("batch_1");
    expect(got?.userId).toBe("user_1");
    expect(got?.items.length).toBe(1);
    expect(got?.usedIndices.size).toBe(0);
  });

  it("returns undefined for expired batch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    setBatch("batch_old", sampleEntry());
    vi.setSystemTime(new Date("2026-01-01T00:31:00Z")); // 31min later, past 30min TTL
    expect(getBatch("batch_old")).toBeUndefined();
    vi.useRealTimers();
  });

  it("cleanupExpired removes only past-TTL entries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    setBatch("batch_old", sampleEntry());
    vi.setSystemTime(new Date("2026-01-01T00:20:00Z"));
    setBatch("batch_new", sampleEntry());
    vi.setSystemTime(new Date("2026-01-01T00:31:00Z"));
    cleanupExpired();
    expect(getBatch("batch_old")).toBeUndefined();
    expect(getBatch("batch_new")).toBeDefined();
    vi.useRealTimers();
  });

  it("markIndexUsed appends to usedIndices + downloadedDataUrls", () => {
    setBatch("batch_2", sampleEntry());
    markIndexUsed("batch_2", 0, "data:image/png;base64,HIRES");
    const got = getBatch("batch_2");
    expect(got?.usedIndices.has(0)).toBe(true);
    expect(got?.downloadedDataUrls.get(0)).toBe("data:image/png;base64,HIRES");
  });

  it("evicts oldest when over LRU cap", () => {
    for (let i = 0; i < 205; i++) setBatch(`b${i}`, sampleEntry());
    // Cap is 200; the earliest 5 should be gone
    expect(getBatch("b0")).toBeUndefined();
    expect(getBatch("b4")).toBeUndefined();
    expect(getBatch("b5")).toBeDefined();
    expect(getBatch("b204")).toBeDefined();
  });

  it("deleteBatch removes the entry", () => {
    setBatch("batch_3", sampleEntry());
    deleteBatch("batch_3");
    expect(getBatch("batch_3")).toBeUndefined();
  });
});
```

- [ ] **Step 2: 跑测试确认全红**

Run: `pnpm test tests/lib/poster-preview-cache.test.ts`

Expected: FAIL — `Cannot find module '@/lib/server/poster-preview-cache'`

- [ ] **Step 3: 实现 cache 模块**

Create `lib/server/poster-preview-cache.ts`:

```ts
/**
 * Server-side in-memory cache for poster preview batches.
 *
 * Lifecycle:
 *   preview-batch endpoint  → setBatch()       (thumbnails only)
 *   finalize endpoint       → getBatch()       (read originals to render 1080)
 *   finalize endpoint       → markIndexUsed()  (after charging + writing post)
 *
 * Eviction:
 *   - 30 min TTL on each entry
 *   - LRU cap at MAX_ENTRIES (oldest createdAt gets evicted on overflow)
 *   - Periodic cleanupExpired() runs every 5 min
 */

export type BatchItem = {
  templateId: string;
  name: string;
  thumbnailDataUrl: string;
};

export type BatchBrandFields = {
  businessName?: string;
  phone?: string;
  serviceArea?: string;
  isLicensed: boolean;
  isInsured: boolean;
  googleReviewCount?: number;
};

export type BatchEntry = {
  userId: string;
  beforeDataUrl: string;
  afterDataUrl: string;
  headline: string;
  description?: string;
  brandFields: BatchBrandFields;
  items: BatchItem[];
  usedIndices: Set<number>;
  downloadedDataUrls: Map<number, string>;
  createdAt: number;
  expiresAt: number;
};

export type BatchEntryInput = Omit<
  BatchEntry,
  "usedIndices" | "downloadedDataUrls" | "createdAt" | "expiresAt"
>;

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 200;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const cache = new Map<string, BatchEntry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanupTimer() {
  if (cleanupTimer || typeof setInterval !== "function") return;
  cleanupTimer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
  // Don't keep Node process alive on this timer
  if (typeof (cleanupTimer as unknown as { unref?: () => void }).unref === "function") {
    (cleanupTimer as unknown as { unref: () => void }).unref();
  }
}

export function setBatch(batchId: string, input: BatchEntryInput): void {
  const now = Date.now();
  cache.set(batchId, {
    ...input,
    usedIndices: new Set<number>(),
    downloadedDataUrls: new Map<number, string>(),
    createdAt: now,
    expiresAt: now + TTL_MS,
  });
  evictIfOverCap();
  ensureCleanupTimer();
}

export function getBatch(batchId: string): BatchEntry | undefined {
  const entry = cache.get(batchId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(batchId);
    return undefined;
  }
  return entry;
}

export function deleteBatch(batchId: string): void {
  cache.delete(batchId);
}

export function markIndexUsed(batchId: string, index: number, hiResDataUrl: string): void {
  const entry = cache.get(batchId);
  if (!entry) return;
  entry.usedIndices.add(index);
  entry.downloadedDataUrls.set(index, hiResDataUrl);
}

export function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(id);
  }
}

function evictIfOverCap(): void {
  if (cache.size <= MAX_ENTRIES) return;
  const overflow = cache.size - MAX_ENTRIES;
  // Map iteration order is insertion order in JS — oldest first
  let i = 0;
  for (const id of cache.keys()) {
    if (i >= overflow) break;
    cache.delete(id);
    i++;
  }
}

/** Test-only: clear cache + cancel timer. */
export function _resetForTests(): void {
  cache.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
```

- [ ] **Step 4: 跑测试确认全绿**

Run: `pnpm test tests/lib/poster-preview-cache.test.ts`

Expected: PASS — all 6 tests green

- [ ] **Step 5: 提交**

```bash
git add lib/server/poster-preview-cache.ts tests/lib/poster-preview-cache.test.ts
git commit -m "feat(poster): add server-side preview batch cache with 30min TTL + LRU"
```

---

## Task 2: orientation-match 测试补齐

**Files:**
- Test: `tests/lib/orientation-match.test.ts`

> 实现已存在 (`lib/poster-templates/orientation-match.ts`)，spec 9 节要求补测试。

- [ ] **Step 1: 写测试**

Create `tests/lib/orientation-match.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectOrientation, pickPreviewTemplates } from "@/lib/poster-templates/orientation-match";

describe("orientation-match", () => {
  describe("detectOrientation", () => {
    it("returns landscape when width significantly > height", () => {
      expect(detectOrientation(1600, 900)).toBe("landscape");
      expect(detectOrientation(1200, 1000)).toBe("landscape"); // ratio 1.2
    });
    it("returns portrait when height significantly > width", () => {
      expect(detectOrientation(900, 1600)).toBe("portrait");
      expect(detectOrientation(1000, 1200)).toBe("portrait"); // ratio 0.83
    });
    it("returns square when ratio within ±10%", () => {
      expect(detectOrientation(1080, 1080)).toBe("square");
      expect(detectOrientation(1000, 1050)).toBe("square");
    });
    it("returns square for invalid dimensions", () => {
      expect(detectOrientation(0, 1000)).toBe("square");
      expect(detectOrientation(-100, 100)).toBe("square");
    });
  });

  describe("pickPreviewTemplates", () => {
    it("never returns collage templates", () => {
      const picks = pickPreviewTemplates("landscape", 10);
      for (const t of picks) expect(t.layoutFamily).not.toBe("collage");
    });
    it("returns at most `count` templates", () => {
      expect(pickPreviewTemplates("square", 3).length).toBeLessThanOrEqual(3);
      expect(pickPreviewTemplates("landscape", 2).length).toBeLessThanOrEqual(2);
    });
    it("landscape prioritizes split/card_pair (score 3) ahead of stacked (score 1)", () => {
      // Run a few times to average out randomness within score buckets
      const picks = pickPreviewTemplates("landscape", 3);
      const families = picks.map((p) => p.layoutFamily);
      // At least one of the top picks should be a 3-scored family
      const topFamilies = new Set(["split", "card_pair"]);
      expect(families.some((f) => topFamilies.has(f))).toBe(true);
    });
    it("portrait prioritizes stacked/hero_photo over split", () => {
      const picks = pickPreviewTemplates("portrait", 3);
      const families = picks.map((p) => p.layoutFamily);
      const topFamilies = new Set(["stacked", "hero_photo"]);
      expect(families.some((f) => topFamilies.has(f))).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 跑测试**

Run: `pnpm test tests/lib/orientation-match.test.ts`

Expected: PASS — all 8 tests green

- [ ] **Step 3: 提交**

```bash
git add tests/lib/orientation-match.test.ts
git commit -m "test(poster): cover orientation detection + template picker"
```

---

## Task 3: preview-batch 改造 — 只渲 360 缩略图 + 写 cache + 不扣

**Files:**
- Modify: `app/api/posters/preview-batch/route.ts`
- Test: `tests/api/posters-preview-batch.test.ts` (new)

**关键变化** vs 现有实现:
- 移除 `canUserAfford` / `deductCredits` 调用（永远不扣）
- 渲染分辨率从 1080×1080 改成 360×360
- 增加 `description` 字段接收
- 渲染成功后写入 batchCache，响应只含缩略图
- 响应增加 `aiFinalizeEnabled: boolean`（读 `process.env.ENABLE_AI_FINALIZE === "true"`），供前端按钮文案切换

- [ ] **Step 1: 写失败的测试**

Create `tests/api/posters-preview-batch.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock auth + credits + renderer + cache before importing the route
vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(async () => ({
    ok: true,
    user: { id: "user_1" },
  })),
}));

const deductCreditsMock = vi.fn();
const canUserAffordMock = vi.fn(async () => true);
vi.mock("@/lib/credits", () => ({
  deductCredits: deductCreditsMock,
  canUserAfford: canUserAffordMock,
  getUserCredits: vi.fn(async () => 100),
  getUserPlanKey: vi.fn(async () => "free"),
}));

vi.mock("@/lib/server/poster-templates/registry", () => ({
  getRenderer: vi.fn(() => () => ({ type: "div", props: { children: "stub" } })),
}));

vi.mock("@/lib/poster-templates/public-metadata", () => ({
  getTemplateById: vi.fn((id: string) =>
    id === "collage_x"
      ? { id, name: "C", layoutFamily: "collage" }
      : { id, name: "T " + id, layoutFamily: "split" }
  ),
}));

vi.mock("satori", () => ({
  default: vi.fn(async () => "<svg/>"),
}));
vi.mock("sharp", () => ({
  default: () => ({
    png: () => ({ resize: () => ({ toBuffer: async () => Buffer.from("PNGDATA") }) }),
    resize: () => ({ png: () => ({ toBuffer: async () => Buffer.from("PNGDATA") }) }),
  }),
}));

vi.mock("@/lib/server/watermark", () => ({
  applyWatermark: vi.fn(async (b: Buffer) => b),
}));

import { setBatch, getBatch, _resetForTests } from "@/lib/server/poster-preview-cache";
import { POST } from "@/app/api/posters/preview-batch/route";

function makeFormRequest(): Request {
  const fd = new FormData();
  fd.set("headline", "Driveway Cleaned");
  fd.set("description", "Cleaned a driveway in 3 hours");
  fd.set("templateIds", JSON.stringify(["t1", "t2", "t3"]));
  fd.set("businessName", "Smith Pressure");
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  fd.set("beforeImage", new File([blob], "b.png", { type: "image/png" }));
  fd.set("afterImage", new File([blob], "a.png", { type: "image/png" }));
  return new Request("http://x/api/posters/preview-batch", { method: "POST", body: fd });
}

describe("/api/posters/preview-batch", () => {
  beforeEach(() => {
    _resetForTests();
    deductCreditsMock.mockReset();
    canUserAffordMock.mockReset().mockResolvedValue(true);
  });

  it("renders 3 thumbnails and writes a batch to cache WITHOUT deducting credits", async () => {
    const res = await POST(makeFormRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.batchId).toMatch(/.+/);
    expect(body.thumbnails).toHaveLength(3);
    for (const t of body.thumbnails) {
      expect(t.thumbnailDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    }
    expect(body.aiFinalizeEnabled).toBe(false);
    // NEVER calls deductCredits
    expect(deductCreditsMock).not.toHaveBeenCalled();

    // Cache written with original image dataURLs + brandFields
    const entry = getBatch(body.batchId);
    expect(entry?.userId).toBe("user_1");
    expect(entry?.headline).toBe("Driveway Cleaned");
    expect(entry?.description).toBe("Cleaned a driveway in 3 hours");
    expect(entry?.brandFields.businessName).toBe("Smith Pressure");
    expect(entry?.items).toHaveLength(3);
  });

  it("rejects a collage templateId", async () => {
    const fd = new FormData();
    fd.set("headline", "x");
    fd.set("templateIds", JSON.stringify(["collage_x"]));
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    fd.set("beforeImage", new File([blob], "b.png", { type: "image/png" }));
    fd.set("afterImage", new File([blob], "a.png", { type: "image/png" }));
    const req = new Request("http://x", { method: "POST", body: fd });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("exposes aiFinalizeEnabled=true when env flag is set", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    try {
      const res = await POST(makeFormRequest());
      const body = await res.json();
      expect(body.aiFinalizeEnabled).toBe(true);
    } finally {
      delete process.env.ENABLE_AI_FINALIZE;
    }
  });
});
```

- [ ] **Step 2: 跑测试确认全红**

Run: `pnpm test tests/api/posters-preview-batch.test.ts`

Expected: FAIL — old route still deducts credits + returns 1080.

- [ ] **Step 3: 改造 preview-batch route**

Replace `app/api/posters/preview-batch/route.ts` body with:

```ts
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
  const businessName = getTextField("businessName");
  const phone = getTextField("phone");
  const serviceArea = getTextField("serviceArea");
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
  }): Promise<{ thumb: Thumb | null }> => {
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
      };
    } catch (err) {
      console.error(`[preview-batch] render failed for ${entry.id}:`, err);
      return { thumb: null };
    }
  };

  const results = await Promise.all(renderers.map(renderOne));
  const thumbnails: Thumb[] = results.map((r) => r.thumb).filter((t): t is Thumb => t !== null);
  if (thumbnails.length === 0) {
    return Response.json({ error: "All template renders failed" }, { status: 500 });
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
```

- [ ] **Step 4: 跑测试确认全绿**

Run: `pnpm test tests/api/posters-preview-batch.test.ts`

Expected: PASS — 3 tests

- [ ] **Step 5: 提交**

```bash
git add app/api/posters/preview-batch/route.ts tests/api/posters-preview-batch.test.ts
git commit -m "feat(poster): preview-batch renders 360 thumbnails, writes cache, never charges"
```

---

## Task 4: finalize 端点 — flag 控制 AI/扣费，cache 命中不扣

**Files:**
- Create: `app/api/posters/finalize/route.ts`
- Test: `tests/api/posters-finalize.test.ts`

- [ ] **Step 1: 写失败的测试**

Create `tests/api/posters-finalize.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(async () => ({ ok: true, user: { id: "user_1" } })),
}));

const deductCreditsMock = vi.fn();
const refundCreditsMock = vi.fn();
const canUserAffordMock = vi.fn();
vi.mock("@/lib/credits", () => ({
  deductCredits: deductCreditsMock,
  refundCredits: refundCreditsMock,
  canUserAfford: canUserAffordMock,
  getUserCredits: vi.fn(async () => 100),
  getUserPlanKey: vi.fn(async () => "free"),
}));

vi.mock("@/lib/server/poster-templates/registry", () => ({
  getRenderer: vi.fn(() => () => ({ type: "div", props: { children: "stub" } })),
}));
vi.mock("@/lib/poster-templates/public-metadata", () => ({
  getTemplateById: vi.fn((id: string) => ({
    id,
    name: "T " + id,
    layoutFamily: "split",
    industry: "pressure_washing",
    channel: "google_business_profile",
    phoneDefault: "subtle",
  })),
}));
vi.mock("satori", () => ({ default: vi.fn(async () => "<svg/>") }));
vi.mock("sharp", () => ({
  default: () => ({
    png: () => ({ toBuffer: async () => Buffer.from("FULLHIRES") }),
    resize: () => ({ png: () => ({ toBuffer: async () => Buffer.from("FULLHIRES") }) }),
  }),
}));
vi.mock("@/lib/server/watermark", () => ({ applyWatermark: vi.fn(async (b: Buffer) => b) }));

const postInsertMock = vi.fn();
const genHistoryInsertMock = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    insert: (table: unknown) => ({
      values: (row: unknown) => {
        if (String(table).includes("post_image_pair")) return Promise.resolve();
        if (String(table).includes("generation_history")) {
          genHistoryInsertMock(row);
          return Promise.resolve();
        }
        postInsertMock(row);
        return Promise.resolve();
      },
    }),
  },
}));

import {
  setBatch,
  getBatch,
  _resetForTests,
} from "@/lib/server/poster-preview-cache";
import { POST } from "@/app/api/posters/finalize/route";

function seedBatch(id = "b1") {
  setBatch(id, {
    userId: "user_1",
    beforeDataUrl: "data:image/png;base64,AAA",
    afterDataUrl: "data:image/png;base64,BBB",
    headline: "Driveway Cleaned",
    description: "in 3 hours",
    brandFields: { businessName: "Smith", isLicensed: false, isInsured: false },
    items: [
      { templateId: "t1", name: "T1", thumbnailDataUrl: "data:image/png;base64,T" },
      { templateId: "t2", name: "T2", thumbnailDataUrl: "data:image/png;base64,T" },
      { templateId: "t3", name: "T3", thumbnailDataUrl: "data:image/png;base64,T" },
    ],
  });
}

function req(body: unknown): Request {
  return new Request("http://x/api/posters/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/posters/finalize", () => {
  beforeEach(() => {
    _resetForTests();
    deductCreditsMock.mockReset().mockResolvedValue({ success: true, remainingCredits: 90 });
    refundCreditsMock.mockReset().mockResolvedValue({ success: true, remainingCredits: 100 });
    canUserAffordMock.mockReset().mockResolvedValue(true);
    postInsertMock.mockReset();
    genHistoryInsertMock.mockReset();
    delete process.env.ENABLE_AI_FINALIZE;
  });

  it("returns 410 when batch is unknown", async () => {
    const res = await POST(req({ batchId: "missing", index: 0 }));
    expect(res.status).toBe(410);
  });

  it("returns 400 when index out of range", async () => {
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 5 }));
    expect(res.status).toBe(400);
  });

  it("flag=false: new index does NOT charge, writes post + history", async () => {
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.charged).toBe(0);
    expect(body.cachedHit).toBe(false);
    expect(body.url.startsWith("data:image/png;base64,")).toBe(true);
    expect(deductCreditsMock).not.toHaveBeenCalled();
    expect(postInsertMock).toHaveBeenCalledTimes(1);
    expect(genHistoryInsertMock).toHaveBeenCalledTimes(1);
  });

  it("flag=false: repeat same index returns cached dataURL, no post written", async () => {
    seedBatch();
    await POST(req({ batchId: "b1", index: 1 }));
    postInsertMock.mockReset();
    const res = await POST(req({ batchId: "b1", index: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cachedHit).toBe(true);
    expect(body.charged).toBe(0);
    expect(postInsertMock).not.toHaveBeenCalled();
  });

  it("flag=true: new index deducts 10 + writes post", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 0 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.charged).toBe(10);
    expect(deductCreditsMock).toHaveBeenCalledWith(
      "user_1",
      10,
      "poster_ai_finalize"
    );
    expect(postInsertMock).toHaveBeenCalledTimes(1);
  });

  it("flag=true: repeated same index does not re-charge (cache hit)", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    seedBatch();
    await POST(req({ batchId: "b1", index: 0 }));
    deductCreditsMock.mockReset();
    const res = await POST(req({ batchId: "b1", index: 0 }));
    const body = await res.json();
    expect(body.cachedHit).toBe(true);
    expect(body.charged).toBe(0);
    expect(deductCreditsMock).not.toHaveBeenCalled();
  });

  it("flag=true: insufficient credits returns 402, nothing written", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    canUserAffordMock.mockResolvedValue(false);
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 0 }));
    expect(res.status).toBe(402);
    expect(deductCreditsMock).not.toHaveBeenCalled();
    expect(postInsertMock).not.toHaveBeenCalled();
  });

  it("flag=false: marks index used so a second index counts as a new finalize", async () => {
    seedBatch();
    await POST(req({ batchId: "b1", index: 0 }));
    await POST(req({ batchId: "b1", index: 2 }));
    const entry = getBatch("b1");
    expect(entry?.usedIndices.has(0)).toBe(true);
    expect(entry?.usedIndices.has(2)).toBe(true);
    expect(entry?.usedIndices.has(1)).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认全红**

Run: `pnpm test tests/api/posters-finalize.test.ts`

Expected: FAIL — `Cannot find module '@/app/api/posters/finalize/route'`

- [ ] **Step 3: 实现 finalize endpoint**

Create `app/api/posters/finalize/route.ts`:

```ts
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

  // Cache hit: same (batchId, index) already finalized → return cached dataURL, NO charge / NO write
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

    // Persist post + generation history (R2 not configured → store dataURL as outputUrl)
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
```

- [ ] **Step 4: 跑测试确认全绿**

Run: `pnpm test tests/api/posters-finalize.test.ts`

Expected: PASS — all 7 tests

- [ ] **Step 5: 提交**

```bash
git add app/api/posters/finalize/route.ts tests/api/posters-finalize.test.ts
git commit -m "feat(poster): add finalize endpoint with ENABLE_AI_FINALIZE flag + cache-hit no-charge"
```

---

## Task 5: caption — 加 description 入参 + LLM 失败 fallback 到 stub

**Files:**
- Modify: `app/api/posters/caption/route.ts`
- Modify: `tests/api/posters-caption.test.ts`

> 现有实现已接 LLM；本任务只是：(a) 接受 `description` 字段并加入 prompt 上下文，(b) LLM 调用失败时返回 stub 拼接结果（让前端在任何情况下都能拿到候选）。

- [ ] **Step 1: 读现有测试，加新断言**

Read current `tests/api/posters-caption.test.ts` (use Read tool first), then add two new tests at the end of the `describe(...)` block:

```ts
  it("includes description in the LLM prompt when provided", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: '{"headlines":["A","B","C"],"caption":"hi"}' } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ) as unknown as Response
    );
    const req = new Request("http://x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry: "pressure_washing",
        channel: "google_business_profile",
        businessName: "Smith",
        serviceArea: "Austin, TX",
        description: "Cleaned a stubborn driveway in 3 hours",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const callBody = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string
    );
    const prompt = callBody.messages[0].content as string;
    expect(prompt).toContain("Cleaned a stubborn driveway in 3 hours");
    fetchSpy.mockRestore();
  });

  it("falls back to a stub response when the LLM call fails", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const req = new Request("http://x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry: "pressure_washing",
        businessName: "Smith Pressure Pros",
        serviceArea: "Austin, TX",
        description: "Cleaned a driveway in 3 hours",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { headlines: string[]; caption: string };
    expect(body.headlines).toHaveLength(3);
    for (const h of body.headlines) expect(h.length).toBeLessThanOrEqual(36);
    expect(body.caption.length).toBeGreaterThan(0);
    fetchSpy.mockRestore();
  });
```

(If the existing test file uses a different mocking style or doesn't have a top-level fetch mock, adapt the spy/mocking accordingly — the assertions are what matter.)

- [ ] **Step 2: 跑测试确认相关测试红**

Run: `pnpm test tests/api/posters-caption.test.ts`

Expected: FAIL on the two new tests — current route doesn't accept `description` and re-throws on LLM error.

- [ ] **Step 3: 改 caption route**

Modify `app/api/posters/caption/route.ts`:

1. Add `description?: string` to `CaptionRequest` type and to `buildPrompt()` context lines:

```ts
type CaptionRequest = {
  industry?: string;
  channel?: string;
  serviceType?: string;
  businessName?: string;
  serviceArea?: string;
  description?: string;   // ← new
};
```

In `buildPrompt()` insert before `if (input.serviceType) ...`:

```ts
  if (input.description) contextLines.push(`What we did: ${input.description}`);
```

2. Add a stub fallback function (at module scope, near `buildPrompt`):

```ts
function shortNoun(text?: string): string | undefined {
  if (!text) return undefined;
  const m = text.match(/\b([A-Z][a-z]+|[a-z]{4,})\b/);
  return m?.[1];
}

function stubResponse(input: CaptionRequest): CaptionResponse {
  const verbsByIndustry: Record<string, [string, string, string]> = {
    pressure_washing: ["Spotless", "Brought Back to New", "Gone in Hours"],
    auto_detailing: ["Mirror Finish", "Showroom Clean", "Like-New Inside"],
  };
  const industryKey = input.industry === "auto_detailing" ? "auto_detailing" : "pressure_washing";
  const v = verbsByIndustry[industryKey];
  const noun = shortNoun(input.description) ?? "Job";
  const headlines = [
    `${noun} ${v[0]}`.slice(0, 36),
    `${input.businessName ?? "We"} ${v[1]}`.slice(0, 36),
    `Fresh Results in ${input.serviceArea ?? "Your Area"}`.slice(0, 36),
  ];
  const captionBase = input.description
    ? `${input.description} — call us for a free quote!`
    : `${input.businessName ?? "Our crew"} just wrapped up another local job — call for a free quote!`;
  return { headlines, caption: captionBase.slice(0, 200) };
}
```

3. Wrap the LLM call in try/catch — on any error, return `Response.json(stubResponse(input))`.

Locate the existing `POST` handler. After parsing `input`, replace the LLM-call block with:

```ts
  try {
    const content = await createChatCompletion({
      messages: [{ role: "user", content: buildPrompt(input) }],
      // ...keep existing options
    });
    const parsed = parseResult(content);
    return Response.json(parsed);
  } catch (err) {
    console.warn("[posters/caption] LLM call failed, returning stub:", err);
    return Response.json(stubResponse(input));
  }
```

(Read the current handler carefully and adapt — the goal is: LLM success → return its output; any throw (network, bad JSON, schema mismatch) → return stub.)

- [ ] **Step 4: 跑测试确认绿**

Run: `pnpm test tests/api/posters-caption.test.ts`

Expected: PASS — all tests including the two new ones.

- [ ] **Step 5: 提交**

```bash
git add app/api/posters/caption/route.ts tests/api/posters-caption.test.ts
git commit -m "feat(poster): caption accepts description + falls back to stub on LLM error"
```

---

## Task 6: Create 页重写 — 双输入 + 缩略图 + flag 按钮文案

**Files:**
- Rewrite: `app/[locale]/(protected)/create/page.tsx`

> 重写整页。保留 brand 引导逻辑（已上线）和 PhotoDropZone 子组件（已 lint 干净）。变化点：
> - 表单加 `description` textarea（80 char）放在 headline 上方
> - AI Suggest 按钮 POST `/api/posters/caption` 时带 `description`
> - 移除"右侧 3 个推荐模板小图"展示，改成上传完成后显示一个空状态 placeholder
> - 点 "Generate" 调 `/api/posters/preview-batch` → 拿到 `{batchId, thumbnails, aiFinalizeEnabled}`
> - 右侧展示 3 张缩略图（grid）；点击切换选中态
> - "Download" 按钮：`aiFinalizeEnabled === true` 时显示 "Download · 10 credits"；新 index 弹 confirm；命中 cache（前端跟踪 `downloadedIndices` Set）不弹 confirm
> - 点 Download → POST `/api/posters/finalize { batchId, index }` → 触发浏览器下载
> - 收到 410 → 显示 "Preview expired" + Regenerate 按钮（重新调 preview-batch）

- [ ] **Step 1: 读现有 Create 页找出可复用的子组件**

Run: `wc -l app/[locale]/(protected)/create/page.tsx` (note file size for change scope)

Read the existing file. Identify and **keep**:
- `PhotoDropZone` component (already lint-clean)
- `safeReturnTo` / brand-gate `useEffect` (lines around the top)
- `Container className="relative z-10"` wrapper
- orientation detection logic (passes after-image to `detectOrientation` + `pickPreviewTemplates`)

Identify and **remove**:
- right-side "recommended template preview thumbnails" section
- single `headline` input (will become two inputs)
- old `/api/posters/preview-batch` invocation that displays full-size previews

- [ ] **Step 2: 替换/重写 page.tsx**

Below is the **complete** new file. The PhotoDropZone definition is reused from the current file — if your current `PhotoDropZone` differs in details, copy it verbatim from the existing file into the marked region.

Write `app/[locale]/(protected)/create/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Background } from "@/components/background";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import {
  detectOrientation,
  pickPreviewTemplates,
} from "@/lib/poster-templates/orientation-match";

type BrandProfile = {
  businessName?: string | null;
  phone?: string | null;
  serviceArea?: string | null;
  isLicensed?: boolean;
  isInsured?: boolean;
  googleReviewCount?: number | null;
};
type BrandGate =
  | { status: "loading" }
  | { status: "needs_brand" }
  | { status: "ready"; brand: BrandProfile };

type Thumbnail = {
  templateId: string;
  name: string;
  thumbnailDataUrl: string;
};

type PreviewBatch = {
  batchId: string;
  thumbnails: Thumbnail[];
  aiFinalizeEnabled: boolean;
  expiresAt: number;
};

// ---- PhotoDropZone (paste verbatim from previous create/page.tsx) ----
function PhotoDropZone({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition aspect-square flex items-center justify-center bg-white dark:bg-neutral-900"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={label} className="max-w-full max-h-full object-contain rounded" />
        ) : (
          <span className="text-sm text-neutral-400">Click to upload</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
// ---- end PhotoDropZone ----

export default function CreatePage() {
  const router = useRouter();
  const [brandGate, setBrandGate] = useState<BrandGate>({ status: "loading" });

  // Brand gate
  useEffect(() => {
    let cancelled = false;
    fetch("/api/brand-profile")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const bp: BrandProfile | null = data?.brandProfile ?? null;
        const hasName = !!bp?.businessName && bp.businessName.trim().length > 0;
        if (!hasName) {
          setBrandGate({ status: "needs_brand" });
          router.replace("/settings/brand?returnTo=/create");
          return;
        }
        setBrandGate({ status: "ready", brand: bp! });
      })
      .catch(() => {
        if (!cancelled) setBrandGate({ status: "ready", brand: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [orientation, setOrientation] = useState<
    "landscape" | "portrait" | "square" | null
  >(null);

  // Detect orientation when afterFile changes
  useEffect(() => {
    if (!afterFile) return;
    const url = URL.createObjectURL(afterFile);
    const img = new Image();
    img.onload = () => {
      setOrientation(detectOrientation(img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [afterFile]);

  const [description, setDescription] = useState("");
  const [headline, setHeadline] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggested, setSuggested] = useState<string[] | null>(null);

  async function handleAiSuggest() {
    if (suggestLoading) return;
    setSuggestLoading(true);
    setSuggested(null);
    try {
      const brand = brandGate.status === "ready" ? brandGate.brand : {};
      const res = await fetch("/api/posters/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          industry: "pressure_washing",
          channel: "google_business_profile",
          businessName: brand.businessName,
          serviceArea: brand.serviceArea,
        }),
      });
      if (!res.ok) throw new Error("suggest failed");
      const data = (await res.json()) as { headlines: string[]; caption: string };
      setSuggested(data.headlines);
    } catch {
      setSuggested(null);
    } finally {
      setSuggestLoading(false);
    }
  }

  const [generating, setGenerating] = useState(false);
  const [batch, setBatch] = useState<PreviewBatch | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [downloadedIndices, setDownloadedIndices] = useState<Set<number>>(new Set());
  const [genError, setGenError] = useState<string | null>(null);

  const canGenerate =
    !!beforeFile && !!afterFile && headline.trim().length > 0 && !generating;

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setGenError(null);
    setBatch(null);
    setSelectedIdx(0);
    setDownloadedIndices(new Set());
    try {
      const o = orientation ?? "square";
      const picks = pickPreviewTemplates(o, 3);
      const fd = new FormData();
      fd.set("beforeImage", beforeFile!);
      fd.set("afterImage", afterFile!);
      fd.set("headline", headline);
      fd.set("description", description);
      fd.set("templateIds", JSON.stringify(picks.map((p) => p.id)));
      if (brandGate.status === "ready") {
        const b = brandGate.brand;
        if (b.businessName) fd.set("businessName", b.businessName);
        if (b.phone) fd.set("phone", b.phone);
        if (b.serviceArea) fd.set("serviceArea", b.serviceArea);
        fd.set("isLicensed", b.isLicensed ? "true" : "false");
        fd.set("isInsured", b.isInsured ? "true" : "false");
        if (b.googleReviewCount) fd.set("googleReviewCount", String(b.googleReviewCount));
      }
      const res = await fetch("/api/posters/preview-batch", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Generate failed");
      }
      const data = (await res.json()) as PreviewBatch;
      setBatch(data);
    } catch (err) {
      setGenError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  const [downloading, setDownloading] = useState(false);
  async function handleDownload() {
    if (!batch || downloading) return;
    const isNewIndex = !downloadedIndices.has(selectedIdx);
    if (batch.aiFinalizeEnabled && isNewIndex) {
      if (!window.confirm("Each new layout costs 10 credits (AI runs again). Continue?")) {
        return;
      }
    }
    setDownloading(true);
    try {
      const res = await fetch("/api/posters/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.batchId, index: selectedIdx }),
      });
      if (res.status === 410) {
        setGenError("Preview expired, please regenerate");
        setBatch(null);
        return;
      }
      if (res.status === 402) {
        setGenError("Insufficient credits — top up to download");
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setGenError(d.error ?? "Download failed");
        return;
      }
      const data = (await res.json()) as { url: string; charged: number };
      // Trigger browser download
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `${batch.thumbnails[selectedIdx].templateId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDownloadedIndices((prev) => {
        const next = new Set(prev);
        next.add(selectedIdx);
        return next;
      });
    } finally {
      setDownloading(false);
    }
  }

  const downloadLabel = (() => {
    if (!batch) return "Download";
    if (downloadedIndices.has(selectedIdx)) return "Download again";
    return batch.aiFinalizeEnabled ? "Download · 10 credits" : "Download";
  })();

  if (brandGate.status === "loading" || brandGate.status === "needs_brand") {
    return (
      <div className="relative min-h-screen">
        <Background />
        <Container className="relative z-10 py-16">
          <p className="text-sm text-neutral-400">Loading…</p>
        </Container>
      </div>
    );
  }

  const brand = brandGate.brand;
  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="relative z-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Brand chip */}
          <div className="mb-6 text-sm flex flex-wrap gap-x-2 items-center text-neutral-500 dark:text-neutral-400">
            <span>Using brand info:</span>
            <span className="font-medium text-neutral-700 dark:text-neutral-200">
              {brand.businessName ?? "—"}
            </span>
            {brand.phone && <span>· {brand.phone}</span>}
            {brand.serviceArea && <span>· {brand.serviceArea}</span>}
            <Link
              href="/settings/brand?returnTo=/create"
              className="ml-auto underline text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            >
              Edit brand
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT: inputs */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <PhotoDropZone label="Before photo" file={beforeFile} onFile={setBeforeFile} />
                <PhotoDropZone label="After photo" file={afterFile} onFile={setAfterFile} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Describe the work <span className="text-neutral-400">(≤80 char)</span>
                </label>
                <textarea
                  maxLength={80}
                  rows={2}
                  placeholder="e.g. Cleaned a stubborn driveway in 3 hours, all stains gone"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-neutral-400">{description.length}/80</p>
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={suggestLoading || description.trim().length === 0}
                    className="text-xs underline text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 disabled:opacity-50"
                  >
                    {suggestLoading ? "Generating…" : "✨ AI Suggest headlines"}
                  </button>
                </div>
                {suggested && (
                  <div className="mt-2 space-y-1">
                    {suggested.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setHeadline(s)}
                        className="block w-full text-left text-xs bg-neutral-100 dark:bg-neutral-800 rounded px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Headline on poster <span className="text-neutral-400">(≤36 char)</span>
                </label>
                <input
                  type="text"
                  maxLength={36}
                  placeholder="e.g. Driveway Brought Back to New"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
                />
                <p className="text-xs text-neutral-400 mt-1">{headline.length}/36</p>
              </div>

              <Button onClick={handleGenerate} disabled={!canGenerate}>
                {generating ? "Generating…" : "Generate 3 previews"}
              </Button>
              {genError && <p className="text-sm text-red-500">{genError}</p>}
            </div>

            {/* RIGHT: previews */}
            <div>
              {!batch ? (
                <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg aspect-square flex items-center justify-center text-sm text-neutral-400">
                  Previews will appear here
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {batch.thumbnails.map((t, i) => (
                      <button
                        key={t.templateId}
                        type="button"
                        onClick={() => setSelectedIdx(i)}
                        className={`relative rounded-lg overflow-hidden border-2 transition ${
                          i === selectedIdx
                            ? "border-blue-500 ring-2 ring-blue-300"
                            : "border-transparent"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.thumbnailDataUrl} alt={t.name} className="w-full" />
                        {downloadedIndices.has(i) && (
                          <span className="absolute top-1 right-1 text-[10px] bg-green-500 text-white px-1 rounded">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Button onClick={handleDownload} disabled={downloading}>
                    {downloading ? "Preparing…" : downloadLabel}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
```

- [ ] **Step 3: 跑 lint 确认干净**

Run: `pnpm lint`

Expected: no errors. If `react-hooks/set-state-in-effect` complains about the orientation effect's `setOrientation` call, that's because `setOrientation` is called inside `img.onload`. That's not in the effect body (it's async after the image loads), so the rule should not flag it. If it does, wrap `setOrientation(...)` in `queueMicrotask(() => setOrientation(...))`.

- [ ] **Step 4: 手动 sanity check（不算正式 test，但很关键）**

Run: `pnpm dev:webpack` and visit `http://localhost:3000/create` while logged in. Verify:
1. New user (no brand) → redirected to `/settings/brand?returnTo=/create`
2. After brand filled → returns to `/create`
3. Upload before + after → orientation detected → no template thumbnails shown yet (only "Previews will appear here" placeholder)
4. Type description → "AI Suggest headlines" button enabled
5. Click AI Suggest → 3 chip buttons appear; click one → fills headline input
6. Click "Generate 3 previews" → button doesn't show price → 3 thumbnails appear on right → credits **unchanged**
7. Click thumbnail to select → click "Download" → file downloads → credits **unchanged** (本次 flag off)
8. Click same thumbnail's Download again → "Download again" label → downloads instantly
9. Click different thumbnail → Download → downloads → still unchanged credits
10. Wait 31min (or manually delete cache entry via `_resetForTests` in console) → click Download → error "Preview expired, please regenerate"

- [ ] **Step 5: 提交**

```bash
git add app/[locale]/\(protected\)/create/page.tsx
git commit -m "feat(create): dual input (description + headline) + thumbnail grid + flag-aware Download button"
```

---

## Task 7: 全套测试 + lint 收尾

- [ ] **Step 1: 跑全套测试**

Run: `pnpm test`

Expected: PASS — all existing 147 tests still green + new tests added in Tasks 1–5. If anything broke (e.g. an old `preview-batch` test that expected `creditsCharged` in the response), fix it by updating the expectation to match the new contract.

- [ ] **Step 2: 跑 lint**

Run: `pnpm lint`

Expected: no errors.

- [ ] **Step 3: 写 .env.example 文档**

Modify `.env.example` — append at the bottom:

```env
# Poster finalize: when "true", AI (Doubao i2i) runs on the after image
# during /api/posters/finalize AND each new (batchId, index) charges 10 credits.
# When "false" (default), finalize uses pure satori+sharp rendering and is free.
# WARNING: these two behaviors are bound — never enable one without the other.
ENABLE_AI_FINALIZE="false"
```

- [ ] **Step 4: 更新 launch-checklist 状态**

Modify `docs/launch-checklist.md` — under "## 当前已确认完成 ✅" append:

```markdown
- ✅ Create 流二轮重构（task #38）：双输入 description+headline / 缩略图选 1 / finalize 端点 / ENABLE_AI_FINALIZE flag / cache 命中不重复扣
```

- [ ] **Step 5: 提交收尾**

```bash
git add .env.example docs/launch-checklist.md
git commit -m "docs: document ENABLE_AI_FINALIZE flag + mark create-flow-v2 complete in checklist"
```

---

## 完成定义

所有任务完成后：

1. **代码层面**：preview-batch 永不扣费 + finalize 永远受 `ENABLE_AI_FINALIZE` flag 控制 + 同 (batchId, index) 重复 finalize 命中 cache 不扣
2. **测试层面**：5 个新/改测试文件，覆盖 cache TTL/LRU/orientation/preview-batch 不扣/finalize 双 flag 路径/caption description+stub fallback
3. **文档层面**：`.env.example` 含 ENABLE_AI_FINALIZE 说明，launch-checklist P1-5 已是同步切换硬绑定
4. **手测层面**：本次（flag=false）走通"上传 → 生成 → 下载 3 次 → 积分不变 → 30min 过期"全流程
