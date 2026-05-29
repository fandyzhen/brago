# Brago P0 Phase 2 — 数据模型 + Brand Voice + 骨架页面

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 引入 spec 第 12 章定义的 5 张新表；建立 Brand Voice 设置；为新的 `/create` 和 `/dashboard` 流程铺骨架（API + UI 占位，业务逻辑在 Phase 3-5 落地）。

**Architecture:** Drizzle schema 追加，不动旧表；新建 `lib/brago/` 业务模块；新建 `/api/brago/google-posts/*` 全套路由；新建 `/settings/voice` 页面。

**Tech Stack:** Drizzle ORM、PostgreSQL、Zod、Better Auth session、Next.js App Router。

---

## 文件清单

### 数据模型
- Modify: `lib/db/schema.ts` — 新增 5 表
- Create: `drizzle/0010_brago_google_posts.sql` — Drizzle 生成的 migration

### 业务模块
- Create: `lib/brago/types.ts` — 共享 TS 类型（BrandVoiceProfile、PhotoVisionAnalysis stub 等）
- Create: `lib/brago/google-posts.ts` — google_posts CRUD
- Create: `lib/brago/brand-voice.ts` — brand_voice_profiles CRUD
- Create: `lib/brago/reminder-settings.ts` — reminder_settings CRUD（cron 在 Phase 6）
- Create: `lib/brago/upload-consents.ts` — upload_consents CRUD

### API
- Create: `app/api/brago/google-posts/route.ts` — GET list / POST create
- Create: `app/api/brago/google-posts/[postId]/route.ts` — GET detail
- Create: `app/api/brago/google-posts/[postId]/mark-posted/route.ts` — POST
- Create: `app/api/brago/brand-voice/route.ts` — PUT
- Create: `app/api/brago/reminder-settings/route.ts` — PUT

### UI 骨架
- Modify: `app/[locale]/(protected)/dashboard/page.tsx` — 改为 spec 4.3 描述的 dashboard
- Create: `features/brago/dashboard/google-post-card.tsx`
- Create: `app/[locale]/(protected)/create/page.tsx` — 重写为单页 google flow 骨架（旧版本暂时备份）
- Create: `app/[locale]/(protected)/google-posts/[postId]/page.tsx` — 输出页骨架
- Create: `app/[locale]/(protected)/settings/voice/page.tsx` — Brand Voice 设置
- Modify: `app/[locale]/(protected)/settings/page.tsx` — 增加 voice 链接

### 测试
- Create: `tests/lib/brago-google-posts.test.ts`
- Create: `tests/lib/brago-brand-voice.test.ts`

---

## Task 1: 设计 Drizzle Schema（5 张新表）

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: 在 schema.ts 末尾追加 5 张表**

