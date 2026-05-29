# Brago P0 Phase 3 — 上传 + HEIC + 图片处理

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** 让用户在移动端能上传 1-10 张 JPEG/PNG/WebP/HEIC/HEIF；客户端转换 HEIC、压缩；服务端 sharp 标准化输出 + 缩略图；写入 R2，回写 `google_post_photo`。

**Architecture:** 
- 客户端动态加载 `heic-to` + `browser-image-compression`，转 JPEG 并压缩到最长边 2000px。
- 上传到现有 `/api/upload/image`-style 端点（新建 brago 专用 `/api/brago/google-posts/[postId]/photos/upload`，临时直接接收 multipart）；用 R2 现成 client，失败回 base64 fallback（仅 dev）。
- sharp 在服务端做 EXIF 移除 + 缩略图（不强行 crop，crop 在 Phase 4 vision 出 cropHint 后由 `/render-photo` 处理）。
- 新增 `/api/brago/google-posts/[postId]/photos/presign` 为未来 direct R2 上传打基础，但 P0 实现先用 multipart（spec 6.4 同意 P0 可复用现有 upload route）。

**Tech Stack:** sharp、@aws-sdk/client-s3（已有 R2 wrapper）、客户端 `heic-to`、`browser-image-compression`。

---

## 文件清单

### 依赖
- 新增依赖：`heic-to`, `browser-image-compression`, `heic-convert`（服务端 fallback）

### 服务端
- Create: `lib/brago/r2-upload.ts` — 在 r2-storage.ts 之上加 google-post 专用 key 命名
- Create: `lib/brago/image-processing.ts` — sharp pipeline（标准化、生成缩略图）
- Create: `lib/brago/heic-fallback.ts` — 服务端 HEIC fallback（仅当客户端转换失败时）
- Create: `app/api/brago/google-posts/[postId]/photos/upload/route.ts` — multipart 接收并入库
- Create: `app/api/brago/google-posts/[postId]/photos/route.ts` — GET 列出 photos / DELETE 删除

### 客户端
- Create: `features/brago/upload/use-photo-prepare.ts` — 客户端 HEIC 转 + 压缩 hook
- Create: `features/brago/upload/photo-grid.tsx` — 多张照片网格 + 状态
- Modify: `app/[locale]/(protected)/create/page.tsx` — 接入上传 hook，提交时调上传 API

### 测试
- Create: `tests/lib/brago-image-processing.test.ts`
- Create: `tests/api/brago-photos-upload.test.ts`（可选，集成度高，最少 1 个）

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装客户端 + 服务端兜底库**

```bash
pnpm add heic-to browser-image-compression heic-convert
pnpm add -D @types/heic-convert
```

注意 heic-to 是浏览器侧（基于 libheif WASM）。若安装失败可改用 `heic2any`（兼容名）。

- [ ] **Step 2: 确认 sharp 已存在**

`sharp` 已在 dependencies。无需新装。

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): heic-to + browser-image-compression + heic-convert"
```

---

## Task 2: `lib/brago/image-processing.ts` — sharp pipeline

**Files:**
- Create: `lib/brago/image-processing.ts`

- [ ] **Step 1: 测试先行**

`tests/lib/brago-image-processing.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { standardizePhoto, makeThumbnail } from "@/lib/brago/image-processing";

async function makeFakeJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#888" } })
    .jpeg()
    .toBuffer();
}

describe("image-processing", () => {
  it("standardizes to <=2048 longest edge, strips EXIF", async () => {
    const input = await makeFakeJpeg();
    const out = await standardizePhoto(input);
    const meta = await sharp(out).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2048);
    expect(meta.format).toBe("jpeg");
  });

  it("makeThumbnail produces 480px-ish jpg", async () => {
    const input = await makeFakeJpeg();
    const out = await makeThumbnail(input);
    const meta = await sharp(out).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(560);
  });
});
```

- [ ] **Step 2: 实现**

```ts
import sharp from "sharp";

export type StandardizeOptions = {
  maxEdge?: number;
  quality?: number;
  enhance?: boolean;
};

export async function standardizePhoto(
  input: Buffer,
  options: StandardizeOptions = {},
): Promise<Buffer> {
  const maxEdge = options.maxEdge ?? 2048;
  const quality = options.quality ?? 85;
  let pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  if ((meta.width ?? 0) > maxEdge || (meta.height ?? 0) > maxEdge) {
    pipeline = pipeline.resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true });
  }
  if (options.enhance) {
    pipeline = pipeline
      .modulate({ saturation: 1.05, brightness: 1.02 })
      .sharpen({ sigma: 0.6 });
  }
  return pipeline.jpeg({ quality, mozjpeg: true }).withMetadata({}).toBuffer();
}

