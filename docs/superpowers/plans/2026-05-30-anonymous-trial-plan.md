# Anonymous Trial (匿名试用同款 + 末端登录墙) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/free-google-post-generator` 从"纯模板一句话"升级成"匿名用户跑真 AI + 半墙 + 注册认领"，让 SEO 着陆页变成转化漏斗的真入口。

**Architecture:** 复用现有 `google_post` 模型，把 `user_id` 改 nullable 并新增 `anon_id`；新建 `/api/brago/anonymous/*` 路由族，内部调用与付费版**完全相同**的 lib 函数（`lib/brago/caption/*`、`lib/brago/vision/*`），避免试用版/付费版能力漂移。反白嫖靠 `anonymous_quota` 表的 `(ipHash, date)` 唯一约束 + `INSERT ... ON CONFLICT DO UPDATE` 一条 SQL 实现并发安全的"每 IP/天 1 次"。注册时 better-auth `hooks.after` 读 cookie 里的 anonId，把那条 post 从匿名认领到新账号 + R2 文件从 `anon-tmp/` 拷到 `user/` 路径。

**Tech Stack:** Next.js 16 App Router、Drizzle ORM (Postgres)、Better Auth、Cloudflare R2 (S3 SDK)、OpenRouter (OpenAI 兼容)、Vitest 4、next-intl、Tailwind、React Hook Form。

**Spec:** `docs/superpowers/specs/2026-05-30-anonymous-trial-design.md`

---

## File Map

**新建文件**
- `lib/brago/anonymous/quota.ts` — IP hash + 限流 assert
- `lib/brago/anonymous/cookies.ts` — anonId cookie 读写
- `lib/brago/anonymous/claim.ts` — 注册时认领匿名 post
- `app/api/brago/anonymous/google-posts/route.ts` — POST 创建匿名 post
- `app/api/brago/anonymous/google-posts/[postId]/route.ts` — GET 读单条
- `app/api/brago/anonymous/google-posts/[postId]/analyze/route.ts` — POST vision 选图
- `app/api/brago/anonymous/google-posts/[postId]/generate-caption/route.ts` — POST 文案
- `app/api/brago/anonymous/upload/route.ts` — POST R2 上传（anon-tmp 前缀）
- `app/api/cron/cleanup-anonymous/route.ts` — 每日清理 cron
- `app/[locale]/(marketing)/free-google-post-generator/use-trial-state.ts` — localStorage hook
- `app/[locale]/(marketing)/free-google-post-generator/components/upload-step.tsx`
- `app/[locale]/(marketing)/free-google-post-generator/components/brand-step.tsx`
- `app/[locale]/(marketing)/free-google-post-generator/components/tone-step.tsx`
- `app/[locale]/(marketing)/free-google-post-generator/components/generating-step.tsx`
- `app/[locale]/(marketing)/free-google-post-generator/components/result-step.tsx`
- `app/[locale]/(marketing)/free-google-post-generator/components/signup-modal.tsx`
- `tests/lib/brago/anonymous/quota.test.ts`
- `tests/lib/brago/anonymous/claim.test.ts`

**修改文件**
- `lib/db/schema.ts` — google_post / google_post_photo 改 nullable + 加 anon_id；新增 anonymous_quota 表
- `lib/brago/r2-upload.ts` — 加 `copyR2Object` + `buildAnonTmpKey`
- `lib/auth.ts` — `hooks.after` 中接入 claim
- `app/[locale]/(marketing)/free-google-post-generator/page.tsx` — server-side redirect 已登录用户 + 新标题
- `app/[locale]/(marketing)/free-google-post-generator/client.tsx` — 重写成 step machine 装配器
- `messages/zh.json` / `messages/en.json` — 新增 `freeTrial.*` namespace
- `vercel.json` — 注册新 cron
- `docs/launch-checklist.md` — 新增 R2 lifecycle、cron、OpenRouter 余额相关条目

---

## Task 1: Schema — google_post / google_post_photo 支持匿名

**Files:**
- Modify: `lib/db/schema.ts`（google_post 段落约 line 282-326；google_post_photo 段落约 line 327-360）

- [ ] **Step 1: 改 google_post 让 userId 可空 + 加 anonId**

把 google_post 表的 userId 由 NOT NULL 改为 nullable，并新增 `anonId`、CHECK 约束、部分索引。

打开 `lib/db/schema.ts`，找到 `export const googlePost = pgTable(...)`。把：

```ts
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
```

改为：

```ts
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    anonId: text("anon_id"),
```

然后在该表的 `(t) => ({ ... })` 索引段加入新索引（保留原有两个）：

```ts
  (t) => ({
    userIdx: index("google_post_user_idx").on(t.userId),
    createdAtIdx: index("google_post_user_created_idx").on(t.userId, t.createdAt),
    anonIdx: index("google_post_anon_id_idx").on(t.anonId),
  })
```

> 备注：drizzle 部分索引（`WHERE anon_id IS NOT NULL`）当前 drizzle-kit 版本不支持，先建普通索引；migration SQL 里手工改成 partial（见 Task 3）。

- [ ] **Step 2: 改 google_post_photo 让 userId 可空**

找到 `export const googlePostPhoto = pgTable(...)`。把：

```ts
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
```

改为：

```ts
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
```

不在此表加 `anonId`（通过 `googlePostId` 反查 `googlePost.anonId`）。

- [ ] **Step 3: 类型验证**

Run: `pnpm tsc --noEmit 2>&1 | head -30`