```ts
// === Brago Google-Ready Posts P0 (2026-05-29) ===

export const googlePost = pgTable(
  "google_post",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    brandProfileId: text("brand_profile_id").references(() => brandProfile.id, { onDelete: "set null" }),
    industry: varchar("industry", { length: 32 }).notNull(),
    serviceType: varchar("service_type", { length: 64 }).notNull(),
    serviceArea: text("service_area"),
    jobLocation: text("job_location"),
    language: varchar("language", { length: 4 }).default("en").notNull(), // 'en' | 'es'
    status: varchar("status", { length: 16 }).default("draft").notNull(), // draft | ready | posted_manually | archived
    bestPhotoId: text("best_photo_id"),
    imageMode: varchar("image_mode", { length: 24 }).default("single_after").notNull(), // single_after | before_after_proof
    beforePhotoId: text("before_photo_id"),
    afterPhotoId: text("after_photo_id"),
    proofRecommendationJson: text("proof_recommendation_json"),
    caption: text("caption"),
    captionPolicyJson: text("caption_policy_json"),
    ctaRecommendation: varchar("cta_recommendation", { length: 32 }).default("call_now_button").notNull(),
    postedAt: timestamp("posted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => ({
    userIdx: index("google_post_user_idx").on(t.userId),
    createdAtIdx: index("google_post_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export const googlePostPhoto = pgTable(
  "google_post_photo",
  {
    id: text("id").primaryKey(),
    googlePostId: text("google_post_id").notNull().references(() => googlePost.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    originalUrl: text("original_url").notNull(),
    processedUrl: text("processed_url"),
    thumbnailUrl: text("thumbnail_url"),
    originalMimeType: varchar("original_mime_type", { length: 32 }),
    detectedRole: varchar("detected_role", { length: 16 }), // before | after | process | detail | team | other
    roleConfidence: integer("role_confidence"), // 0-100
    bestAfterScore: integer("best_after_score"), // 0-100
    cropHintJson: text("crop_hint_json"),
    riskFlagsJson: text("risk_flags_json"),
    whySelected: text("why_selected"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    postIdx: index("google_post_photo_post_idx").on(t.googlePostId),
  }),
);

export const brandVoiceProfile = pgTable(
  "brand_voice_profile",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
    brandProfileId: text("brand_profile_id").references(() => brandProfile.id, { onDelete: "set null" }),
    voiceJson: text("voice_json").notNull(),
    customerLanguage: varchar("customer_language", { length: 8 }).default("en").notNull(), // en | es | mixed
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
);

export const captionHistory = pgTable(
  "caption_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    googlePostId: text("google_post_id").references(() => googlePost.id, { onDelete: "set null" }),
    captionText: text("caption_text").notNull(),
    language: varchar("language", { length: 4 }).default("en").notNull(),
    industry: varchar("industry", { length: 32 }).notNull(),
    serviceType: varchar("service_type", { length: 64 }).notNull(),
    openingPhrase: text("opening_phrase"),
    keyPhrasesJson: text("key_phrases_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userServiceIdx: index("caption_history_user_service_idx").on(t.userId, t.serviceType, t.createdAt),
  }),
);

export const reminderSettings = pgTable(
  "reminder_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
    timezone: text("timezone").default("America/New_York").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    dayOfWeek: integer("day_of_week").default(1).notNull(), // 0=Sun, 1=Mon
    hour: integer("hour").default(9).notNull(),
    lastSentAt: timestamp("last_sent_at"),
    pausedUntil: timestamp("paused_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
);

export const uploadConsent = pgTable(
  "upload_consent",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    googlePostId: text("google_post_id").references(() => googlePost.id, { onDelete: "set null" }),
    hasMarketingPermission: boolean("has_marketing_permission").default(false).notNull(),
    acceptedTermsVersion: varchar("accepted_terms_version", { length: 16 }).default("v1").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("upload_consent_user_idx").on(t.userId),
  }),
);
```

- [ ] **Step 2: 生成 migration**

```bash
pnpm db:generate
```

预期：`drizzle/0010_*.sql` 出现，含 6 张表的 CREATE 语句。

- [ ] **Step 3: 不立即 db:push（先在 commit 再单独跑）**

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(db): add Brago Google posts schema (6 tables)"
```

---

## Task 2: 创建 `lib/brago/types.ts` 共享类型

**Files:**
- Create: `lib/brago/types.ts`

- [ ] **Step 1: 把 spec 5、7、8 章定义的 TS 类型集中写**

```ts
// lib/brago/types.ts

export type Industry = "pressure_washing" | "auto_detailing" | "cleaning";

export type CaptionLanguage = "en" | "es";

export type CustomerLanguage = "en" | "es" | "mixed";

export type Speaker = "local_owner" | "crew" | "premium_service";

export type CtaStyle = "call_now_button" | "soft_contact" | "no_cta";

export type ImageMode = "single_after" | "before_after_proof";

export type GooglePostStatus = "draft" | "ready" | "posted_manually" | "archived";

export type PhotoRole = "before" | "after" | "process" | "detail" | "team" | "other";

export type BrandVoiceProfile = {
  speaker: Speaker;
  tone: string[];
  avoid: string[];
  customerLanguage: CustomerLanguage;
  serviceAreas: string[];
  verifiedClaims: {
    licensed?: boolean;
    insured?: boolean;
    familyOwned?: boolean;
    yearsInBusiness?: number;
    reviewCount?: number;
  };
  ctaStyle: CtaStyle;
};

export type CropHint = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  preferredAspectRatio: "1:1" | "4:3";
};

export type PhotoRiskFlags = {
  visibleFace: boolean;
  visibleLicensePlate: boolean;
  visibleHouseNumber: boolean;
  tooBlurryToUse: boolean;
  tooDarkToUse: boolean;
  likelyCustomerPrivateProperty: boolean;
};

export type ProofRecommendation = {
  mode: ImageMode;
  beforePhotoId?: string;
  afterPhotoId?: string;
  pairConfidence: number;
  transformationScore: number;
  reason: string;
};