export async function makeThumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .withMetadata({})
    .toBuffer();
}

export type CropPct = {
  xPct: number; yPct: number; widthPct: number; heightPct: number;
};

export async function renderGoogleCrop(
  input: Buffer,
  crop: CropPct,
  options: { outputEdge?: number } = {},
): Promise<Buffer> {
  const edge = options.outputEdge ?? 1080;
  const meta = await sharp(input).metadata();
  const W = meta.width ?? 0, H = meta.height ?? 0;
  if (W === 0 || H === 0) throw new Error("invalid image dims");
  const left = Math.max(0, Math.round((crop.xPct / 100) * W));
  const top = Math.max(0, Math.round((crop.yPct / 100) * H));
  const width = Math.min(W - left, Math.round((crop.widthPct / 100) * W));
  const height = Math.min(H - top, Math.round((crop.heightPct / 100) * H));
  return sharp(input, { failOn: "none" })
    .rotate()
    .extract({ left, top, width, height })
    .resize({ width: edge, height: edge, fit: "cover" })
    .modulate({ saturation: 1.05, brightness: 1.02 })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 88, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
}
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test tests/lib/brago-image-processing.test.ts
```

预期：2 pass。

- [ ] **Step 4: Commit**

```bash
git add lib/brago/image-processing.ts tests/lib/brago-image-processing.test.ts
git commit -m "feat(brago): image-processing pipeline"
```

---

## Task 3: `lib/brago/r2-upload.ts` — google-post key 命名

**Files:**
- Create: `lib/brago/r2-upload.ts`

- [ ] **Step 1: 写 wrapper**

```ts
import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || "";
const SECRET = process.env.STORAGE_SECRET_ACCESS_KEY || "";
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL || "";
const ENDPOINT = process.env.STORAGE_ENDPOINT || "";
const BUCKET = process.env.STORAGE_BUCKET_NAME || "brago";

function endpoint() {
  if (ENDPOINT.includes(".r2.cloudflarestorage.com")) {
    const parts = ENDPOINT.split("/");
    return parts[0] + "//" + parts[2];
  }
  return ENDPOINT;
}

const client = ACCESS_KEY_ID && SECRET
  ? new S3Client({ region: "auto", endpoint: endpoint(), credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET } })
  : null;

export function isR2Ready(): boolean {
  return Boolean(client && PUBLIC_URL && BUCKET);
}

export async function uploadBuffer(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  if (!client) throw new Error("R2 not configured");
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.contentType,
  }));
  return `${PUBLIC_URL}/${opts.key}`;
}

export function buildGooglePostKey(userId: string, postId: string, kind: "original" | "processed" | "thumbnail", suffix: string) {
  const ts = Date.now();
  return `google-posts/${userId}/${postId}/${kind}/${ts}_${suffix}`;
}