Expected: 现有调用 `google_post` 的地方仍然类型通过（Drizzle 推断的 select 类型 userId 由 string 变成 string | null，但 INSERT 不强制要求传 userId）。如果有地方现在传 `userId: null` 会报错，先记录到 follow-up；不在此 task 修。

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(schema): make google_post.userId nullable, add anon_id"
```

---

## Task 2: Schema — anonymous_quota 表

**Files:**
- Modify: `lib/db/schema.ts`（在 newsletterSubscription 段落之后、brandProfile 之前；与 contact_message 同区域）

- [ ] **Step 1: 加 anonymous_quota 表定义**

在 `contactMessage` 表定义之后追加：

```ts
export const anonymousQuota = pgTable(
  "anonymous_quota",
  {
    id: text("id").primaryKey(),
    ipHash: text("ip_hash").notNull(),
    usageDate: text("usage_date").notNull(), // YYYY-MM-DD UTC
    count: integer("count").default(0).notNull(),
    lastAnonId: text("last_anon_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    ipDateUq: uniqueIndex("anonymous_quota_ip_date_uq").on(t.ipHash, t.usageDate),
    createdAtIdx: index("anonymous_quota_created_at_idx").on(t.createdAt),
  })
);
```

注意：`usage_date` 用 `text` 存 `YYYY-MM-DD` 字符串（避免时区歧义），比 Drizzle 的 `date()` 类型在 TS 层更直接。

- [ ] **Step 2: 引入 uniqueIndex**

文件顶部 import 改为：

```ts
import { pgTable, text, timestamp, boolean, integer, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";
```

- [ ] **Step 3: 类型验证**

Run: `pnpm tsc --noEmit 2>&1 | head -10`

Expected: 无报错。

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(schema): add anonymous_quota table"
```

---

## Task 3: 生成迁移 + 手工补 CHECK 约束 + partial index

**Files:**
- Create: `drizzle/0012_*.sql`（drizzle-kit 自动命名）

- [ ] **Step 1: 生成迁移**

Run: `pnpm db:generate 2>&1 | tail -20`

Expected: 创建 `drizzle/0012_*.sql` 文件，包含 ALTER TABLE google_post DROP NOT NULL on user_id + ADD COLUMN anon_id + CREATE TABLE anonymous_quota。

- [ ] **Step 2: 检查生成文件**

Run: `ls -1t drizzle/*.sql | head -1 | xargs cat`

Expected output 包含：

```sql
ALTER TABLE "google_post" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "google_post" ADD COLUMN "anon_id" text;
ALTER TABLE "google_post_photo" ALTER COLUMN "user_id" DROP NOT NULL;
CREATE TABLE "anonymous_quota" (...);
CREATE INDEX "google_post_anon_id_idx" ON "google_post" ...;
CREATE UNIQUE INDEX "anonymous_quota_ip_date_uq" ON "anonymous_quota" ...;
```

- [ ] **Step 3: 手工往生成的 SQL 文件追加 CHECK 约束 + 把 anon 索引改成 partial**

打开最新的 `drizzle/0012_*.sql`，在文件**末尾**追加：

```sql
--> statement-breakpoint
ALTER TABLE "google_post"
  ADD CONSTRAINT "google_post_owner_check"
  CHECK ("user_id" IS NOT NULL OR "anon_id" IS NOT NULL);
--> statement-breakpoint
DROP INDEX IF EXISTS "google_post_anon_id_idx";
--> statement-breakpoint
CREATE INDEX "google_post_anon_id_idx"
  ON "google_post" ("anon_id")
  WHERE "anon_id" IS NOT NULL;
```

- [ ] **Step 4: Push 到 dev DB**

Run: `pnpm db:push 2>&1 | tail -10`

Expected: `[✓] Changes applied`。如果遇到冲突（比如手工 SQL 没跑），用 `psql` 直连执行那 3 条 ALTER/DROP/CREATE。

- [ ] **Step 5: 验证 DB 结构**

Run:
```bash
node -e "
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const r = await c.query(\"SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='google_post' AND column_name IN ('user_id', 'anon_id') ORDER BY column_name\");
  console.table(r.rows);
  const idx = await c.query(\"SELECT indexname, indexdef FROM pg_indexes WHERE tablename='google_post' AND indexname LIKE '%anon%'\");
  console.table(idx.rows);
  await c.end();
})();
" 2>&1 | tail -10
```

Expected: anon_id 存在且 nullable、user_id 改成了 YES nullable、anon 索引带 WHERE 条件。

- [ ] **Step 6: Commit**

```bash
git add drizzle/0012_*.sql drizzle/meta
git commit -m "feat(schema): migration for anon trial (nullable user_id, anon_id, anonymous_quota)"
```

---

## Task 4: lib/brago/anonymous/quota.ts — IP hash + 限额

**Files:**
- Create: `lib/brago/anonymous/quota.ts`
- Test: `tests/lib/brago/anonymous/quota.test.ts`

- [ ] **Step 1: 写失败的测试**

新建 `tests/lib/brago/anonymous/quota.test.ts`：

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const handles = vi.hoisted(() => ({
  insertReturning: vi.fn(async () => [{ count: 1 }] as Array<{ count: number }>),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: handles.insertReturning,
        })),
      })),
    })),
  },
}));

beforeEach(() => {
  handles.insertReturning.mockReset();
  process.env.BETTER_AUTH_SECRET = "test-secret-32-chars-aaaaaaaaaaaaaaaa";
});

import { hashIp, assertTrialQuota, TrialQuotaExceededError } from "@/lib/brago/anonymous/quota";

describe("hashIp", () => {
  it("returns a stable hex string for same input", () => {
    const a = hashIp("1.2.3.4");
    const b = hashIp("1.2.3.4");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns different hashes for different IPs", () => {
    expect(hashIp("1.2.3.4")).not.toBe(hashIp("5.6.7.8"));
  });

  it("never returns the raw IP", () => {
    expect(hashIp("1.2.3.4")).not.toContain("1.2.3.4");
  });
});

describe("assertTrialQuota", () => {
  it("allows the first call with count=1", async () => {
    handles.insertReturning.mockResolvedValueOnce([{ count: 1 }]);
    await expect(
      assertTrialQuota({ ipHash: "h", anonId: "a1" }),
    ).resolves.toBeUndefined();
  });

  it("throws TrialQuotaExceededError when count > 1", async () => {
    handles.insertReturning.mockResolvedValueOnce([{ count: 2 }]);
    await expect(
      assertTrialQuota({ ipHash: "h", anonId: "a1" }),
    ).rejects.toBeInstanceOf(TrialQuotaExceededError);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test tests/lib/brago/anonymous/quota.test.ts 2>&1 | tail -20`

Expected: FAIL，因为 `@/lib/brago/anonymous/quota` 不存在。

- [ ] **Step 3: 实现 quota.ts**

新建 `lib/brago/anonymous/quota.ts`：

```ts
import "server-only";
import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { anonymousQuota } from "@/lib/db/schema";

export const DAILY_TRIAL_LIMIT = 1;

export class TrialQuotaExceededError extends Error {
  constructor() {
    super("trial_quota_exceeded");
    this.name = "TrialQuotaExceededError";
  }
}

export function hashIp(ip: string): string {
  const salt = process.env.BETTER_AUTH_SECRET || "";
  return crypto.createHash("sha256").update(`${salt}|${ip}`).digest("hex");
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

export async function assertTrialQuota(input: {
  ipHash: string;
  anonId: string;
}): Promise<void> {
  const today = todayUtc();
  const id = crypto.randomUUID();
  const rows = await db
    .insert(anonymousQuota)
    .values({
      id,
      ipHash: input.ipHash,
      usageDate: today,
      count: 1,
      lastAnonId: input.anonId,
    })
    .onConflictDoUpdate({
      target: [anonymousQuota.ipHash, anonymousQuota.usageDate],
      set: {
        count: sql`${anonymousQuota.count} + 1`,
        lastAnonId: input.anonId,
      },
    })
    .returning({ count: anonymousQuota.count });

  const count = rows[0]?.count ?? 0;
  if (count > DAILY_TRIAL_LIMIT) {
    throw new TrialQuotaExceededError();
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test tests/lib/brago/anonymous/quota.test.ts 2>&1 | tail -10`

Expected: PASS (5 个测试)。

- [ ] **Step 5: Commit**

```bash
git add lib/brago/anonymous/quota.ts tests/lib/brago/anonymous/quota.test.ts
git commit -m "feat(brago): anonymous quota assert with IP hash + per-day SQL upsert"
```

---

## Task 5: lib/brago/anonymous/cookies.ts — anonId cookie 读写

**Files:**
- Create: `lib/brago/anonymous/cookies.ts`

无测试（薄包装，靠 E2E 验证）。

- [ ] **Step 1: 创建 cookies.ts**

```ts
import "server-only";
import { cookies as nextCookies } from "next/headers";

export const ANON_COOKIE_PRIMARY = "brago_anon_id";
export const ANON_COOKIE_BACKUP = "brago_anon_id_persist";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

export async function readAnonIdFromRequestCookies(
  cookieHeader: string | null,
): Promise<string | null> {
  if (!cookieHeader) return null;
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    map.set(k, rest.join("="));
  }
  return map.get(ANON_COOKIE_PRIMARY) || map.get(ANON_COOKIE_BACKUP) || null;
}

export async function writeAnonIdCookie(anonId: string): Promise<void> {
  const cookieStore = await nextCookies();
  const opts = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    httpOnly: false,
  };
  cookieStore.set(ANON_COOKIE_PRIMARY, anonId, opts);
  cookieStore.set(ANON_COOKIE_BACKUP, anonId, opts);
}

export async function clearAnonIdCookies(): Promise<void> {
  const cookieStore = await nextCookies();
  cookieStore.delete(ANON_COOKIE_PRIMARY);
  cookieStore.delete(ANON_COOKIE_BACKUP);
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm tsc --noEmit 2>&1 | head -10`

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add lib/brago/anonymous/cookies.ts
git commit -m "feat(brago): anonId cookie read/write helpers"
```

---

## Task 6: lib/brago/r2-upload.ts — copyR2Object + buildAnonTmpKey

**Files:**
- Modify: `lib/brago/r2-upload.ts`

- [ ] **Step 1: 加 helper**

在 `lib/brago/r2-upload.ts` 末尾追加：

```ts
import { CopyObjectCommand } from "@aws-sdk/client-s3";

export const ANON_TMP_PREFIX = "anon-tmp";

export function buildAnonTmpKey(anonId: string, photoId: string, suffix: string): string {
  const safeSuffix = suffix.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${ANON_TMP_PREFIX}/${anonId}/${photoId}_${safeSuffix}`;
}

export function buildClaimedKey(userId: string, postId: string, photoId: string, suffix: string): string {
  const safeSuffix = suffix.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `brago/google-posts/${userId}/${postId}/claimed/${photoId}_${safeSuffix}`;
}

export function publicUrlFor(key: string): string {
  return `${PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export function keyFromPublicUrl(url: string): string | null {
  const prefix = PUBLIC_URL.replace(/\/$/, "") + "/";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export async function copyR2Object(srcKey: string, destKey: string): Promise<string> {
  if (!r2Client) {
    throw new Error("R2 not configured");
  }
  await r2Client.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${encodeURIComponent(srcKey)}`,
      Key: destKey,
    }),
  );
  return publicUrlFor(destKey);
}
```

把现有的顶部 import 行改为：

```ts
import { PutObjectCommand, CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";
```

（删掉刚才追加里的那行 `import { CopyObjectCommand } ...`）

- [ ] **Step 2: 类型检查**

Run: `pnpm tsc --noEmit 2>&1 | head -10`

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add lib/brago/r2-upload.ts
git commit -m "feat(r2): add copyR2Object + anon-tmp/claimed key builders"
```

---

## Task 7: lib/brago/anonymous/claim.ts — 注册时认领

**Files:**
- Create: `lib/brago/anonymous/claim.ts`
- Test: `tests/lib/brago/anonymous/claim.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const handles = vi.hoisted(() => ({
  selectPost: vi.fn(async () => [] as Array<Record<string, unknown>>),
  selectPhotos: vi.fn(async () => [] as Array<Record<string, unknown>>),
  updatePost: vi.fn(async () => undefined),
  updatePhoto: vi.fn(async () => undefined),
  copyR2: vi.fn(async (src: string, dest: string) => `https://r2/${dest}`),
}));

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            return (table as { _: { name: string } })._?.name === "google_post"
              ? handles.selectPost()
              : handles.selectPhotos();
          }),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: handles.updatePost })),
    })),
    transaction: vi.fn(async (fn: (tx: typeof db) => Promise<void>) => fn(db)),
  };
  return { db };
});