export type PhotoVisionAnalysisItem = {
  photoId: string;
  role: PhotoRole;
  roleConfidence: number;
  bestAfterScore: number;
  scores: {
    resultVisibility: number;
    transformationStrength: number;
    subjectCompleteness: number;
    trustSignal: number;
    googleFit: number;
  };
  cropHint: CropHint;
  riskFlags: PhotoRiskFlags;
  why: string;
};

export type PhotoVisionAnalysis = {
  photos: PhotoVisionAnalysisItem[];
  recommendedPhotoId: string | null;
  alternatives: string[];
  proofRecommendation: ProofRecommendation;
};

export type GbpPolicyIssue =
  | "phone_number_detected"
  | "url_detected"
  | "too_long"
  | "too_many_emojis"
  | "shouting_text"
  | "unverified_claim"
  | "ai_cliche"
  | "em_dash_detected";

export type PolicyCheckResult = {
  valid: boolean;
  issues: GbpPolicyIssue[];
};

export type GoogleCaptionTemplate = {
  id: string;
  industry: Industry;
  serviceTypes: string[];
  seasons: Array<"spring" | "summer" | "fall" | "winter" | "any">;
  themes: string[];
  tone: "casual" | "professional" | "neighborly";
  templateText: string;
  avoid: string[];
  example: string;
};

export const DEFAULT_BRAND_VOICE: BrandVoiceProfile = {
  speaker: "local_owner",
  tone: ["friendly", "neighborly"],
  avoid: ["too_salesy", "too_corporate", "fake_guarantees"],
  customerLanguage: "en",
  serviceAreas: [],
  verifiedClaims: {},
  ctaStyle: "call_now_button",
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/brago/types.ts
git commit -m "feat(brago): shared TS types for P0"
```

---

## Task 3: `lib/brago/google-posts.ts` — CRUD

**Files:**
- Create: `lib/brago/google-posts.ts`

- [ ] **Step 1: 写 CRUD**

```ts
import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import type { GooglePostStatus, ImageMode, CaptionLanguage, Industry } from "./types";

export type CreateGooglePostInput = {
  userId: string;
  brandProfileId?: string | null;
  industry: Industry;
  serviceType: string;
  serviceArea?: string | null;
  jobLocation?: string | null;
  language?: CaptionLanguage;
};

export async function createGooglePost(input: CreateGooglePostInput) {
  const id = randomUUID();
  await db.insert(googlePost).values({
    id,
    userId: input.userId,
    brandProfileId: input.brandProfileId ?? null,
    industry: input.industry,
    serviceType: input.serviceType,
    serviceArea: input.serviceArea ?? null,
    jobLocation: input.jobLocation ?? null,
    language: input.language ?? "en",
    status: "draft",
    imageMode: "single_after",
    ctaRecommendation: "call_now_button",
  });
  return id;
}

export async function getGooglePostById(postId: string, userId: string) {
  const rows = await db
    .select()
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listGooglePostsByUser(userId: string, limit = 20) {
  return db
    .select()
    .from(googlePost)
    .where(eq(googlePost.userId, userId))
    .orderBy(desc(googlePost.createdAt))
    .limit(limit);
}

export async function updateGooglePost(
  postId: string,
  userId: string,
  patch: Partial<{
    status: GooglePostStatus;
    bestPhotoId: string | null;
    imageMode: ImageMode;
    beforePhotoId: string | null;
    afterPhotoId: string | null;
    proofRecommendationJson: string | null;
    caption: string | null;
    captionPolicyJson: string | null;
    language: CaptionLanguage;
    postedAt: Date | null;
  }>,
) {
  const result = await db
    .update(googlePost)
    .set(patch)
    .where(and(eq(googlePost.id, postId), eq(googlePost.userId, userId)))
    .returning({ id: googlePost.id });
  return result[0]?.id ?? null;
}

export async function markGooglePostPosted(postId: string, userId: string) {
  return updateGooglePost(postId, userId, {
    status: "posted_manually",
    postedAt: new Date(),
  });
}

export async function countPostsThisWeek(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(googlePost)
    .where(and(eq(googlePost.userId, userId), gte(googlePost.createdAt, sevenDaysAgo)));
  return rows[0]?.count ?? 0;
}

export async function getGooglePostPhotos(postId: string) {
  return db
    .select()
    .from(googlePostPhoto)
    .where(eq(googlePostPhoto.googlePostId, postId));
}
```

- [ ] **Step 2: 写测试**

`tests/lib/brago-google-posts.test.ts`：用 mock `db` 验证 create/getById/list/update 三个核心场景（mock 见 `tests/__mocks__/`）。如果 mock 复杂可只写一两个；以 type 正确为主。

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

import { createGooglePost } from "@/lib/brago/google-posts";

describe("createGooglePost", () => {
  it("generates id and forwards values", async () => {
    const id = await createGooglePost({
      userId: "user_1",
      industry: "pressure_washing",
      serviceType: "driveway",
    });
    expect(id).toMatch(/[0-9a-f-]{36}/);
  });
});
```

- [ ] **Step 3: pnpm test**

预期：pass。

- [ ] **Step 4: Commit**

```bash
git add lib/brago/google-posts.ts tests/lib/brago-google-posts.test.ts
git commit -m "feat(brago): google-posts CRUD"
```

---

## Task 4: `lib/brago/brand-voice.ts`

**Files:**
- Create: `lib/brago/brand-voice.ts`

- [ ] **Step 1: 写 CRUD**

```ts
import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brandVoiceProfile } from "@/lib/db/schema";
import {
  type BrandVoiceProfile,
  type CustomerLanguage,
  DEFAULT_BRAND_VOICE,
} from "./types";

export async function getBrandVoice(userId: string): Promise<BrandVoiceProfile> {
  const rows = await db
    .select()
    .from(brandVoiceProfile)
    .where(eq(brandVoiceProfile.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return DEFAULT_BRAND_VOICE;
  try {
    return JSON.parse(row.voiceJson) as BrandVoiceProfile;
  } catch {
    return DEFAULT_BRAND_VOICE;
  }
}

export async function getCustomerLanguage(userId: string): Promise<CustomerLanguage> {
  const rows = await db
    .select({ lang: brandVoiceProfile.customerLanguage })
    .from(brandVoiceProfile)
    .where(eq(brandVoiceProfile.userId, userId))
    .limit(1);
  return (rows[0]?.lang as CustomerLanguage) ?? "en";
}

export async function saveBrandVoice(
  userId: string,
  voice: BrandVoiceProfile,
  brandProfileId?: string | null,
) {
  const existing = await db
    .select({ id: brandVoiceProfile.id })
    .from(brandVoiceProfile)
    .where(eq(brandVoiceProfile.userId, userId))
    .limit(1);

  const payload = {
    voiceJson: JSON.stringify(voice),
    customerLanguage: voice.customerLanguage,
    brandProfileId: brandProfileId ?? null,
  };

  if (existing[0]) {
    await db
      .update(brandVoiceProfile)
      .set(payload)
      .where(eq(brandVoiceProfile.id, existing[0].id));
    return existing[0].id;
  }

  const id = randomUUID();
  await db.insert(brandVoiceProfile).values({ id, userId, ...payload });
  return id;
}
```

- [ ] **Step 2: 测试（最小）**

`tests/lib/brago-brand-voice.test.ts`：mock db，验证 `getBrandVoice` 在空记录时返回 DEFAULT_BRAND_VOICE。

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    update: vi.fn(),
  },
}));