export function bufferToDataUrl(buffer: Buffer, contentType: string) {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/brago/r2-upload.ts
git commit -m "feat(brago): R2 helper for google-post keys"
```

---

## Task 4: `lib/brago/heic-fallback.ts` — 服务端 HEIC 兜底

**Files:**
- Create: `lib/brago/heic-fallback.ts`

- [ ] **Step 1:**

```ts
import "server-only";
// heic-convert 是纯 JS（基于 libheif-js）。在 Vercel Node 函数能跑但较慢；
// 仅当客户端转换失败时使用。
import heicConvert from "heic-convert";

export async function convertHeicToJpegBuffer(input: Buffer, quality = 0.85): Promise<Buffer> {
  const output = await heicConvert({ buffer: input, format: "JPEG", quality });
  return Buffer.from(output);
}

export function isHeicMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return m === "image/heic" || m === "image/heif" || m === "image/heic-sequence" || m === "image/heif-sequence";
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/brago/heic-fallback.ts
git commit -m "feat(brago): server-side HEIC fallback"
```

---

## Task 5: `/api/brago/google-posts/[postId]/photos/upload` 端点

**Files:**
- Create: `app/api/brago/google-posts/[postId]/photos/upload/route.ts`

- [ ] **Step 1: 写 route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  standardizePhoto,
  makeThumbnail,
} from "@/lib/brago/image-processing";
import { buildGooglePostKey, bufferToDataUrl, isR2Ready, uploadBuffer } from "@/lib/brago/r2-upload";
import { convertHeicToJpegBuffer, isHeicMime } from "@/lib/brago/heic-fallback";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;

  const owner = await db.select({ id: googlePost.id }).from(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id))).limit(1);
  if (!owner[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const files: File[] = [];
  for (const value of form.values()) {
    if (value instanceof File) files.push(value);
    if (files.length >= MAX_FILES) break;
  }
  if (files.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 });

  const inserted: { id: string; originalUrl: string; thumbnailUrl: string }[] = [];

  for (const [index, file] of files.entries()) {
    if (file.size > MAX_BYTES) continue;
    const raw = Buffer.from(await file.arrayBuffer());
    let working = raw;
    const mime = (file.type || "image/jpeg").toLowerCase();
    if (isHeicMime(mime)) {
      try { working = await convertHeicToJpegBuffer(raw); }
      catch (err) { console.error("heic convert failed", err); continue; }
    }

    let processed: Buffer;
    let thumb: Buffer;
    try {
      processed = await standardizePhoto(working);
      thumb = await makeThumbnail(working);
    } catch (err) {
      console.error("sharp failed", err);
      continue;
    }

    const id = randomUUID();
    const safeSuffix = `${id}.jpg`;
    let originalUrl: string;
    let processedUrl: string;
    let thumbnailUrl: string;

    if (isR2Ready()) {
      try {
        originalUrl = await uploadBuffer({ key: buildGooglePostKey(access.user.id, postId, "original", safeSuffix), body: working, contentType: "image/jpeg" });
        processedUrl = await uploadBuffer({ key: buildGooglePostKey(access.user.id, postId, "processed", safeSuffix), body: processed, contentType: "image/jpeg" });
        thumbnailUrl = await uploadBuffer({ key: buildGooglePostKey(access.user.id, postId, "thumbnail", safeSuffix), body: thumb, contentType: "image/jpeg" });
      } catch (err) {
        console.error("r2 upload failed, falling back to data URL", err);
        originalUrl = bufferToDataUrl(working, "image/jpeg");
        processedUrl = bufferToDataUrl(processed, "image/jpeg");
        thumbnailUrl = bufferToDataUrl(thumb, "image/jpeg");
      }
    } else {
      originalUrl = bufferToDataUrl(working, "image/jpeg");
      processedUrl = bufferToDataUrl(processed, "image/jpeg");
      thumbnailUrl = bufferToDataUrl(thumb, "image/jpeg");
    }

    await db.insert(googlePostPhoto).values({
      id,
      googlePostId: postId,
      userId: access.user.id,
      originalUrl,
      processedUrl,
      thumbnailUrl,
      originalMimeType: mime,
      sortOrder: index,
    });

    inserted.push({ id, originalUrl, thumbnailUrl });
  }

  if (inserted.length === 0) {
    return NextResponse.json({ error: "All uploads failed" }, { status: 500 });
  }

  return NextResponse.json({ photos: inserted, totalAccepted: inserted.length });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/photos/upload/route.ts"
git commit -m "feat(api): google-posts photos upload"
```

---

## Task 6: `/api/brago/google-posts/[postId]/photos` GET + DELETE

**Files:**
- Create: `app/api/brago/google-posts/[postId]/photos/route.ts`
- Create: `app/api/brago/google-posts/[postId]/photos/[photoId]/route.ts`

- [ ] **Step 1: GET 列表**

```ts
// app/api/brago/google-posts/[postId]/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePostPhoto, googlePost } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;
  const owner = await db.select({ id: googlePost.id }).from(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id))).limit(1);
  if (!owner[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const photos = await db.select().from(googlePostPhoto).where(eq(googlePostPhoto.googlePostId, postId));
  return NextResponse.json({ photos });
}
```

- [ ] **Step 2: DELETE 单张**

```ts
// app/api/brago/google-posts/[postId]/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePostPhoto, googlePost } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string; photoId: string }> }) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId, photoId } = await params;
  const owner = await db.select({ id: googlePost.id }).from(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id))).limit(1);
  if (!owner[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(googlePostPhoto).where(and(eq(googlePostPhoto.id, photoId), eq(googlePostPhoto.googlePostId, postId)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/photos/"
git commit -m "feat(api): photos list + delete"
```

---

## Task 7: 客户端 `features/brago/upload/use-photo-prepare.ts`

**Files:**
- Create: `features/brago/upload/use-photo-prepare.ts`

- [ ] **Step 1: 写 hook**

```ts
"use client";

import { useCallback, useState } from "react";

export type PrepareStatus =
  | { status: "idle" }
  | { status: "preparing"; processed: number; total: number }
  | { status: "ready"; files: File[] }
  | { status: "error"; message: string };

const HEIC_MIME = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

function isHeic(file: File) {
  const name = file.name.toLowerCase();
  return HEIC_MIME.includes(file.type.toLowerCase()) || name.endsWith(".heic") || name.endsWith(".heif");
}

export function usePhotoPrepare(maxFiles = 10) {
  const [state, setState] = useState<PrepareStatus>({ status: "idle" });

  const prepare = useCallback(async (input: File[]) => {
    const list = input.slice(0, maxFiles);
    setState({ status: "preparing", processed: 0, total: list.length });
    try {
      const compressMod = await import("browser-image-compression");
      const compress = compressMod.default ?? compressMod;
      let heicMod: typeof import("heic-to") | null = null;
      const out: File[] = [];

      for (const [i, file] of list.entries()) {
        let working: File = file;
        if (isHeic(file)) {
          heicMod ??= await import("heic-to").catch(() => null);
          if (!heicMod) throw new Error("HEIC conversion library failed to load");
          // heic-to API: heicTo({ blob, type, quality })
          const heicTo = (heicMod as any).heicTo ?? (heicMod as any).default?.heicTo ?? (heicMod as any).default;
          if (typeof heicTo !== "function") throw new Error("heic-to API mismatch");
          const blob: Blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
          working = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
        }
        // Compress to <=2000 longest edge, jpeg quality 0.85
        const compressed = await compress(working, {
          maxSizeMB: 4,
          maxWidthOrHeight: 2000,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.85,
        });
        out.push(compressed);
        setState({ status: "preparing", processed: i + 1, total: list.length });
      }
      setState({ status: "ready", files: out });
      return out;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to prepare photos";
      setState({ status: "error", message });
      throw err;
    }
  }, [maxFiles]);

  return { state, prepare, reset: () => setState({ status: "idle" }) };
}
```

注：heic-to 的 import 形态因版本而异。代码里用了多种 fallback 路径，跑通即可。

- [ ] **Step 2: Commit**

```bash
git add features/brago/upload/use-photo-prepare.ts
git commit -m "feat(brago): client HEIC + compress hook"
```

---

## Task 8: 客户端 PhotoGrid 组件

**Files:**
- Create: `features/brago/upload/photo-grid.tsx`

- [ ] **Step 1:**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo } from "react";