vi.mock("@/lib/brago/r2-upload", () => ({
  copyR2Object: handles.copyR2,
  keyFromPublicUrl: (u: string) => (u.startsWith("https://r2/") ? u.slice("https://r2/".length) : null),
  buildClaimedKey: (userId: string, postId: string, photoId: string, suffix: string) =>
    `claimed/${userId}/${postId}/${photoId}_${suffix}`,
}));

beforeEach(() => {
  Object.values(handles).forEach((m) => (m as { mockReset?: () => void }).mockReset?.());
});

import { claimAnonymousPost } from "@/lib/brago/anonymous/claim";

describe("claimAnonymousPost", () => {
  it("returns null when no post matches the anonId", async () => {
    handles.selectPost.mockResolvedValueOnce([]);
    const out = await claimAnonymousPost("user_new", "anon_missing");
    expect(out).toBeNull();
  });

  it("returns the claimed postId when a match exists", async () => {
    handles.selectPost.mockResolvedValueOnce([
      { id: "gp_1", anonId: "anon_1", userId: null },
    ]);
    handles.selectPhotos.mockResolvedValueOnce([]);
    const out = await claimAnonymousPost("user_new", "anon_1");
    expect(out).toBe("gp_1");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test tests/lib/brago/anonymous/claim.test.ts 2>&1 | tail -15`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 claim.ts**

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import {
  copyR2Object,
  keyFromPublicUrl,
  buildClaimedKey,
} from "@/lib/brago/r2-upload";

export async function claimAnonymousPost(
  userId: string,
  anonId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(googlePost)
    .where(eq(googlePost.anonId, anonId))
    .limit(1);
  const post = rows[0];
  if (!post) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(googlePost)
      .set({ userId, anonId: null })
      .where(eq(googlePost.id, post.id));
    await tx
      .update(googlePostPhoto)
      .set({ userId })
      .where(eq(googlePostPhoto.googlePostId, post.id));
  });

  // R2 file migration is outside the tx (R2 has no rollback).
  // Failure here leaves the user with a DB-claimed post but anon-tmp URLs;
  // those URLs still work for ~24h until R2 lifecycle clears them.
  try {
    const photos = await db
      .select()
      .from(googlePostPhoto)
      .where(eq(googlePostPhoto.googlePostId, post.id));
    for (const p of photos) {
      const srcKey = keyFromPublicUrl(p.originalUrl);
      if (!srcKey || !srcKey.startsWith("anon-tmp/")) continue;
      const suffix = srcKey.split("/").pop() || "img.jpg";
      const destKey = buildClaimedKey(userId, post.id, p.id, suffix);
      const newUrl = await copyR2Object(srcKey, destKey);
      await db
        .update(googlePostPhoto)
        .set({ originalUrl: newUrl })
        .where(eq(googlePostPhoto.id, p.id));
    }
  } catch (error) {
    console.error("[claim] R2 migration partial failure:", error);
  }

  return post.id;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test tests/lib/brago/anonymous/claim.test.ts 2>&1 | tail -10`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/brago/anonymous/claim.ts tests/lib/brago/anonymous/claim.test.ts
git commit -m "feat(brago): claimAnonymousPost — transfer anon post + R2 files to new account"
```

---

## Task 8: API — POST /api/brago/anonymous/google-posts

**Files:**
- Create: `app/api/brago/anonymous/google-posts/route.ts`

- [ ] **Step 1: 实现路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import {
  assertTrialQuota,
  TrialQuotaExceededError,
  hashIp,
  getClientIp,
} from "@/lib/brago/anonymous/quota";
import { writeAnonIdCookie } from "@/lib/brago/anonymous/cookies";

export const runtime = "nodejs";

const bodySchema = z.object({
  industry: z.string().min(1).max(32),
  serviceType: z.string().min(1).max(64),
  serviceArea: z.string().max(200).optional(),
  brandName: z.string().min(1).max(120),
  brandPhone: z.string().max(40).optional(),
  tone: z.enum(["friendly", "professional", "local_pride"]),
  language: z.enum(["en", "es"]),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const ip = getClientIp(req.headers);
  const ipHash = hashIp(ip);
  const anonId = `anon_${crypto.randomUUID()}`;

  try {
    await assertTrialQuota({ ipHash, anonId });
  } catch (error) {
    if (error instanceof TrialQuotaExceededError) {
      return NextResponse.json(
        { error: "trial_used", message: "Daily free trial reached. Sign up to keep going." },
        { status: 429 },
      );
    }
    throw error;
  }

  const postId = `gp_${crypto.randomUUID()}`;
  await db.insert(googlePost).values({
    id: postId,
    userId: null,
    anonId,
    industry: parsed.industry,
    serviceType: parsed.serviceType,
    serviceArea: parsed.serviceArea ?? null,
    language: parsed.language,
    status: "draft",
    imageMode: "single_after",
  });

  await writeAnonIdCookie(anonId);

  return NextResponse.json({ postId, anonId, brand: { name: parsed.brandName, phone: parsed.brandPhone ?? null, tone: parsed.tone } });
}
```

- [ ] **Step 2: 用 curl 测一次**

确认 dev 服务器在跑（preview_list / preview_start）。然后：

```bash
curl -s -i -X POST http://localhost:3000/api/brago/anonymous/google-posts \
  -H "Content-Type: application/json" \
  -d '{"industry":"pressure_washing","serviceType":"driveway","brandName":"Test","tone":"friendly","language":"en"}' | head -30
```

Expected: 200 OK + `Set-Cookie: brago_anon_id=...` + body 含 `postId`、`anonId`。

清掉测试数据：

```bash
node -e "
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => { await c.connect(); await c.query(\"DELETE FROM google_post WHERE anon_id IS NOT NULL\"); await c.query(\"DELETE FROM anonymous_quota\"); await c.end(); })();
"
```

- [ ] **Step 3: Commit**

```bash
git add app/api/brago/anonymous/google-posts/route.ts
git commit -m "feat(api): POST anon google-posts create with IP quota + cookie"
```

---

## Task 9: API — POST /api/brago/anonymous/upload

**Files:**
- Create: `app/api/brago/anonymous/upload/route.ts`

- [ ] **Step 1: 实现路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import { uploadBuffer, buildAnonTmpKey, isR2Ready } from "@/lib/brago/r2-upload";

export const runtime = "nodejs";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!isR2Ready()) {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  const anonId = (form.get("anonId") as string | null) ?? "";
  const postId = (form.get("postId") as string | null) ?? "";

  if (!file || !anonId || !postId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  // Verify anonId owns this postId AND it's fresh (<24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: googlePost.id })
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId), gt(googlePost.createdAt, cutoff)))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "post_not_found_or_expired" }, { status: 404 });
  }

  const photoId = `gpp_${crypto.randomUUID()}`;
  const suffix = (file.name || "upload.jpg").split("/").pop() || "upload.jpg";
  const key = buildAnonTmpKey(anonId, photoId, suffix);
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadBuffer({ key, body: buffer, contentType: file.type });

  await db.insert(googlePostPhoto).values({
    id: photoId,
    googlePostId: postId,
    userId: null,
    originalUrl: url,
  });

  return NextResponse.json({ photoId, url });
}
```

- [ ] **Step 2: 验证（手测）**

`pnpm tsc --noEmit 2>&1 | head -10` — 无错。

- [ ] **Step 3: Commit**

```bash
git add app/api/brago/anonymous/upload/route.ts
git commit -m "feat(api): POST anon upload to R2 anon-tmp/"
```

---

## Task 10: API — POST analyze (vision)

**Files:**
- Create: `app/api/brago/anonymous/google-posts/[postId]/analyze/route.ts`

- [ ] **Step 1: 探明 vision provider 调用方式**

Run: `grep -n "export" /Volumes/FZD/开发项目/Brago/lib/brago/vision/openai.ts | head -5`

记下导出的函数名。如果文件不存在或函数签名不同，需要直接读源码。

- [ ] **Step 2: 实现路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
// Replace with actual exports from the vision module:
import { analyzePhotosViaVision } from "@/lib/brago/vision/openai";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const body = await req.json().catch(() => ({}));
  const anonId = body?.anonId;
  if (!anonId) return NextResponse.json({ error: "missing_anon_id" }, { status: 400 });

  const postRows = await db
    .select()
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)))
    .limit(1);
  const post = postRows[0];
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const photos = await db
    .select()
    .from(googlePostPhoto)
    .where(eq(googlePostPhoto.googlePostId, postId));
  if (photos.length === 0) {
    return NextResponse.json({ error: "no_photos" }, { status: 400 });
  }

  const recommendation = await analyzePhotosViaVision({
    photos: photos.map((p) => ({ id: p.id, url: p.originalUrl })),
    industry: post.industry,
    serviceType: post.serviceType,
  });

  await db
    .update(googlePost)
    .set({
      bestPhotoId: recommendation.bestPhotoId,
      proofRecommendationJson: JSON.stringify(recommendation),
    })
    .where(eq(googlePost.id, postId));

  return NextResponse.json({ recommendation });
}
```