import { getBrandVoice } from "@/lib/brago/brand-voice";
import { DEFAULT_BRAND_VOICE } from "@/lib/brago/types";

describe("getBrandVoice", () => {
  it("returns default when no row", async () => {
    const voice = await getBrandVoice("user_1");
    expect(voice).toEqual(DEFAULT_BRAND_VOICE);
  });
});
```

- [ ] **Step 3: pnpm test**

- [ ] **Step 4: Commit**

```bash
git add lib/brago/brand-voice.ts tests/lib/brago-brand-voice.test.ts
git commit -m "feat(brago): brand-voice CRUD"
```

---

## Task 5: `lib/brago/reminder-settings.ts` + `upload-consents.ts`

**Files:**
- Create: `lib/brago/reminder-settings.ts`
- Create: `lib/brago/upload-consents.ts`

- [ ] **Step 1: reminder-settings**

```ts
import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminderSettings } from "@/lib/db/schema";

export type ReminderSettings = typeof reminderSettings.$inferSelect;

export async function getReminderSettings(userId: string): Promise<ReminderSettings | null> {
  const rows = await db
    .select()
    .from(reminderSettings)
    .where(eq(reminderSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertReminderSettings(
  userId: string,
  patch: Partial<{
    timezone: string;
    enabled: boolean;
    dayOfWeek: number;
    hour: number;
    pausedUntil: Date | null;
    lastSentAt: Date | null;
  }>,
) {
  const existing = await getReminderSettings(userId);
  if (existing) {
    await db
      .update(reminderSettings)
      .set(patch)
      .where(eq(reminderSettings.id, existing.id));
    return existing.id;
  }
  const id = randomUUID();
  await db.insert(reminderSettings).values({
    id,
    userId,
    timezone: patch.timezone ?? "America/New_York",
    enabled: patch.enabled ?? true,
    dayOfWeek: patch.dayOfWeek ?? 1,
    hour: patch.hour ?? 9,
    pausedUntil: patch.pausedUntil ?? null,
    lastSentAt: patch.lastSentAt ?? null,
  });
  return id;
}
```

- [ ] **Step 2: upload-consents**

```ts
import "server-only";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { uploadConsent } from "@/lib/db/schema";

export async function recordConsent(input: {
  userId: string;
  googlePostId?: string | null;
  hasMarketingPermission: boolean;
  acceptedTermsVersion?: string;
}) {
  const id = randomUUID();
  await db.insert(uploadConsent).values({
    id,
    userId: input.userId,
    googlePostId: input.googlePostId ?? null,
    hasMarketingPermission: input.hasMarketingPermission,
    acceptedTermsVersion: input.acceptedTermsVersion ?? "v1",
  });
  return id;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/brago/reminder-settings.ts lib/brago/upload-consents.ts
git commit -m "feat(brago): reminder-settings + upload-consents helpers"
```

---

## Task 6: `/api/brago/google-posts` GET list + POST create

**Files:**
- Create: `app/api/brago/google-posts/route.ts`

- [ ] **Step 1: 写 route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/session";
import { createGooglePost, listGooglePostsByUser } from "@/lib/brago/google-posts";
import { recordConsent } from "@/lib/brago/upload-consents";

const createSchema = z.object({
  industry: z.enum(["pressure_washing", "auto_detailing", "cleaning"]),
  serviceType: z.string().min(1).max(64),
  serviceArea: z.string().max(120).optional(),
  jobLocation: z.string().max(200).optional(),
  language: z.enum(["en", "es"]).optional(),
  brandProfileId: z.string().optional(),
  hasMarketingPermission: z.boolean(),
});

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const limit = Math.min(50, Number(new URL(req.url).searchParams.get("limit") ?? 20));
  const rows = await listGooglePostsByUser(access.user.id, limit);
  return NextResponse.json({ posts: rows });
}

export async function POST(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const data = parsed.data;
  if (!data.hasMarketingPermission) {
    return NextResponse.json(
      { error: "You must confirm you have permission to use these photos for marketing." },
      { status: 400 },
    );
  }

  const postId = await createGooglePost({
    userId: access.user.id,
    industry: data.industry,
    serviceType: data.serviceType,
    serviceArea: data.serviceArea,
    jobLocation: data.jobLocation,
    language: data.language,
    brandProfileId: data.brandProfileId,
  });

  await recordConsent({
    userId: access.user.id,
    googlePostId: postId,
    hasMarketingPermission: true,
  });

  return NextResponse.json({ postId });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/brago/google-posts/route.ts
git commit -m "feat(api): /api/brago/google-posts list + create"
```

---

## Task 7: `/api/brago/google-posts/[postId]` GET detail

**Files:**
- Create: `app/api/brago/google-posts/[postId]/route.ts`

- [ ] **Step 1: 写 route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getGooglePostById, getGooglePostPhotos } from "@/lib/brago/google-posts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;
  const post = await getGooglePostById(postId, access.user.id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const photos = await getGooglePostPhotos(postId);
  return NextResponse.json({ post, photos });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/route.ts"
git commit -m "feat(api): google-posts detail GET"
```

---

## Task 8: `/api/brago/google-posts/[postId]/mark-posted`

**Files:**
- Create: `app/api/brago/google-posts/[postId]/mark-posted/route.ts`

- [ ] **Step 1:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth/session";
import { markGooglePostPosted } from "@/lib/brago/google-posts";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;
  const id = await markGooglePostPosted(postId, access.user.id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/mark-posted/route.ts"
git commit -m "feat(api): google-posts mark-posted"
```

---

## Task 9: `/api/brago/brand-voice` PUT + GET

**Files:**
- Create: `app/api/brago/brand-voice/route.ts`

- [ ] **Step 1: 写 route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getBrandVoice, saveBrandVoice } from "@/lib/brago/brand-voice";
import { DEFAULT_BRAND_VOICE } from "@/lib/brago/types";

const voiceSchema = z.object({
  speaker: z.enum(["local_owner", "crew", "premium_service"]),
  tone: z.array(z.string()).max(8),
  avoid: z.array(z.string()).max(8),
  customerLanguage: z.enum(["en", "es", "mixed"]),
  serviceAreas: z.array(z.string()).max(20),
  verifiedClaims: z.object({
    licensed: z.boolean().optional(),
    insured: z.boolean().optional(),
    familyOwned: z.boolean().optional(),
    yearsInBusiness: z.number().int().min(0).max(120).optional(),
    reviewCount: z.number().int().min(0).max(99999).optional(),
  }).default({}),
  ctaStyle: z.enum(["call_now_button", "soft_contact", "no_cta"]),
  brandProfileId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const voice = await getBrandVoice(access.user.id);
  return NextResponse.json({ voice });
}

export async function PUT(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = voiceSchema.safeParse({ ...(typeof body === "object" && body ? body : {}), ...DEFAULT_BRAND_VOICE });
  // 解析顺序：用户传值覆盖默认
  const parsedReal = voiceSchema.safeParse(body);
  if (!parsedReal.success) {
    return NextResponse.json({ error: parsedReal.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const { brandProfileId, ...voice } = parsedReal.data;
  const id = await saveBrandVoice(access.user.id, voice, brandProfileId);
  return NextResponse.json({ id });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/brago/brand-voice/route.ts
git commit -m "feat(api): /api/brago/brand-voice GET + PUT"
```

---

## Task 10: `/api/brago/reminder-settings` PUT + GET

**Files:**
- Create: `app/api/brago/reminder-settings/route.ts`

- [ ] **Step 1:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getReminderSettings, upsertReminderSettings } from "@/lib/brago/reminder-settings";

const updateSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  enabled: z.boolean().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  hour: z.number().int().min(0).max(23).optional(),
  pausedUntilIsoDate: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const row = await getReminderSettings(access.user.id);
  return NextResponse.json({ settings: row });
}

export async function PUT(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const id = await upsertReminderSettings(access.user.id, {
    timezone: parsed.data.timezone,
    enabled: parsed.data.enabled,
    dayOfWeek: parsed.data.dayOfWeek,
    hour: parsed.data.hour,
    pausedUntil: parsed.data.pausedUntilIsoDate ? new Date(parsed.data.pausedUntilIsoDate) : null,
  });
  return NextResponse.json({ id });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/brago/reminder-settings/route.ts
git commit -m "feat(api): /api/brago/reminder-settings GET + PUT"
```

---

## Task 11: Dashboard 重写为 Google-ready 视图

**Files:**
- Modify: `app/[locale]/(protected)/dashboard/page.tsx`
- Create: `features/brago/dashboard/recent-google-posts.tsx`

- [ ] **Step 1: dashboard 改 hero copy**

把现有 dashboard hero 文案替换为 `Ready to post today's job?` 主 CTA 改为 `Upload job photos` → `/create`；保留次按钮 `Use last job style` →（先 disable，Phase 2 之后注入 last brand_voice）。

- [ ] **Step 2: 新建 RecentGooglePosts 组件**

```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type PostRow = {
  id: string;
  industry: string;
  serviceType: string;
  serviceArea: string | null;
  status: "draft" | "ready" | "posted_manually" | "archived";
  language: "en" | "es";
  createdAt: string;
};

export function RecentGooglePosts() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brago/google-posts?limit=10")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No Google posts yet — upload today&apos;s job to get started.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <li key={p.id} className="rounded-xl border p-4">
          <Link href={`/google-posts/${p.id}`} className="block">
            <div className="text-sm font-medium">{p.serviceType}</div>
            <div className="text-xs text-muted-foreground">
              {p.serviceArea ?? "—"} · {p.status} · {p.language.toUpperCase()}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: 在 dashboard 渲染**

dashboard page.tsx 增加 "Recent Google posts" section，渲染 `<RecentGooglePosts />`。Activity streak 块先用占位文案 `Google profile freshness coming soon.`

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(protected)/dashboard/page.tsx" features/brago/dashboard/
git commit -m "feat(dashboard): recent Google posts + freshness placeholder"
```

---

## Task 12: 重写 `/create` 为单页 Google flow 骨架

**Files:**
- Modify: `app/[locale]/(protected)/create/page.tsx`
- Create: `app/[locale]/(protected)/create/_legacy-multi-area.tsx`（把现有 page.tsx 内容备份过来，注释为 legacy）

- [ ] **Step 1: 备份**

把现有 `app/[locale]/(protected)/create/page.tsx` 内容整段复制到 `_legacy-multi-area.tsx`，文件顶部加：

```tsx
// LEGACY: 旧 multi-area Brago 创建流。新流见 page.tsx。
// 保留用于参考，未挂载到路由。
```

- [ ] **Step 2: 重写 page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/container";

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
  const [photos, setPhotos] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError("Please confirm photo permission."); return; }
    if (photos.length === 0) { setError("Add at least one photo."); return; }
    setSubmitting(true);
    setError(null);
    try {
      // Phase 2: 仅创建 google_post 记录，photos 走 Phase 3 实现的 upload 流
      const res = await fetch("/api/brago/google-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry, serviceType, serviceArea,
          hasMarketingPermission: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      router.push(`/google-posts/${data.postId}`);
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
          Service area or neighborhood
          <input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. South Austin" className="rounded-md border px-3 py-2" />
        </label>

        <label className="grid gap-1 text-sm">
          Job photos (1–10)
          <input type="file" multiple accept="image/*,.heic,.heif" onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 10))} />
          {photos.length > 0 && <span className="text-xs text-muted-foreground">{photos.length} selected</span>}
        </label>

        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I have permission to use these photos for marketing.
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50">
          {submitting ? "Creating…" : "Create Google post"}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        Photo upload and AI selection wire up in next phase.
      </p>
    </Container>
  );
}
```

注：此版本只创建 post 记录、不上传 photo。Phase 3 接 photo 上传。

- [ ] **Step 3: 验证**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(protected)/create/page.tsx" "app/[locale]/(protected)/create/_legacy-multi-area.tsx"
git commit -m "feat(create): single-page Google flow skeleton"
```

---

## Task 13: 输出页 `/google-posts/[postId]` 骨架

**Files:**
- Create: `app/[locale]/(protected)/google-posts/[postId]/page.tsx`

- [ ] **Step 1: 写骨架**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Container } from "@/components/container";

type Post = {
  id: string;
  industry: string;
  serviceType: string;
  serviceArea: string | null;
  status: string;
  language: string;
  imageMode: string;
  caption: string | null;
};

export default function GooglePostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!postId) return;
    fetch(`/api/brago/google-posts/${postId}`)
      .then((r) => r.json())
      .then((d) => setPost(d.post))
      .finally(() => setLoading(false));
  }, [postId]);

  const onMarkPosted = async () => {
    setMarking(true);
    try {
      await fetch(`/api/brago/google-posts/${postId}/mark-posted`, { method: "POST" });
      setPost((p) => p ? { ...p, status: "posted_manually" } : p);
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <Container className="py-10"><p>Loading…</p></Container>;
  if (!post) return <Container className="py-10"><p>Post not found.</p></Container>;

  return (
    <Container className="py-10 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Google post for {post.serviceType}</h1>
      <p className="text-xs text-muted-foreground mb-6">Status: {post.status}</p>

      <div className="rounded-xl border p-6 mb-6 bg-foreground/5">
        <p className="text-sm text-muted-foreground">Photo & caption generation lands in Phase 3-5.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onMarkPosted}
          disabled={marking || post.status === "posted_manually"}
          className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          {post.status === "posted_manually" ? "Marked as posted" : "Mark as posted"}
        </button>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[locale]/(protected)/google-posts/"
git commit -m "feat(output): Google post output page skeleton"
```

---

## Task 14: `/settings/voice` Brand Voice 设置页

**Files:**
- Create: `app/[locale]/(protected)/settings/voice/page.tsx`
- Modify: `app/[locale]/(protected)/settings/page.tsx` 增加 link

- [ ] **Step 1: 写 voice page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/container";
import type { BrandVoiceProfile } from "@/lib/brago/types";
import { DEFAULT_BRAND_VOICE } from "@/lib/brago/types";

const TONE_OPTIONS = ["friendly", "neighborly", "professional", "casual", "premium"];
const AVOID_OPTIONS = ["too_salesy", "too_corporate", "too_funny", "too_many_emojis", "fake_guarantees"];

export default function VoiceSettingsPage() {
  const [voice, setVoice] = useState<BrandVoiceProfile>(DEFAULT_BRAND_VOICE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/brago/brand-voice").then(r => r.json()).then((d) => {
      if (d.voice) setVoice(d.voice);
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/brago/brand-voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voice),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Container className="py-10"><p>Loading…</p></Container>;

  return (
    <Container className="py-10 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Your posting style</h1>
      <p className="text-sm text-muted-foreground mb-6">Brago uses these preferences when writing your Google captions.</p>

      <div className="grid gap-6">
        <section>
          <h2 className="text-sm font-medium mb-2">Speaker</h2>
          <div className="flex flex-wrap gap-2">
            {(["local_owner", "crew", "premium_service"] as const).map(s => (
              <button key={s} onClick={() => setVoice(v => ({ ...v, speaker: s }))} className={`rounded-full border px-3 py-1 text-xs ${voice.speaker === s ? "bg-foreground text-background" : ""}`}>
                {s === "local_owner" ? "Friendly local owner" : s === "crew" ? "Skilled blue-collar crew" : "Premium professional service"}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">Tone</h2>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map(t => (
              <button key={t} onClick={() => setVoice(v => ({ ...v, tone: toggle(v.tone, t) }))} className={`rounded-full border px-3 py-1 text-xs ${voice.tone.includes(t) ? "bg-foreground text-background" : ""}`}>{t}</button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">Avoid</h2>
          <div className="flex flex-wrap gap-2">
            {AVOID_OPTIONS.map(t => (
              <button key={t} onClick={() => setVoice(v => ({ ...v, avoid: toggle(v.avoid, t) }))} className={`rounded-full border px-3 py-1 text-xs ${voice.avoid.includes(t) ? "bg-foreground text-background" : ""}`}>{t.replace(/_/g, " ")}</button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">Main customer language</h2>
          <select value={voice.customerLanguage} onChange={(e) => setVoice(v => ({ ...v, customerLanguage: e.target.value as BrandVoiceProfile["customerLanguage"] }))} className="rounded-md border px-3 py-2 text-sm">
            <option value="en">English-speaking customers</option>
            <option value="es">Spanish-speaking customers</option>
            <option value="mixed">Mixed neighborhood</option>
          </select>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">CTA style</h2>
          <select value={voice.ctaStyle} onChange={(e) => setVoice(v => ({ ...v, ctaStyle: e.target.value as BrandVoiceProfile["ctaStyle"] }))} className="rounded-md border px-3 py-2 text-sm">
            <option value="call_now_button">Direct people to the Call button on Google</option>
            <option value="soft_contact">Soft contact mention</option>
            <option value="no_cta">No CTA</option>
          </select>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-2">Verified claims</h2>
          <div className="grid gap-2">
            <label className="flex gap-2 text-xs"><input type="checkbox" checked={!!voice.verifiedClaims.licensed} onChange={(e) => setVoice(v => ({ ...v, verifiedClaims: { ...v.verifiedClaims, licensed: e.target.checked } }))} /> Licensed</label>
            <label className="flex gap-2 text-xs"><input type="checkbox" checked={!!voice.verifiedClaims.insured} onChange={(e) => setVoice(v => ({ ...v, verifiedClaims: { ...v.verifiedClaims, insured: e.target.checked } }))} /> Insured</label>
            <label className="flex gap-2 text-xs"><input type="checkbox" checked={!!voice.verifiedClaims.familyOwned} onChange={(e) => setVoice(v => ({ ...v, verifiedClaims: { ...v.verifiedClaims, familyOwned: e.target.checked } }))} /> Family owned</label>
          </div>
        </section>

        <button onClick={save} disabled={saving} className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Save posting style"}
        </button>
        {saved && <p className="text-xs text-green-600">Saved.</p>}
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: 在 settings/page.tsx 加链接**

在 settings 主页菜单加：
```tsx
<Link href="/settings/voice" className="...">Your posting style</Link>
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(protected)/settings/"
git commit -m "feat(settings): brand voice settings page"
```

---

## Task 15: Phase 2 收尾

- [ ] **Step 1: 完整跑通**

```bash
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 2: 数据库迁移**

```bash
pnpm db:push
```

（仅本地；生产由用户后续执行）

- [ ] **Step 3: Commit launch-checklist**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): mark Phase 2 (data model + skeleton) complete" --allow-empty
```

## Definition of Done

- 6 张新表 schema 已加，migration 已生成。
- `/api/brago/google-posts` (GET/POST/[id]/mark-posted) 可用。
- `/api/brago/brand-voice` / `/api/brago/reminder-settings` 可用。
- `/dashboard` 显示 recent Google posts。
- `/create` 单页可创建 google_post 记录（无 photo 上传，下一 Phase 接）。
- `/google-posts/[postId]` 输出页骨架可显示并 mark-posted。
- `/settings/voice` 可保存 brand voice。
- `pnpm lint && pnpm test && pnpm build` 全绿。