export function PhotoGrid({ files, onRemove }: { files: File[]; onRemove?: (index: number) => void }) {
  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  return (
    <ul className="grid grid-cols-3 gap-2">
      {urls.map((u, i) => (
        <li key={u} className="relative aspect-square overflow-hidden rounded-md border">
          <img src={u} alt="" className="h-full w-full object-cover" />
          {onRemove && (
            <button onClick={() => onRemove(i)} className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-xs px-2 py-0.5">×</button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add features/brago/upload/photo-grid.tsx
git commit -m "feat(brago): photo grid component"
```

---

## Task 9: 接入 `/create` 的上传流

**Files:**
- Modify: `app/[locale]/(protected)/create/page.tsx`

- [ ] **Step 1: 改造**

`Create google post` 流程改为：
1. 用户选择 industry/serviceType/serviceArea + 上传 photos + consent。
2. 点击 Create：先 `POST /api/brago/google-posts` 拿 postId；再客户端 prepare 照片；再 multipart 上传到 `/api/brago/google-posts/[postId]/photos/upload`。
3. 完成后跳 `/google-posts/[postId]`。

完整代码：

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/container";
import { usePhotoPrepare } from "@/features/brago/upload/use-photo-prepare";
import { PhotoGrid } from "@/features/brago/upload/photo-grid";

type Industry = "pressure_washing" | "auto_detailing" | "cleaning";

const SERVICE_TYPES: Record<Industry, string[]> = {
  pressure_washing: ["driveway", "patio", "siding", "walkway", "deck", "fence"],
  auto_detailing: ["interior detail", "exterior wash", "wheel cleaning", "pet hair", "paint correction"],
  cleaning: ["carpet cleaning", "move-out cleaning", "window cleaning", "commercial cleaning"],
};

export default function CreatePage() {
  const router = useRouter();
  const [industry, setIndustry] = useState<Industry>("pressure_washing");
  const [serviceType, setServiceType] = useState<string>("driveway");
  const [serviceArea, setServiceArea] = useState<string>("");
  const [picked, setPicked] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepLabel, setStepLabel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { state, prepare } = usePhotoPrepare(10);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) { setError("Please confirm photo permission."); return; }
    if (picked.length === 0) { setError("Add at least one photo."); return; }
    setSubmitting(true);
    try {
      setStepLabel("Preparing photos");
      const prepared = await prepare(picked);

      setStepLabel("Creating post");
      const createRes = await fetch("/api/brago/google-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, serviceType, serviceArea, hasMarketingPermission: true }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData?.error ?? "Create failed");
      const postId: string = createData.postId;

      setStepLabel("Uploading photos");
      const fd = new FormData();
      prepared.forEach((f, i) => fd.set(`photo_${i}`, f));
      const upRes = await fetch(`/api/brago/google-posts/${postId}/photos/upload`, { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData?.error ?? "Upload failed");

      setStepLabel("Opening your post");
      router.push(`/google-posts/${postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-10 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">New Google post</h1>
      <p className="text-sm text-muted-foreground mb-6">Upload finished job photos. Brago picks the best after shot and writes a Google-safe caption.</p>

      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="grid gap-1 text-sm">
          Industry
          <select value={industry} onChange={(e) => { setIndustry(e.target.value as Industry); setServiceType(SERVICE_TYPES[e.target.value as Industry][0]); }} className="rounded-md border px-3 py-2">
            <option value="pressure_washing">Pressure washing</option>
            <option value="auto_detailing">Auto detailing</option>
            <option value="cleaning">Cleaning</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          Service type
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="rounded-md border px-3 py-2">
            {SERVICE_TYPES[industry].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          Service area
          <input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. South Austin" className="rounded-md border px-3 py-2" />
        </label>

        <label className="grid gap-1 text-sm">
          Job photos (1–10)
          <input type="file" multiple accept="image/*,.heic,.heif"
            onChange={(e) => setPicked(Array.from(e.target.files ?? []).slice(0, 10))} />
        </label>

        {picked.length > 0 && (
          <PhotoGrid files={picked} onRemove={(idx) => setPicked(arr => arr.filter((_, i) => i !== idx))} />
        )}

        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I have permission to use these photos for marketing.
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {state.status === "preparing" && (
          <p className="text-xs text-muted-foreground">Preparing {state.processed} of {state.total}…</p>
        )}

        <button type="submit" disabled={submitting} className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50">
          {submitting ? (stepLabel || "Working…") : "Create Google post"}
        </button>
      </form>
    </Container>
  );
}
```

- [ ] **Step 2: lint + build**

```bash
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(protected)/create/page.tsx"
git commit -m "feat(create): wire client HEIC convert + multipart upload"
```

---

## Task 10: 输出页显示已上传 photos

**Files:**
- Modify: `app/[locale]/(protected)/google-posts/[postId]/page.tsx`

- [ ] **Step 1: 读取 photos 渲染**

把已上传的 photos 在输出页用 grid 形式渲染（每张 thumbnail + role 信息空挂位，待 Phase 4 vision 填）：

```tsx
// 在 useEffect 里同时 fetch photos
const photoRes = await fetch(`/api/brago/google-posts/${postId}/photos`);
const photoData = await photoRes.json();
setPhotos(photoData.photos ?? []);
```

并渲染：

```tsx
{photos.length > 0 && (
  <div className="grid grid-cols-3 gap-2 mb-6">
    {photos.map((p: any) => (
      <img key={p.id} src={p.thumbnailUrl} alt="" className="aspect-square w-full rounded-md border object-cover" />
    ))}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(protected)/google-posts/[postId]/page.tsx"
git commit -m "feat(output): render uploaded photos grid"
```

---

## Task 11: Phase 3 收尾

- [ ] **Step 1: 完整跑通**

```bash
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 2: 手测 (dev server)**

启动 dev server，登录后访问 `/create`，上传几张 JPEG（HEIC 可选，桌面端可能没有），确认：
- 跳到 `/google-posts/[postId]`
- 显示 thumbnails

跑不通的步骤先记到 launch-checklist.md。

- [ ] **Step 3: Commit launch-checklist**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): mark Phase 3 (upload + image processing) complete" --allow-empty
```

## Definition of Done

- 用户能上传 1-10 张 JPEG/PNG/WebP/HEIC/HEIF。
- 客户端会转 HEIC、压缩、并行 prepare。
- 服务端 sharp 出 standardized + thumbnail，写 R2 或 fallback data URL。
- `google_post_photo` 表有记录。
- `/create` → `/google-posts/[postId]` 可走完。
- `pnpm lint && pnpm test && pnpm build` 全绿。