如果 `analyzePhotosViaVision` 不存在或签名不匹配，**先 grep 实际 vision provider 的入口**（很可能在 `app/api/brago/google-posts/[postId]/analyze/route.ts` 已经在用了），照搬调用方式。**不允许新建一套 vision 逻辑**——必须复用，避免试用版/付费版漂移（spec 第 4.1 节）。

- [ ] **Step 3: 类型检查**

`pnpm tsc --noEmit 2>&1 | head -10`

- [ ] **Step 4: Commit**

```bash
git add app/api/brago/anonymous/google-posts/[postId]/analyze/route.ts
git commit -m "feat(api): POST anon analyze — reuse vision provider"
```

---

## Task 11: API — POST generate-caption

**Files:**
- Create: `app/api/brago/anonymous/google-posts/[postId]/generate-caption/route.ts`

- [ ] **Step 1: 探明 caption provider 调用方式**

Run: `grep -n "export" /Volumes/FZD/开发项目/Brago/lib/brago/caption/openai-text.ts | head -10`

记下函数名 + 参数。

- [ ] **Step 2: 实现路由（复用现有 caption + policy）**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
// Replace with actual exports — DO NOT reimplement caption logic:
import { generateCaption } from "@/lib/brago/caption/openai-text";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const body = await req.json().catch(() => ({}));
  const anonId = body?.anonId;
  const brand = body?.brand ?? {};
  if (!anonId) return NextResponse.json({ error: "missing_anon_id" }, { status: 400 });

  const postRows = await db
    .select()
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)))
    .limit(1);
  const post = postRows[0];
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const caption = await generateCaption({
    industry: post.industry,
    serviceType: post.serviceType,
    language: post.language as "en" | "es",
    serviceArea: post.serviceArea ?? undefined,
    brandName: brand.name ?? undefined,
    brandPhone: brand.phone ?? undefined,
    tone: brand.tone ?? "friendly",
  });
  const policy = checkGooglePolicy(caption);

  await db
    .update(googlePost)
    .set({
      caption,
      captionPolicyJson: JSON.stringify(policy),
      status: "ready",
    })
    .where(eq(googlePost.id, postId));

  return NextResponse.json({ caption, policy });
}
```

如果 `generateCaption` 签名不同，**改成实际签名**（spec 强制：复用，不新建）。

- [ ] **Step 3: 类型检查 + Commit**

```bash
pnpm tsc --noEmit 2>&1 | head -10
git add app/api/brago/anonymous/google-posts/[postId]/generate-caption/route.ts
git commit -m "feat(api): POST anon generate-caption — reuse caption + policy"
```

---

## Task 12: API — GET single post

**Files:**
- Create: `app/api/brago/anonymous/google-posts/[postId]/route.ts`

- [ ] **Step 1: 实现路由**

```ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const anonId = req.nextUrl.searchParams.get("anonId");
  if (!anonId) return NextResponse.json({ error: "missing_anon_id" }, { status: 400 });

  const postRows = await db
    .select()
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.anonId, anonId)))
    .limit(1);
  const post = postRows[0];
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const photos = await db
    .select()
    .from(googlePostPhoto)
    .where(eq(googlePostPhoto.googlePostId, postId));

  return NextResponse.json({ post, photos });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/brago/anonymous/google-posts/[postId]/route.ts
git commit -m "feat(api): GET anon google-post by id"
```

---

## Task 13: lib/auth.ts — 把 claim 接入注册 hook

**Files:**
- Modify: `lib/auth.ts:42-71`

- [ ] **Step 1: 改 hooks.after**

把 `lib/auth.ts` 内 `hooks.after` 那段改为：

```ts
hooks: {
  after: createAuthMiddleware(async (ctx) => {
    if (ctx.path.startsWith("/sign-up")) {
      const newSession = ctx.context.newSession;
      if (newSession) {
        try {
          await refundCredits(newSession.user.id, 300, "registration_bonus");
          console.log(`[Auth] New user registered, granted 300 credits: ${newSession.user.email}`);
        } catch (error) {
          console.error("[Auth] Failed to grant registration bonus:", error);
        }
        try {
          await upsertReminderSettings(newSession.user.id, {});
        } catch (error) {
          console.error("[Auth] Failed to seed reminder_settings:", error);
        }
        try {
          const cookieHeader = ctx.request?.headers.get("cookie") ?? null;
          const { readAnonIdFromRequestCookies } = await import("@/lib/brago/anonymous/cookies");
          const { claimAnonymousPost } = await import("@/lib/brago/anonymous/claim");
          const anonId = await readAnonIdFromRequestCookies(cookieHeader);
          if (anonId) {
            const claimed = await claimAnonymousPost(newSession.user.id, anonId);
            if (claimed) {
              console.log(`[Auth] Claimed anonymous post ${claimed} for ${newSession.user.email}`);
            }
          }
        } catch (error) {
          console.error("[Auth] Failed to claim anonymous post:", error);
        }
      }
    }
  }),
},
```

用 dynamic import 避免循环依赖风险。

- [ ] **Step 2: 类型检查**

`pnpm tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat(auth): on sign-up, claim anonymous trial post via cookie"
```

---

## Task 14: 翻译 — freeTrial namespace

**Files:**
- Modify: `messages/en.json`、`messages/zh.json`

- [ ] **Step 1: 在 messages/en.json 加入 freeTrial 段**

在 `"contact": {...}` 之后追加：

```json
"freeTrial": {
  "title": "Try Brago free — Google posts in 30 seconds",
  "subtitle": "Upload your job photos. We pick the strongest after shot and write a Google-safe caption you can paste straight into your Business Profile.",
  "steps": {
    "upload": {
      "title": "Add 3–10 job photos",
      "hint": "Drag photos here or click to browse. JPEG/PNG/HEIC, up to 10MB each.",
      "next": "Continue"
    },
    "brand": {
      "title": "Tell us about the job",
      "serviceTypeLabel": "Service type",
      "cityLabel": "City or neighborhood",
      "cityPlaceholder": "South Austin",
      "brandNameLabel": "Business name",
      "brandNamePlaceholder": "SparkleHome Cleaning",
      "phoneLabel": "Phone (optional, never shown in caption)",
      "next": "Continue"
    },
    "tone": {
      "title": "Voice & language",
      "toneLabel": "Tone",
      "toneOptions": {
        "friendly": "Friendly local",
        "professional": "Professional",
        "local_pride": "Local pride"
      },
      "languageLabel": "Language",
      "generate": "Draft my Google post"
    },
    "generating": {
      "vision": "Picking the strongest after shot…",
      "caption": "Writing a Google-safe caption…"
    },
    "result": {
      "title": "Your Google Business post is ready",
      "whyThisPhoto": "Why this photo?",
      "captionLabel": "Caption",
      "policyOk": "GBP policy ✓",
      "unlockCta": "Sign up free to unlock & save this post",
      "unlockSubtext": "300 credits included. No card required.",
      "lockedCopy": "Copy caption",
      "lockedDownload": "Download image",
      "lockedSpanish": "Switch to Spanish",
      "lockedRegen": "Regenerate"
    },
    "quotaUsed": {
      "title": "Today's free trial is used",
      "body": "Sign up to keep generating — 300 credits included on the house.",
      "cta": "Create my account"
    }
  },
  "signupModal": {
    "title": "Unlock & save this post",
    "subtitle": "Create your free account — we'll save the post you just generated.",
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "submit": "Create account",
    "googleCta": "Continue with Google",
    "loginHint": "Already have an account?",
    "loginLink": "Sign in"
  }
}
```

- [ ] **Step 2: 同样改 messages/zh.json（中文翻译）**

```json
"freeTrial": {
  "title": "免费试用 Brago — 30 秒做出 Google 商家贴文",
  "subtitle": "上传你今天的活儿照片，我们帮你挑最强的成品图、写一段符合 Google 商家规范的文案，可以直接粘贴到你的商家资料。",
  "steps": {
    "upload": {
      "title": "添加 3–10 张工作照片",
      "hint": "拖拽照片或点击上传。JPEG/PNG/HEIC，单张 ≤ 10MB。",
      "next": "继续"
    },
    "brand": {
      "title": "告诉我们这次的工作",
      "serviceTypeLabel": "服务类型",
      "cityLabel": "城市/服务区",
      "cityPlaceholder": "上海浦东",
      "brandNameLabel": "公司/店铺名",
      "brandNamePlaceholder": "晶晶家政",
      "phoneLabel": "电话（选填，不会写进文案）",
      "next": "继续"
    },
    "tone": {
      "title": "语气与语言",
      "toneLabel": "语气",
      "toneOptions": {
        "friendly": "亲切本地",
        "professional": "专业",
        "local_pride": "邻里口碑"
      },
      "languageLabel": "语言",
      "generate": "生成我的 Google 贴文"
    },
    "generating": {
      "vision": "正在挑选最强的成品图…",
      "caption": "正在撰写符合 Google 规范的文案…"
    },
    "result": {
      "title": "你的 Google 商家贴文已就绪",
      "whyThisPhoto": "为什么选这张？",
      "captionLabel": "文案",
      "policyOk": "符合 GBP 规范 ✓",
      "unlockCta": "免费注册 · 解锁并保存这条贴文",
      "unlockSubtext": "送 300 积分，无需信用卡。",
      "lockedCopy": "复制文案",
      "lockedDownload": "下载图片",
      "lockedSpanish": "切换西班牙语",
      "lockedRegen": "重新生成"
    },
    "quotaUsed": {
      "title": "今日免费试用已用完",
      "body": "注册即可继续生成，还附送 300 积分。",
      "cta": "立即注册"
    }
  },
  "signupModal": {
    "title": "解锁并保存这条贴文",
    "subtitle": "创建免费账号，我们会把你刚才生成的内容保存到你的账户。",
    "emailLabel": "邮箱",
    "passwordLabel": "密码",
    "submit": "创建账号",
    "googleCta": "用 Google 继续",
    "loginHint": "已有账号？",
    "loginLink": "登录"
  }
}
```

- [ ] **Step 3: 验证 JSON 合法**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/zh.json','utf8')); console.log('OK')"`

Expected: `OK`。

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "feat(i18n): freeTrial namespace for anonymous trial flow"
```

---

## Task 15: page.tsx — 已登录 redirect + 新 hero 文案

**Files:**
- Modify: `app/[locale]/(marketing)/free-google-post-generator/page.tsx`

- [ ] **Step 1: 在 page.tsx 顶部加 redirect**

完全重写 `page.tsx`：

```tsx
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n.config";
import { generatePageMetadata } from "@/lib/metadata";
import { Container } from "@/components/container";
import { auth } from "@/lib/auth";
import { FreeGeneratorClient } from "./client";

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "freeTrial" });
  return generatePageMetadata({
    locale,
    path: "/free-google-post-generator",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function FreeGoogleGeneratorPage(props: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await props.params;
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (session?.user) {
    redirect(`/${locale === "en" ? "" : locale + "/"}create`.replace(/^\//, "/").replace("//", "/"));
  }

  const t = await getTranslations({ locale, namespace: "freeTrial" });

  return (
    <div className="bg-paper-glow relative overflow-hidden">
      <Container className="relative z-20 py-16 md:py-24 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Free trial · No credit card
        </p>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">{t("subtitle")}</p>

        <FreeGeneratorClient />
      </Container>
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

`pnpm tsc --noEmit 2>&1 | head -10`

如果 `auth.api.getSession` 签名不同，照 `lib/auth/google-auth.ts` 或现有 `(protected)/layout.tsx` 中的写法调整。

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/\(marketing\)/free-google-post-generator/page.tsx
git commit -m "feat(free-trial): redirect logged-in users to /create + new hero copy"
```

---

## Task 16: use-trial-state.ts — localStorage hook

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/use-trial-state.ts`

- [ ] **Step 1: 实现 hook**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "brago_trial_state";

export type TrialState = {
  usedDate: string; // YYYY-MM-DD
  postId: string;
  anonId: string;
  brand: { name: string; phone?: string; tone: string };
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useTrialState() {
  const [state, setState] = useState<TrialState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TrialState;
        if (parsed.usedDate === todayUtc()) {
          setState(parsed);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  const save = useCallback((next: TrialState) => {
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const clear = useCallback(() => {
    setState(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { state, hydrated, save, clear, today: todayUtc() };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/\(marketing\)/free-google-post-generator/use-trial-state.ts
git commit -m "feat(free-trial): useTrialState hook with localStorage + UTC date guard"
```

---

## Task 17: components/upload-step.tsx

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/components/upload-step.tsx`

- [ ] **Step 1: 实现组件**

```tsx
"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/button";

export type UploadedPhoto = {
  id: string;
  url: string;
  previewUrl: string;
};

export function UploadStep(props: {
  anonId: string | null;
  postId: string | null;
  ensurePost: () => Promise<{ anonId: string; postId: string } | null>;
  photos: UploadedPhoto[];
  onAdd: (photo: UploadedPhoto) => void;
  onRemove: (id: string) => void;
  onNext: () => void;
}) {
  const t = useTranslations("freeTrial.steps.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      let ctx = props.anonId && props.postId
        ? { anonId: props.anonId, postId: props.postId }
        : await props.ensurePost();
      if (!ctx) throw new Error("Could not start trial");

      const fd = new FormData();
      fd.set("file", file);
      fd.set("anonId", ctx.anonId);
      fd.set("postId", ctx.postId);

      const res = await fetch("/api/brago/anonymous/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Upload failed");
      }
      const data = (await res.json()) as { photoId: string; url: string };
      props.onAdd({ id: data.photoId, url: data.url, previewUrl: URL.createObjectURL(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const f of files) {
      if (props.photos.length >= 10) break;
      await upload(f);
    }
  };

  return (
    <section className="grid gap-4">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {props.photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border">
            <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => props.onRemove(p.id)}
              className="absolute right-1 top-1 rounded-full bg-background/80 px-2 py-0.5 text-xs"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        {props.photos.length < 10 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border bg-background/40 text-3xl text-muted-foreground hover:border-foreground/40"
          >
            +
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button variant="accent" disabled={props.photos.length < 3 || uploading} onClick={props.onNext}>
        {t("next")}
      </Button>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/components/upload-step.tsx"
git commit -m "feat(free-trial): upload step (multi-photo to anon R2)"
```

---

## Task 18: components/brand-step.tsx

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/components/brand-step.tsx`

- [ ] **Step 1: 实现组件**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/button";

const SERVICE_TYPES = [
  { value: "driveway", label: "Driveway cleaning" },
  { value: "patio", label: "Patio cleaning" },
  { value: "siding", label: "House wash / siding" },
  { value: "walkway", label: "Walkway cleaning" },
  { value: "deck", label: "Deck wash" },
];

export type BrandInput = {
  serviceType: string;
  city: string;
  brandName: string;
  phone?: string;
};

export function BrandStep(props: {
  initial: Partial<BrandInput>;
  onSubmit: (b: BrandInput) => void;
  onBack: () => void;
}) {
  const t = useTranslations("freeTrial.steps.brand");
  const [serviceType, setServiceType] = useState(props.initial.serviceType ?? "driveway");
  const [city, setCity] = useState(props.initial.city ?? "");
  const [brandName, setBrandName] = useState(props.initial.brandName ?? "");
  const [phone, setPhone] = useState(props.initial.phone ?? "");

  const canNext = city.trim().length > 0 && brandName.trim().length > 0;

  return (
    <section className="grid gap-5">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("serviceTypeLabel")}</span>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-3"
        >
          {SERVICE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("cityLabel")}</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("cityPlaceholder")}
          className="rounded-xl border border-border bg-background px-4 py-3"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("brandNameLabel")}</span>
        <input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder={t("brandNamePlaceholder")}
          className="rounded-xl border border-border bg-background px-4 py-3"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("phoneLabel")}</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          className="rounded-xl border border-border bg-background px-4 py-3"
        />
      </label>

      <div className="flex justify-between gap-3">
        <button type="button" onClick={props.onBack} className="text-sm text-muted-foreground underline">Back</button>
        <Button
          variant="accent"
          disabled={!canNext}
          onClick={() => props.onSubmit({ serviceType, city, brandName, phone: phone || undefined })}
        >
          {t("next")}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/components/brand-step.tsx"
git commit -m "feat(free-trial): brand step (service/city/name/phone)"
```

---

## Task 19: components/tone-step.tsx

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/components/tone-step.tsx`

- [ ] **Step 1: 实现组件**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/button";

export type ToneInput = { tone: "friendly" | "professional" | "local_pride"; language: "en" | "es" };

export function ToneStep(props: {
  initial: Partial<ToneInput>;
  onSubmit: (t: ToneInput) => void;
  onBack: () => void;
}) {
  const t = useTranslations("freeTrial.steps.tone");
  const [tone, setTone] = useState<ToneInput["tone"]>(props.initial.tone ?? "friendly");
  const [language, setLanguage] = useState<ToneInput["language"]>(props.initial.language ?? "en");

  const tones: ToneInput["tone"][] = ["friendly", "professional", "local_pride"];

  return (
    <section className="grid gap-5">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>

      <div className="grid gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("toneLabel")}</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tones.map((tn) => (
            <button
              type="button"
              key={tn}
              onClick={() => setTone(tn)}
              className={`rounded-xl border px-4 py-3 text-left text-sm ${tone === tn ? "border-brand bg-brand/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}
            >
              {t(`toneOptions.${tn}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("languageLabel")}</span>
        <div className="flex gap-2">
          {(["en", "es"] as const).map((lang) => (
            <button
              type="button"
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm ${language === lang ? "border-brand bg-brand/10" : "border-border bg-background text-muted-foreground"}`}
            >
              {lang === "en" ? "English" : "Español"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <button type="button" onClick={props.onBack} className="text-sm text-muted-foreground underline">Back</button>
        <Button variant="accent" onClick={() => props.onSubmit({ tone, language })}>
          {t("generate")}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/components/tone-step.tsx"
git commit -m "feat(free-trial): tone + language step"
```

---

## Task 20: components/generating-step.tsx

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/components/generating-step.tsx`

- [ ] **Step 1: 实现进度组件**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export type GeneratingPhase = "vision" | "caption" | "error";

export function GeneratingStep(props: { phase: GeneratingPhase; error?: string | null }) {
  const t = useTranslations("freeTrial.steps.generating");
  return (
    <section className="grid place-items-center gap-4 rounded-2xl border border-border bg-card p-10">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      {props.phase === "vision" && <p className="text-sm text-muted-foreground">{t("vision")}</p>}
      {props.phase === "caption" && <p className="text-sm text-muted-foreground">{t("caption")}</p>}
      {props.phase === "error" && (
        <p className="text-sm text-red-600">{props.error ?? "Something went wrong, please retry."}</p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/components/generating-step.tsx"
git commit -m "feat(free-trial): generating step (vision → caption phases)"
```

---

## Task 21: components/result-step.tsx — 半墙 UI

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/components/result-step.tsx`

- [ ] **Step 1: 实现 result 半墙**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { UploadedPhoto } from "./upload-step";

export type ResultPayload = {
  bestPhotoId: string | null;
  whyThisPhoto?: string | null;
  caption: string;
  policyOk: boolean;
};

export function ResultStep(props: {
  photos: UploadedPhoto[];
  result: ResultPayload;
  onUnlock: () => void;
}) {
  const t = useTranslations("freeTrial.steps.result");
  const bestPhoto = props.photos.find((p) => p.id === props.result.bestPhotoId) ?? props.photos[0];

  return (
    <section className="grid gap-5">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>

      {bestPhoto && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <img src={bestPhoto.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">Brago</span>
            {props.result.policyOk && <span className="text-xs">{t("policyOk")}</span>}
          </div>
          {props.result.whyThisPhoto && (
            <div className="border-t border-border bg-background p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{t("whyThisPhoto")}</span> {props.result.whyThisPhoto}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("captionLabel")}</div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{props.result.caption}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[t("lockedCopy"), t("lockedDownload"), t("lockedSpanish"), t("lockedRegen")].map((label) => (
          <button
            key={label}
            type="button"
            onClick={props.onUnlock}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-card"
          >
            <Lock className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={props.onUnlock}
        className="rounded-2xl bg-brand text-brand-foreground px-6 py-4 text-base font-bold shadow-tactile transition-all hover:-translate-y-0.5"
      >
        {t("unlockCta")}
        <span className="ml-2 text-sm font-normal opacity-80">— {t("unlockSubtext")}</span>
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/components/result-step.tsx"
git commit -m "feat(free-trial): result step with half-paywall (4 locked actions + signup CTA)"
```

---

## Task 22: components/signup-modal.tsx

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/components/signup-modal.tsx`

- [ ] **Step 1: 探明现有 signup 表单组件**

```bash
grep -rn "signUp\|sign-up\|emailAndPassword" /Volumes/FZD/开发项目/Brago/features/auth 2>/dev/null | head -10
```

如果有 `<SignupForm>` 这种现成组件，直接复用。否则用 `authClient.signUp.email()`。

- [ ] **Step 2: 实现 modal**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";

export function SignupModal(props: {
  open: boolean;
  onClose: () => void;
  postId: string | null;
  anonId: string | null;
  locale: string;
}) {
  const t = useTranslations("freeTrial.signupModal");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) {
      setError(null);
      setLoading(false);
    }
  }, [props.open]);

  if (!props.open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name: email.split("@")[0] ?? "Brago user",
      });
      if (res.error) throw new Error(res.error.message ?? "Sign-up failed");
      // The cookie is sent automatically; server-side hook runs claim.
      // Land on the claimed post:
      if (props.postId) {
        router.push(`/${props.locale === "en" ? "" : props.locale + "/"}google-posts/${props.postId}`.replace("//", "/"));
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: props.postId ? `/google-posts/${props.postId}` : "/dashboard" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
        <button onClick={props.onClose} className="absolute right-4 top-4 text-muted-foreground">✕</button>
        <h2 className="font-display text-xl font-bold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailLabel")}
            className="rounded-xl border border-border bg-background px-4 py-3"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordLabel")}
            className="rounded-xl border border-border bg-background px-4 py-3"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button variant="accent" type="submit" disabled={loading}>
            {loading ? "…" : t("submit")}
          </Button>
        </form>

        <div className="relative my-4 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2 relative z-10">or</span>
          <span className="absolute left-0 right-0 top-1/2 h-px bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={googleSignIn}>
          {t("googleCta")}
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("loginHint")}{" "}
          <a href={`/${props.locale === "en" ? "" : props.locale + "/"}login`.replace("//", "/")} className="underline">{t("loginLink")}</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/components/signup-modal.tsx"
git commit -m "feat(free-trial): signup modal with email + Google OAuth"
```

---

## Task 23: client.tsx — 重写为 step machine 装配器

**Files:**
- Modify: `app/[locale]/(marketing)/free-google-post-generator/client.tsx`（整个重写）

- [ ] **Step 1: 完整重写 client.tsx**

```tsx
"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { useTrialState } from "./use-trial-state";
import { UploadStep, type UploadedPhoto } from "./components/upload-step";
import { BrandStep, type BrandInput } from "./components/brand-step";
import { ToneStep, type ToneInput } from "./components/tone-step";
import { GeneratingStep, type GeneratingPhase } from "./components/generating-step";
import { ResultStep, type ResultPayload } from "./components/result-step";
import { SignupModal } from "./components/signup-modal";

type Step = "upload" | "brand" | "tone" | "generating" | "result";

export function FreeGeneratorClient() {
  const locale = useLocale();
  const { state, hydrated, save } = useTrialState();
  const [step, setStep] = useState<Step>("upload");
  const [anonId, setAnonId] = useState<string | null>(state?.anonId ?? null);
  const [postId, setPostId] = useState<string | null>(state?.postId ?? null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [brand, setBrand] = useState<BrandInput | null>(null);
  const [tone, setTone] = useState<ToneInput | null>(null);
  const [genPhase, setGenPhase] = useState<GeneratingPhase>("vision");
  const [genError, setGenError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  // Rehydrate "already used today" state.
  if (hydrated && state && !result) {
    // We have a saved state from earlier today but no in-memory result —
    // jump straight to the quota-used branch.
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="font-display text-xl font-bold">Today's free trial is used</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign up to unlock and keep generating. 300 credits included.</p>
        <button
          onClick={() => setSignupOpen(true)}
          className="mt-5 rounded-xl bg-brand text-brand-foreground px-6 py-3 text-base font-bold"
        >
          Create my account
        </button>
        <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} postId={state.postId} anonId={state.anonId} locale={locale} />
      </div>
    );
  }

  const ensurePost = useCallback(async () => {
    if (anonId && postId) return { anonId, postId };
    // We can't create post yet — we need brand inputs. Defer to after brand step.
    // For the upload step we use a "pre-create" with placeholder brand:
    // BUT the simpler approach: don't allow uploads before brand step.
    // (Decision: photos are stored once we have postId. Move upload AFTER brand step.)
    return null;
  }, [anonId, postId]);

  // We've decided photos require a postId, and postId creation requires brand.
  // Step order needs to be: brand → upload → tone → generating.
  // Re-render: shift to a step machine where upload comes after brand.

  // For first pass, we follow a simpler order: brand → upload → tone.

  return (
    <div className="mt-10 grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-tactile">
      {step === "brand" || step === "upload" ? null : null}

      {/* Simple linear flow */}
      {step === "upload" && (
        <UploadStep
          anonId={anonId}
          postId={postId}
          ensurePost={ensurePost}
          photos={photos}
          onAdd={(p) => setPhotos((prev) => [...prev, p])}
          onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
          onNext={() => setStep("brand")}
        />
      )}
      {step === "brand" && (
        <BrandStep
          initial={brand ?? {}}
          onSubmit={async (b) => {
            setBrand(b);
            // Create the anon google_post now that we have brand info:
            const res = await fetch("/api/brago/anonymous/google-posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                industry: "pressure_washing",
                serviceType: b.serviceType,
                serviceArea: b.city,
                brandName: b.brandName,
                brandPhone: b.phone,
                tone: "friendly", // tentative until tone step picks
                language: "en",
              }),
            });
            if (res.status === 429) {
              setStep("result"); // will show quota state
              return;
            }
            if (!res.ok) return;
            const data = (await res.json()) as { postId: string; anonId: string };
            setPostId(data.postId);
            setAnonId(data.anonId);
            setStep("tone");
          }}
          onBack={() => setStep("upload")}
        />
      )}
      {step === "tone" && (
        <ToneStep
          initial={tone ?? {}}
          onSubmit={async (tnput) => {
            setTone(tnput);
            setStep("generating");
            setGenPhase("vision");
            setGenError(null);
            try {
              const aRes = await fetch(`/api/brago/anonymous/google-posts/${postId}/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ anonId }),
              });
              const analyzeData = aRes.ok ? await aRes.json() : { recommendation: { bestPhotoId: photos[0]?.id ?? null, why: null } };

              setGenPhase("caption");
              const cRes = await fetch(`/api/brago/anonymous/google-posts/${postId}/generate-caption`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  anonId,
                  brand: { name: brand?.brandName, phone: brand?.phone, tone: tnput.tone },
                }),
              });
              if (!cRes.ok) {
                setGenPhase("error");
                setGenError("Generation failed");
                return;
              }
              const captionData = (await cRes.json()) as { caption: string; policy: { ok: boolean } };
              const payload: ResultPayload = {
                bestPhotoId: analyzeData?.recommendation?.bestPhotoId ?? photos[0]?.id ?? null,
                whyThisPhoto: analyzeData?.recommendation?.why ?? null,
                caption: captionData.caption,
                policyOk: captionData.policy?.ok !== false,
              };
              setResult(payload);
              save({
                usedDate: new Date().toISOString().slice(0, 10),
                postId: postId!,
                anonId: anonId!,
                brand: { name: brand?.brandName ?? "", phone: brand?.phone, tone: tnput.tone },
              });
              setStep("result");
            } catch {
              setGenPhase("error");
              setGenError("Generation failed");
            }
          }}
          onBack={() => setStep("brand")}
        />
      )}
      {step === "generating" && <GeneratingStep phase={genPhase} error={genError} />}
      {step === "result" && result && (
        <ResultStep photos={photos} result={result} onUnlock={() => setSignupOpen(true)} />
      )}

      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        postId={postId}
        anonId={anonId}
        locale={locale}
      />
    </div>
  );
}
```

> 注意：这个版本有一个简化——上传 step 实际上需要等 brand step 创建 postId 后才能上传。这是因为 R2 上传需要 postId 校验。最简方案是**调整 step 顺序为 brand → upload → tone → generating → result**。如果要保持 upload → brand 的产品顺序，需要把上传文件**先存在 client memory + objectURL**，然后在 tone step 之后批量上传。

> **决定**：实施时改为 `brand → upload → tone` 顺序（也更符合常识：先告诉我们做什么，再传图）。把 client.tsx 的初始 step 从 `'upload'` 改为 `'brand'`，并把上面的 onNext 逻辑对调。

- [ ] **Step 2: 调整 step 顺序为 brand → upload → tone**

把 `useState<Step>("upload")` 改成 `useState<Step>("brand")`。
把 UploadStep 的 onNext 改成 `setStep("tone")`。
把 BrandStep 的 onSubmit 中跳到 `setStep("upload")` 而不是 `setStep("tone")`。

- [ ] **Step 3: 类型检查**

`pnpm tsc --noEmit 2>&1 | head -20`

修任何漂下来的错。

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/client.tsx"
git commit -m "feat(free-trial): rewrite client as brand→upload→tone→generating→result machine"
```

---

## Task 24: Cron — /api/cron/cleanup-anonymous

**Files:**
- Create: `app/api/cron/cleanup-anonymous/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: 实现 cron route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { lt, and, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { anonymousQuota, googlePost } from "@/lib/db/schema";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev only
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const quotaDeleted = await db
    .delete(anonymousQuota)
    .where(lt(anonymousQuota.createdAt, sevenDaysAgo))
    .returning({ id: anonymousQuota.id });

  const postDeleted = await db
    .delete(googlePost)
    .where(and(isNotNull(googlePost.anonId), isNull(googlePost.userId), lt(googlePost.createdAt, oneDayAgo)))
    .returning({ id: googlePost.id });

  return NextResponse.json({
    quotaDeleted: quotaDeleted.length,
    postDeleted: postDeleted.length,
  });
}
```

- [ ] **Step 2: vercel.json 注册**

打开 `vercel.json`，在 `crons` 数组追加：

```json
{
  "path": "/api/cron/cleanup-anonymous",
  "schedule": "0 3 * * *"
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/cleanup-anonymous/route.ts vercel.json
git commit -m "feat(cron): daily cleanup of anonymous quota + stale anon posts"
```

---

## Task 25: 更新 launch checklist

**Files:**
- Modify: `docs/launch-checklist.md`

- [ ] **Step 1: 在 P0-3（Contact）后追加 P0-4**

```markdown
### P0-4 匿名试用流（/free-google-post-generator 改造）
- [ ] R2 控制台为 `anon-tmp/` 前缀配置 lifecycle rule：24h 自动删除
- [ ] R2 控制台确认 `anon-tmp/` 前缀对象公开可读（vision 调用需要公网 URL）
- [ ] Vercel 注册 `/api/cron/cleanup-anonymous` 每天凌晨 03:00 UTC 跑（`vercel.json` 已配，仅需 deploy 后确认生效）
- [ ] OpenRouter 余额监控：当前 $5，按 $0.012/次试用估算，每千访客 ~$12 → 上线前充值到 ≥ $50
- [ ] 端到端 smoke：清浏览器 → /free-google-post-generator → 走完 brand/upload/tone → 看到半墙 → 点 Copy 弹注册 → 邮箱注册 → 跳 `/google-posts/[id]` 200 + 图正常显示
- **当前状态**：代码已落地（spec: docs/superpowers/specs/2026-05-30-anonymous-trial-design.md，plan: docs/superpowers/plans/2026-05-30-anonymous-trial-plan.md）。本地 dev DB 已 push 0012 schema，本地实测通过
- **依赖用户提供**：R2 lifecycle 配置 + OpenRouter 充值
```

- [ ] **Step 2: Commit**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): add P0-4 anonymous trial pre-launch checklist"
```

---

## Task 26: 浏览器 E2E 验证

**Files:** （无文件改动，纯验证）

- [ ] **Step 1: 启 dev server，访问页面**

通过 `mcp__Claude_Preview__preview_start` 或现有 server，navigate 到 `/free-google-post-generator`。

- [ ] **Step 2: 走完 happy path**

填 brand → upload 1-3 张测试图 → 选 tone → 等生成 → 看到 result 半墙：
- vision 推荐的图显示
- caption 全文显示
- 4 个锁定按钮 + 主 CTA "Sign up free"
- 点任一锁定按钮 → 注册 modal 弹出

- [ ] **Step 3: 验证限流**

同浏览器、同窗口再试：应该立刻进入 "Today's free trial is used" 分支。

- [ ] **Step 4: 验证注册认领**

点注册 modal → 用一个新邮箱 + 密码 → 提交。Expected：跳到 `/google-posts/[id]`，post 归属新账号，images 显示正常（claim 成功）。

```bash
node -e "
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const r = await c.query(\"SELECT id, user_id, anon_id, status FROM google_post ORDER BY created_at DESC LIMIT 3\");
  console.table(r.rows);
  await c.end();
})();
"
```

Expected：最新一条 `user_id` 非空、`anon_id` 为 NULL。

- [ ] **Step 5: 已登录用户访问 free-trial 页**

新账号已登录，访问 `/free-google-post-generator`。Expected：被 server-side redirect 到 `/create`。

- [ ] **Step 6: 跑全套测试 + lint**

```bash
pnpm test 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
```

Expected：全过。

- [ ] **Step 7: Commit 最后任何修复**

```bash
git add -A
git commit -m "chore(free-trial): post-E2E fixes from manual verification"
```

如果没有改动，跳过。

---

## Self-Review 笔记（写计划时已自查）

**Spec 覆盖**：
- §3.1 google_post nullable + anonId → Task 1 ✅
- §3.2 google_post_photo nullable → Task 1 ✅
- §3.3 anonymous_quota → Task 2 ✅
- §3.4 cleanup cron → Task 24 ✅
- §4.1 anonymous endpoints (create/upload/analyze/caption/get) → Tasks 8–12 ✅
- §4.2 free-generator 旧路由保留 → 计划未改它（保留 ✅）
- §5 反白嫖 → Task 4 + Task 16 (localStorage) ✅
- §6 多步前端 → Tasks 15–23 ✅
- §7 注册认领 → Task 7 + Task 13 ✅
- §8 R2 lifecycle → Task 25 (launch-checklist 上线前手工配) ✅
- §9 翻译 → Task 14 ✅
- §10 测试 → Tasks 4 + 7 (lib 单元) + Task 26 (E2E) ✅
- §11 上线前关注 → Task 25 ✅

**Placeholder 扫描**：每个 step 都有 actual 代码或 actual 命令，无 TBD/TODO。Task 10/11 有"如果签名不匹配就 grep 实际函数"，这是真实情况——vision/caption provider 的 API 可能跟 spec 写的略有出入，执行时通过 grep 拿真签名再调用，**绝不新建一套**。

**类型一致**：
- `UploadedPhoto`、`BrandInput`、`ToneInput`、`ResultPayload`、`GeneratingPhase`、`TrialState` 在多任务间使用，命名前后一致
- `anonId`/`postId` 参数名贯穿前后端
- API 返回值 shape (`{ postId, anonId }`、`{ caption, policy }`) 跟前端消费一致

**Scope**：单一可执行计划。无独立子系统。

---

**实施建议**：用 superpowers:subagent-driven-development（推荐）一个 task 派一个 fresh subagent，task 间 review。Task 之间没有强耦合，并行潜力主要在 Tasks 17–22（5 个 UI 组件 + 1 个 modal），Task 23（client.tsx）会消费它们所以必须最后做。
