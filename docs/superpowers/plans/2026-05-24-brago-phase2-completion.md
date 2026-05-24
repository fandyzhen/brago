# Brago Phase 2 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Brago 项目从阶段 1.5 推进到 SPEC v5 的阶段 2 完成标准并具备上线条件。

**Architecture:** 在不破坏已上线 pressure_washing 8 个模板的前提下：(1) 复用现有 8 套布局结构镜像出 auto_detailing 8 个模板（accent 色改 #FFD63A、术语和示例文案行业化）；(2) 新增 2 个 multi-area 模板（pressure_washing 和 auto_detailing 各一个）支持 1-4 pairs；(3) 写脚本调用 satori + sharp 渲染函数批量生成 18 张 webp 预览图；(4) 扩展 `RenderInput` 为兼容的 union 类型；(5) 新增 `posts` 和 `post_image_pairs` 表，render API 同步写入；(6) create 页扩展到 Area 1-4；(7) 清理旧 demo 路由。

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM + PostgreSQL, satori + sharp 服务端 PNG/WEBP 渲染, Tailwind, Better Auth, R2 存储。

---

## File Structure

**新增：**
- `lib/server/poster-templates/auto-detailing/interior-detail-proof.tsx` — Google trust 模板
- `lib/server/poster-templates/auto-detailing/review-badge-detail.tsx` — Google review 模板
- `lib/server/poster-templates/auto-detailing/mobile-detail-local-share.tsx` — Facebook/Nextdoor 分享
- `lib/server/poster-templates/auto-detailing/pet-hair-gone-quote.tsx` — Facebook/Nextdoor 询价
- `lib/server/poster-templates/auto-detailing/driveway-detail-proof.tsx` — Facebook/Nextdoor proof
- `lib/server/poster-templates/auto-detailing/portfolio-shine-split.tsx` — Instagram portfolio
- `lib/server/poster-templates/auto-detailing/project-no-detail.tsx` — Instagram series
- `lib/server/poster-templates/auto-detailing/full-detail-multi-area-proof.tsx` — Facebook 多区域（multi-area）
- `lib/server/poster-templates/pressure-washing/exterior-multi-area-proof.tsx` — Facebook 多区域（multi-area）
- `lib/server/poster-templates/shared/multi-area-types.ts` — multi-area 输入类型
- `scripts/generate-template-previews.ts` — 批量预览图生成脚本
- `public/template-previews/` — 18 张 webp 预览图（运行脚本生成）
- `app/api/brand-profile/route.ts` — 已存在则跳过；缺则补
- `drizzle/0014_brago_posts.sql` — 新表迁移（编号取决于当前迁移数）

**修改：**
- `lib/server/poster-templates/shared/types.ts` — 扩展 `RenderInput` 支持 multi-area，添加 `industryAccent` 字段
- `lib/server/poster-templates/registry.ts` — 注册 10 个新模板
- `lib/poster-templates/public-metadata.ts` — 增加 10 条 metadata
- `lib/db/schema.ts` — 新增 `post` 和 `postImagePair` 表
- `app/api/posters/render/route.ts` — 同步写入 posts/post_image_pairs；支持 photoPairs 数组上传
- `app/[locale]/(protected)/create/page.tsx` — Area 1-4 上传 UI
- `app/[locale]/demo/layout.tsx` — 添加 notFound() 隐藏 demo（或删除整个目录）

---

## Task 1: 准备 multi-area 输入类型

**Files:**
- Create: `lib/server/poster-templates/shared/multi-area-types.ts`
- Modify: `lib/server/poster-templates/shared/types.ts`

- [ ] **Step 1: 创建 multi-area 类型**

`lib/server/poster-templates/shared/multi-area-types.ts`:

```typescript
export type PhotoPair = {
  beforeImageDataUrl: string;
  afterImageDataUrl: string;
  areaLabel?: string;
};
```

- [ ] **Step 2: 扩展 RenderInput**

修改 `lib/server/poster-templates/shared/types.ts` 添加 `photoPairs` 字段（可选，向后兼容）：

```typescript
import type React from "react";
import type { PhotoPair } from "./multi-area-types";

export type RenderInput = {
  beforeImageDataUrl: string;
  afterImageDataUrl: string;
  templateId: string;
  headline: string;
  businessName?: string;
  phone?: string;
  serviceArea?: string;
  isLicensed?: boolean;
  isInsured?: boolean;
  googleReviewCount?: number;
  projectNumber?: number;
  // Multi-area templates use this instead of before/after fields
  photoPairs?: PhotoPair[];
};

export type RenderFn = (input: RenderInput) => React.ReactElement;

export type BragoTemplateMeta = {
  id: string;
  name: string;
  industry: "pressure_washing" | "auto_detailing";
  channel: "google_business_profile" | "facebook_nextdoor" | "instagram";
  layoutFamily: "split" | "hero_photo" | "stacked" | "collage" | "diagonal" | "card_pair";
  photoPairCount: 1 | 2 | 3 | 4;
  intent: "trust" | "quote" | "portfolio" | "recent_job";
  phoneDefault: "hidden" | "subtle" | "visible";
  previewImage: string;
};
```

- [ ] **Step 3: 验证类型不破坏现有模板**

Run: `pnpm tsc --noEmit`
Expected: PASS（现有 8 个 pressure_washing 模板未使用 photoPairs，仍可正常构建）

- [ ] **Step 4: Commit**

```bash
git add lib/server/poster-templates/shared/types.ts lib/server/poster-templates/shared/multi-area-types.ts
git commit -m "feat: extend RenderInput with optional photoPairs for multi-area templates"
```

---

## Task 2: Auto detailing 模板 1 — Interior Detail Proof (Google)

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/interior-detail-proof.tsx`

布局参考: 复用 pressure-washing 的 `driveway-hero-split.tsx`（hero_photo 全 bleed after + bottom-left before 缩略图 + dark info bar），accent 色改 `#FFD63A`（auto detailing 行业黄色）。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function GoldStars() {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" style={{ display: "flex" }}>
          <path d={STAR_PATH} fill="#FFD63A" />
        </svg>
      ))}
    </span>
  );
}

function buildTrustText(input: RenderInput): string {
  const parts: string[] = [];
  if (input.serviceArea) parts.push(input.serviceArea);
  if (input.isLicensed && input.isInsured) parts.push("Licensed · Insured");
  else if (input.isLicensed) parts.push("Licensed");
  else if (input.isInsured) parts.push("Insured");
  return parts.join(" · ");
}

export const interiorDetailProof: RenderFn = (input: RenderInput) => {
  const trustText = buildTrustText(input);
  const hasReviews = !!input.googleReviewCount;
  const hasTrust = trustText.length > 0 || hasReviews;

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
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
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
            border: "3px solid #FFD63A",
          }}
        >
          <div style={{ flex: 1, display: "flex", position: "relative" }}>
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

      <div
        style={{
          background: "#111111",
          color: "#ffffff",
          padding: "28px 36px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
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

        {hasTrust && (
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.55)",
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {trustText.length > 0 && <span style={{ display: "flex" }}>{trustText}</span>}
            {trustText.length > 0 && hasReviews && <span style={{ display: "flex" }}>·</span>}
            {hasReviews && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <GoldStars />
                <span style={{ display: "flex" }}>{input.googleReviewCount} Google reviews</span>
              </span>
            )}
          </div>
        )}

        {input.phone && (
          <div
            style={{
              fontSize: 20,
              color: "#FFD63A",
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

- [ ] **Step 2: 验证编译**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/server/poster-templates/auto-detailing/interior-detail-proof.tsx
git commit -m "feat: add Auto Detailing Interior Detail Proof template (Google)"
```

---

## Task 3: Auto detailing 模板 2 — Review Badge Detail (Google)

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/review-badge-detail.tsx`

布局参考: 复用 pressure-washing 的 `driveway-review-trust.tsx`（split + review badge 强调）。我们没有直接看过它，所以这里给一个完整的独立实现，结构是：左右各 50% before/after split + 顶部 review badge + 底部商家信息。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function GoldStars({ size = 24 }: { size?: number }) {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ display: "flex" }}>
          <path d={STAR_PATH} fill="#FFD63A" />
        </svg>
      ))}
    </span>
  );
}

function PillLabel({ text, top, left }: { text: string; top: number; left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        background: "rgba(0,0,0,0.78)",
        color: "#ffffff",
        padding: "5px 14px",
        borderRadius: 24,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 14,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const reviewBadgeDetail: RenderFn = (input: RenderInput) => {
  const trustText: string[] = [];
  if (input.isLicensed && input.isInsured) trustText.push("Licensed · Insured");
  else if (input.isLicensed) trustText.push("Licensed");
  else if (input.isInsured) trustText.push("Insured");
  if (input.serviceArea) trustText.push(input.serviceArea);
  const hasReviews = !!input.googleReviewCount;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#F7F4EE",
      }}
    >
      {/* Top review badge bar */}
      {hasReviews && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 0",
            background: "#FFD63A",
            gap: 12,
          }}
        >
          <GoldStars size={26} />
          <span
            style={{
              fontFamily: "Inter",
              fontSize: 22,
              fontWeight: 700,
              color: "#111111",
              display: "flex",
            }}
          >
            {input.googleReviewCount} Google reviews
          </span>
        </div>
      )}

      {/* Split photos */}
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <PillLabel text="BEFORE" top={24} left={24} />
        </div>
        <div style={{ width: 4, background: "#F7F4EE", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <PillLabel text="AFTER" top={24} left={24} />
        </div>
      </div>

      {/* Bottom info */}
      <div
        style={{
          padding: "26px 36px 30px",
          display: "flex",
          flexDirection: "column",
          background: "#F7F4EE",
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#111111",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        {trustText.length > 0 && (
          <div
            style={{
              fontSize: 19,
              color: "#6B6862",
              marginTop: 8,
              display: "flex",
            }}
          >
            {trustText.join(" · ")}
          </div>
        )}

        {input.phone && (
          <div
            style={{
              fontSize: 19,
              color: "#111111",
              marginTop: 4,
              display: "flex",
              fontWeight: 600,
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

- [ ] **Step 2: 验证 + 提交**

Run: `pnpm tsc --noEmit`
Expected: PASS

```bash
git add lib/server/poster-templates/auto-detailing/review-badge-detail.tsx
git commit -m "feat: add Auto Detailing Review Badge template (Google)"
```

---

## Task 4: Auto detailing 模板 3 — Mobile Detail Local Share (Facebook/Nextdoor)

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/mobile-detail-local-share.tsx`

布局: 左右 split + 顶部 BEFORE/AFTER + 底部社区分享语气信息（小弱化电话）。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

function PillLabel({ text, top, left }: { text: string; top: number; left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        background: "rgba(0,0,0,0.7)",
        color: "#ffffff",
        padding: "5px 13px",
        borderRadius: 22,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const mobileDetailLocalShare: RenderFn = (input: RenderInput) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#FFFFFF",
      }}
    >
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="BEFORE" top={24} left={24} />
        </div>
        <div style={{ width: 8, background: "#FFFFFF", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="AFTER" top={24} left={24} />
        </div>
      </div>

      <div
        style={{
          padding: "30px 40px 36px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Small accent dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: "#FFD63A", display: "flex" }} />
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6B6862",
              display: "flex",
            }}
          >
            Recent detail
            {input.serviceArea ? ` · ${input.serviceArea}` : ""}
          </span>
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#171717",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        {input.phone && (
          <div
            style={{
              fontSize: 18,
              color: "#6B6862",
              marginTop: 10,
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

- [ ] **Step 2: 验证 + 提交**

Run: `pnpm tsc --noEmit`

```bash
git add lib/server/poster-templates/auto-detailing/mobile-detail-local-share.tsx
git commit -m "feat: add Auto Detailing Mobile Detail Local Share template"
```

---

## Task 5: Auto detailing 模板 4 — Pet Hair Gone Quote (Facebook/Nextdoor)

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/pet-hair-gone-quote.tsx`

布局: 上下 stacked，下方明确的 CTA 卡片询价。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

function PillLabel({ text, top, left }: { text: string; top: number; left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        background: "rgba(0,0,0,0.72)",
        color: "#ffffff",
        padding: "4px 12px",
        borderRadius: 20,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const petHairGoneQuote: RenderFn = (input: RenderInput) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#171717",
      }}
    >
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="BEFORE" top={22} left={22} />
        </div>
        <div style={{ width: 6, background: "#171717", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="AFTER" top={22} left={22} />
        </div>
      </div>

      {/* CTA card */}
      <div
        style={{
          background: "#171717",
          padding: "28px 40px 36px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#FFFFFF",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#FFD63A",
              color: "#171717",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "Inter",
            }}
          >
            Message for a quote
          </div>
          {input.phone && (
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", display: "flex" }}>
              {input.phone}
            </span>
          )}
        </div>

        {input.serviceArea && (
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.45)",
              marginTop: 12,
              display: "flex",
            }}
          >
            {input.serviceArea}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/auto-detailing/pet-hair-gone-quote.tsx
git commit -m "feat: add Auto Detailing Pet Hair Gone Quote template"
```

---

## Task 6: Auto detailing 模板 5 — Driveway Detail Proof (Facebook/Nextdoor)

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/driveway-detail-proof.tsx`

布局: 大上图（after exterior） + 下小双图（before/after detail closeup）。这个对应外观成果展示。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

function PillLabel({
  text,
  top,
  left,
  size = "md",
}: {
  text: string;
  top: number;
  left: number;
  size?: "sm" | "md";
}) {
  const fs = size === "sm" ? 11 : 14;
  const pad = size === "sm" ? "3px 9px" : "5px 13px";
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        background: "rgba(0,0,0,0.72)",
        color: "#ffffff",
        padding: pad,
        borderRadius: 22,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: fs,
          letterSpacing: 2,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const drivewayDetailProof: RenderFn = (input: RenderInput) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#FFFFFF",
      }}
    >
      {/* Large after photo on top */}
      <div style={{ height: 620, display: "flex", position: "relative" }}>
        <img
          src={input.afterImageDataUrl}
          alt="after"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <PillLabel text="AFTER" top={28} left={28} size="md" />
      </div>

      {/* Before strip */}
      <div style={{ height: 260, display: "flex", position: "relative", borderTop: "4px solid #FFD63A" }}>
        <img
          src={input.beforeImageDataUrl}
          alt="before"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <PillLabel text="BEFORE" top={20} left={28} size="sm" />
      </div>

      {/* Info bar */}
      <div
        style={{
          flex: 1,
          padding: "24px 36px",
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#171717",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 17,
            color: "#6B6862",
            display: "flex",
            gap: 8,
          }}
        >
          {input.serviceArea && <span style={{ display: "flex" }}>{input.serviceArea}</span>}
          {input.serviceArea && input.phone && <span style={{ display: "flex" }}>·</span>}
          {input.phone && <span style={{ display: "flex" }}>{input.phone}</span>}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/auto-detailing/driveway-detail-proof.tsx
git commit -m "feat: add Auto Detailing Driveway Detail Proof template"
```

---

## Task 7: Auto detailing 模板 6 — Portfolio Shine Split (Instagram)

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/portfolio-shine-split.tsx`

布局: 干净的 portfolio split（无电话，无 review，作品集感）。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

export const portfolioShineSplit: RenderFn = (input: RenderInput) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#FFFFFF",
        padding: 40,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", borderRadius: 12 }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              display: "flex",
              background: "rgba(0,0,0,0.78)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 18,
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
        <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", borderRadius: 12 }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              display: "flex",
              background: "rgba(0,0,0,0.78)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 18,
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
              AFTER
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#171717",
            textAlign: "center",
            display: "flex",
          }}
        >
          {input.headline}
        </div>
        {input.businessName && (
          <div
            style={{
              marginTop: 10,
              fontFamily: "JetBrains Mono",
              fontSize: 14,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6B6862",
              display: "flex",
            }}
          >
            {input.businessName}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/auto-detailing/portfolio-shine-split.tsx
git commit -m "feat: add Auto Detailing Portfolio Shine Split template"
```

---

## Task 8: Auto detailing 模板 7 — Project No. Detail (Instagram)

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/project-no-detail.tsx`

布局: stacked + 大号 project number。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

export const projectNoDetail: RenderFn = (input: RenderInput) => {
  const projectStr =
    typeof input.projectNumber === "number"
      ? String(input.projectNumber).padStart(3, "0")
      : "001";

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
      {/* Header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 36px",
          background: "#111111",
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#FFD63A",
            display: "flex",
          }}
        >
          Project No.
        </span>
        <span
          style={{
            fontFamily: "Inter",
            fontSize: 30,
            fontWeight: 700,
            color: "#FFFFFF",
            display: "flex",
          }}
        >
          {projectStr}
        </span>
      </div>

      {/* Stacked photos */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 18,
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
        <div style={{ height: 4, background: "#FFD63A", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 18,
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
              AFTER
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "20px 36px 28px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#FFFFFF",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/auto-detailing/project-no-detail.tsx
git commit -m "feat: add Auto Detailing Project No. Detail template"
```

---

## Task 9: 注册前 7 个 auto detailing 模板到 registry 和 metadata

**Files:**
- Modify: `lib/server/poster-templates/registry.ts`
- Modify: `lib/poster-templates/public-metadata.ts`

- [ ] **Step 1: 修改 registry.ts**

替换为：

```typescript
import type { RenderFn } from "./shared/types";
import { driveWayHeroSplit } from "./pressure-washing/driveway-hero-split";
import { drivewayBoldStacked } from "./pressure-washing/driveway-bold-stacked";
import { drivewayLocalShare } from "./pressure-washing/driveway-local-share";
import { drivewayReviewTrust } from "./pressure-washing/driveway-review-trust";
import { drivewaySoftQuote } from "./pressure-washing/driveway-soft-quote";
import { drivewayNeighborhood } from "./pressure-washing/driveway-neighborhood";
import { drivewayProjectNo } from "./pressure-washing/driveway-project-no";
import { drivewayPortfolioSplit } from "./pressure-washing/driveway-portfolio-split";
import { interiorDetailProof } from "./auto-detailing/interior-detail-proof";
import { reviewBadgeDetail } from "./auto-detailing/review-badge-detail";
import { mobileDetailLocalShare } from "./auto-detailing/mobile-detail-local-share";
import { petHairGoneQuote } from "./auto-detailing/pet-hair-gone-quote";
import { drivewayDetailProof } from "./auto-detailing/driveway-detail-proof";
import { portfolioShineSplit } from "./auto-detailing/portfolio-shine-split";
import { projectNoDetail } from "./auto-detailing/project-no-detail";

const REGISTRY: Record<string, RenderFn> = {
  pressure_driveway_hero_split: driveWayHeroSplit,
  pressure_driveway_stacked: drivewayBoldStacked,
  pressure_driveway_local_share: drivewayLocalShare,
  pressure_driveway_review_trust: drivewayReviewTrust,
  pressure_driveway_soft_quote: drivewaySoftQuote,
  pressure_driveway_neighborhood: drivewayNeighborhood,
  pressure_driveway_project_no: drivewayProjectNo,
  pressure_driveway_portfolio_split: drivewayPortfolioSplit,
  detail_interior_proof: interiorDetailProof,
  detail_review_badge: reviewBadgeDetail,
  detail_mobile_local_share: mobileDetailLocalShare,
  detail_pet_hair_quote: petHairGoneQuote,
  detail_driveway_proof: drivewayDetailProof,
  detail_portfolio_shine_split: portfolioShineSplit,
  detail_project_no: projectNoDetail,
};

export function getRenderer(templateId: string): RenderFn | null {
  return REGISTRY[templateId] ?? null;
}

export function getRegisteredTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}
```

- [ ] **Step 2: 追加到 public-metadata.ts**

在 `POSTER_TEMPLATES` 数组末尾、`getTemplateById` 之前追加：

```typescript
  {
    id: "detail_interior_proof",
    name: "Interior Detail Proof",
    industry: "auto_detailing",
    channel: "google_business_profile",
    layoutFamily: "hero_photo",
    photoPairCount: 1,
    intent: "trust",
    phoneDefault: "visible",
    previewImage: "/template-previews/detail_interior_proof.webp",
  },
  {
    id: "detail_review_badge",
    name: "Review Badge Detail",
    industry: "auto_detailing",
    channel: "google_business_profile",
    layoutFamily: "split",
    photoPairCount: 1,
    intent: "trust",
    phoneDefault: "subtle",
    previewImage: "/template-previews/detail_review_badge.webp",
  },
  {
    id: "detail_mobile_local_share",
    name: "Mobile Detail Local Share",
    industry: "auto_detailing",
    channel: "facebook_nextdoor",
    layoutFamily: "split",
    photoPairCount: 1,
    intent: "recent_job",
    phoneDefault: "subtle",
    previewImage: "/template-previews/detail_mobile_local_share.webp",
  },
  {
    id: "detail_pet_hair_quote",
    name: "Pet Hair Gone Quote",
    industry: "auto_detailing",
    channel: "facebook_nextdoor",
    layoutFamily: "stacked",
    photoPairCount: 1,
    intent: "quote",
    phoneDefault: "subtle",
    previewImage: "/template-previews/detail_pet_hair_quote.webp",
  },
  {
    id: "detail_driveway_proof",
    name: "Driveway Detail Proof",
    industry: "auto_detailing",
    channel: "facebook_nextdoor",
    layoutFamily: "stacked",
    photoPairCount: 1,
    intent: "recent_job",
    phoneDefault: "subtle",
    previewImage: "/template-previews/detail_driveway_proof.webp",
  },
  {
    id: "detail_portfolio_shine_split",
    name: "Portfolio Shine Split",
    industry: "auto_detailing",
    channel: "instagram",
    layoutFamily: "split",
    photoPairCount: 1,
    intent: "portfolio",
    phoneDefault: "hidden",
    previewImage: "/template-previews/detail_portfolio_shine_split.webp",
  },
  {
    id: "detail_project_no",
    name: "Project No. Detail",
    industry: "auto_detailing",
    channel: "instagram",
    layoutFamily: "stacked",
    photoPairCount: 1,
    intent: "portfolio",
    phoneDefault: "hidden",
    previewImage: "/template-previews/detail_project_no.webp",
  },
```

- [ ] **Step 3: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/registry.ts lib/poster-templates/public-metadata.ts
git commit -m "feat: register 7 Auto Detailing templates (single-pair)"
```

---

## Task 10: Pressure washing multi-area 模板 — Exterior Multi-area Proof

**Files:**
- Create: `lib/server/poster-templates/pressure-washing/exterior-multi-area-proof.tsx`

布局: 2x2 collage（最多 4 组 pair），每组小一对 before/after。photoPairCount 可变 1-4。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";
import type { PhotoPair } from "../shared/multi-area-types";

function PairCell({ pair, areaLabel }: { pair: PhotoPair; areaLabel?: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        overflow: "hidden",
        borderRadius: 6,
      }}
    >
      {areaLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "6px 0",
            background: "#111111",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#FFFFFF",
              display: "flex",
            }}
          >
            {areaLabel}
          </span>
        </div>
      )}
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={pair.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "2px 7px",
              borderRadius: 14,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              BEFORE
            </span>
          </div>
        </div>
        <div style={{ width: 2, background: "#FFFFFF", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={pair.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "2px 7px",
              borderRadius: 14,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              AFTER
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const exteriorMultiAreaProof: RenderFn = (input: RenderInput) => {
  const pairs: PhotoPair[] =
    input.photoPairs && input.photoPairs.length > 0
      ? input.photoPairs.slice(0, 4)
      : [
          {
            beforeImageDataUrl: input.beforeImageDataUrl,
            afterImageDataUrl: input.afterImageDataUrl,
            areaLabel: "Main Area",
          },
        ];

  // Pad to 2x2 grid layout (2 rows, 2 cols) when pairs >= 2
  const useGrid = pairs.length >= 2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#F7F4EE",
        padding: 28,
        gap: 14,
      }}
    >
      {/* Top headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: "#1E5EFF", display: "flex" }} />
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6B6862",
              display: "flex",
            }}
          >
            Multi-area job{input.serviceArea ? ` · ${input.serviceArea}` : ""}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#171717",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>
      </div>

      {/* Pairs grid */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: useGrid ? "column" : "row",
          gap: 12,
        }}
      >
        {useGrid ? (
          <>
            <div style={{ flex: 1, display: "flex", gap: 12 }}>
              <PairCell pair={pairs[0]} areaLabel={pairs[0].areaLabel ?? "AREA 1"} />
              {pairs[1] && <PairCell pair={pairs[1]} areaLabel={pairs[1].areaLabel ?? "AREA 2"} />}
            </div>
            {pairs[2] && (
              <div style={{ flex: 1, display: "flex", gap: 12 }}>
                <PairCell pair={pairs[2]} areaLabel={pairs[2].areaLabel ?? "AREA 3"} />
                {pairs[3] && <PairCell pair={pairs[3]} areaLabel={pairs[3].areaLabel ?? "AREA 4"} />}
              </div>
            )}
          </>
        ) : (
          <PairCell pair={pairs[0]} areaLabel={pairs[0].areaLabel} />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 6,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6B6862",
            display: "flex",
          }}
        >
          {input.businessName ?? "Recent project"}
        </span>
        {input.phone && (
          <span style={{ fontSize: 16, color: "#171717", display: "flex" }}>{input.phone}</span>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/pressure-washing/exterior-multi-area-proof.tsx
git commit -m "feat: add Pressure Washing Exterior Multi-area Proof template (1-4 pairs)"
```

---

## Task 11: Auto detailing multi-area 模板 — Full Detail Multi-area Proof

**Files:**
- Create: `lib/server/poster-templates/auto-detailing/full-detail-multi-area-proof.tsx`

复用 Task 10 的结构，仅换 accent 色 `#FFD63A` 和 areaLabel 默认词。

- [ ] **Step 1: 写文件**

```typescript
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";
import type { PhotoPair } from "../shared/multi-area-types";

function PairCell({ pair, areaLabel }: { pair: PhotoPair; areaLabel?: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        overflow: "hidden",
        borderRadius: 6,
      }}
    >
      {areaLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "6px 0",
            background: "#111111",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#FFD63A",
              display: "flex",
            }}
          >
            {areaLabel}
          </span>
        </div>
      )}
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={pair.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "2px 7px",
              borderRadius: 14,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              BEFORE
            </span>
          </div>
        </div>
        <div style={{ width: 2, background: "#FFFFFF", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={pair.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "2px 7px",
              borderRadius: 14,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              AFTER
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_AREAS = ["INTERIOR", "EXTERIOR", "WHEELS", "DETAIL"];

export const fullDetailMultiAreaProof: RenderFn = (input: RenderInput) => {
  const pairs: PhotoPair[] =
    input.photoPairs && input.photoPairs.length > 0
      ? input.photoPairs.slice(0, 4)
      : [
          {
            beforeImageDataUrl: input.beforeImageDataUrl,
            afterImageDataUrl: input.afterImageDataUrl,
            areaLabel: "FULL DETAIL",
          },
        ];

  const useGrid = pairs.length >= 2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#111111",
        padding: 28,
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: "#FFD63A", display: "flex" }} />
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#FFD63A",
              display: "flex",
            }}
          >
            Full detail{input.serviceArea ? ` · ${input.serviceArea}` : ""}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#FFFFFF",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: useGrid ? "column" : "row",
          gap: 12,
        }}
      >
        {useGrid ? (
          <>
            <div style={{ flex: 1, display: "flex", gap: 12 }}>
              <PairCell pair={pairs[0]} areaLabel={pairs[0].areaLabel ?? DEFAULT_AREAS[0]} />
              {pairs[1] && <PairCell pair={pairs[1]} areaLabel={pairs[1].areaLabel ?? DEFAULT_AREAS[1]} />}
            </div>
            {pairs[2] && (
              <div style={{ flex: 1, display: "flex", gap: 12 }}>
                <PairCell pair={pairs[2]} areaLabel={pairs[2].areaLabel ?? DEFAULT_AREAS[2]} />
                {pairs[3] && <PairCell pair={pairs[3]} areaLabel={pairs[3].areaLabel ?? DEFAULT_AREAS[3]} />}
              </div>
            )}
          </>
        ) : (
          <PairCell pair={pairs[0]} areaLabel={pairs[0].areaLabel} />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 6,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
            display: "flex",
          }}
        >
          {input.businessName ?? "Recent detail"}
        </span>
        {input.phone && (
          <span style={{ fontSize: 16, color: "#FFFFFF", display: "flex" }}>{input.phone}</span>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/auto-detailing/full-detail-multi-area-proof.tsx
git commit -m "feat: add Auto Detailing Full Detail Multi-area Proof template (1-4 pairs)"
```

---

## Task 12: 注册 2 个 multi-area 模板

**Files:**
- Modify: `lib/server/poster-templates/registry.ts`
- Modify: `lib/poster-templates/public-metadata.ts`

- [ ] **Step 1: 在 registry.ts 顶部 import 新模板，REGISTRY 中追加**

import 区追加：

```typescript
import { exteriorMultiAreaProof } from "./pressure-washing/exterior-multi-area-proof";
import { fullDetailMultiAreaProof } from "./auto-detailing/full-detail-multi-area-proof";
```

REGISTRY 对象末尾追加（注意 detail_project_no 后面加逗号）：

```typescript
  pressure_exterior_multi_area_proof: exteriorMultiAreaProof,
  detail_full_multi_area_proof: fullDetailMultiAreaProof,
```

- [ ] **Step 2: 在 public-metadata.ts POSTER_TEMPLATES 数组末尾追加**

```typescript
  {
    id: "pressure_exterior_multi_area_proof",
    name: "Exterior Multi-area Proof",
    industry: "pressure_washing",
    channel: "facebook_nextdoor",
    layoutFamily: "collage",
    photoPairCount: 4,
    intent: "recent_job",
    phoneDefault: "subtle",
    previewImage: "/template-previews/pressure_exterior_multi_area_proof.webp",
  },
  {
    id: "detail_full_multi_area_proof",
    name: "Full Detail Multi-area Proof",
    industry: "auto_detailing",
    channel: "facebook_nextdoor",
    layoutFamily: "collage",
    photoPairCount: 4,
    intent: "recent_job",
    phoneDefault: "subtle",
    previewImage: "/template-previews/detail_full_multi_area_proof.webp",
  },
```

- [ ] **Step 3: 验证 + 提交**

```bash
pnpm tsc --noEmit
git add lib/server/poster-templates/registry.ts lib/poster-templates/public-metadata.ts
git commit -m "feat: register multi-area collage templates for both industries"
```

---

## Task 13: 准备模板预览图占位素材

**Files:**
- Create: `scripts/preview-assets/pressure-before.jpg`
- Create: `scripts/preview-assets/pressure-after.jpg`
- Create: `scripts/preview-assets/detail-before.jpg`
- Create: `scripts/preview-assets/detail-after.jpg`

- [ ] **Step 1: 创建目录并放入示例图片**

```bash
mkdir -p scripts/preview-assets
```

如果项目里 `public/` 已有现成的 before/after 示例图片，直接复制使用。否则从 unsplash 等下载 4 张行业示例图（pressure washing driveway × 2、auto detailing interior × 2），放入 `scripts/preview-assets/`，命名为：

- `pressure-before.jpg` — 脏驾道
- `pressure-after.jpg` — 干净驾道
- `detail-before.jpg` — 脏车内
- `detail-after.jpg` — 干净车内

每张 ≥ 800×800 像素，jpg 格式即可。

- [ ] **Step 2: 检查文件存在**

Run: `ls -la scripts/preview-assets/`
Expected: 4 个 jpg 文件，每个 > 50KB

- [ ] **Step 3: Commit**

```bash
git add scripts/preview-assets/
git commit -m "chore: add preview generation sample assets"
```

---

## Task 14: 写预览图批量生成脚本

**Files:**
- Create: `scripts/generate-template-previews.ts`

- [ ] **Step 1: 写脚本**

```typescript
/**
 * Render all registered poster templates to webp previews.
 *
 * Run with: pnpm tsx scripts/generate-template-previews.ts
 *
 * Outputs to: public/template-previews/<templateId>.webp
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "../lib/server/poster-templates/registry";
import { POSTER_TEMPLATES } from "../lib/poster-templates/public-metadata";
import type { RenderInput } from "../lib/server/poster-templates/shared/types";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "template-previews");

function fileToDataUrl(filePath: string): string {
  const buf = readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

const fonts = [
  {
    name: "Inter",
    data: readFileSync(path.join(ROOT, "public/fonts/inter-regular.woff")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: readFileSync(path.join(ROOT, "public/fonts/jetbrains-mono-regular.woff")),
    weight: 400 as const,
    style: "normal" as const,
  },
];

const pressureBefore = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/pressure-before.jpg"));
const pressureAfter = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/pressure-after.jpg"));
const detailBefore = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/detail-before.jpg"));
const detailAfter = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/detail-after.jpg"));

function sampleInput(meta: (typeof POSTER_TEMPLATES)[number]): RenderInput {
  const isPressure = meta.industry === "pressure_washing";
  const before = isPressure ? pressureBefore : detailBefore;
  const after = isPressure ? pressureAfter : detailAfter;

  const headline = isPressure ? "Concrete restored, not replaced." : "Pet hair, gone.";

  const base: RenderInput = {
    beforeImageDataUrl: before,
    afterImageDataUrl: after,
    templateId: meta.id,
    headline,
    businessName: isPressure ? "Bright Wash Co" : "Mirror Mobile Detailing",
    phone: "(512) 555-0184",
    serviceArea: isPressure ? "Serving Austin, TX" : "Austin mobile detailing",
    isLicensed: true,
    isInsured: true,
    googleReviewCount: 247,
    projectNumber: 18,
  };

  if (meta.layoutFamily === "collage") {
    base.photoPairs = [
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "DRIVEWAY" : "INTERIOR" },
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "PATIO" : "EXTERIOR" },
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "SIDING" : "WHEELS" },
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "DECK" : "DETAIL" },
    ];
  }

  return base;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;

  for (const meta of POSTER_TEMPLATES) {
    const renderer = getRenderer(meta.id);
    if (!renderer) {
      console.error(`✗ no renderer for ${meta.id}`);
      fail += 1;
      continue;
    }

    try {
      const element = renderer(sampleInput(meta));
      const svg = await satori(element, { width: 1080, height: 1080, fonts });
      const webp = await sharp(Buffer.from(svg))
        .resize(720, 720)
        .webp({ quality: 82 })
        .toBuffer();
      const outPath = path.join(OUT_DIR, `${meta.id}.webp`);
      writeFileSync(outPath, webp);
      console.log(`✓ ${meta.id}`);
      ok += 1;
    } catch (err) {
      console.error(`✗ ${meta.id}: ${(err as Error).message}`);
      fail += 1;
    }
  }

  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: 添加 npm script**

修改 `package.json`，在 `scripts` 中追加：

```json
"generate:previews": "tsx scripts/generate-template-previews.ts"
```

- [ ] **Step 3: 提交**

```bash
git add scripts/generate-template-previews.ts package.json
git commit -m "feat: add script to batch-render template previews to webp"
```

---

## Task 15: 运行脚本生成 18 张预览图

**Files:**
- Generate: `public/template-previews/*.webp` (18 files)

- [ ] **Step 1: 运行脚本**

Run: `pnpm generate:previews`
Expected: 输出 18 个 ✓，最后 "Done. 18 ok, 0 failed."

如果有失败，根据报错修复对应模板的 satori 兼容性问题（最常见：缺 `display: "flex"`、img 没有显式 width/height、负 margin）。

- [ ] **Step 2: 验证文件**

Run: `ls public/template-previews/ | wc -l`
Expected: 18

- [ ] **Step 3: 提交**

```bash
git add public/template-previews/
git commit -m "feat: generate 18 template preview images (webp)"
```

---

## Task 16: 修改 TemplateCard 显示预览图

**Files:**
- Modify: `app/[locale]/(protected)/create/page.tsx` 146-149 行

- [ ] **Step 1: 替换 TemplateCard 内的预览占位为真实预览图**

原 146-149 行：

```tsx
      <div className="w-full bg-neutral-200 dark:bg-neutral-800 aspect-square flex items-center justify-center">
        <span className="text-xs text-neutral-400">1080 × 1080</span>
      </div>
```

替换为：

```tsx
      <div className="w-full bg-neutral-200 dark:bg-neutral-800 aspect-square flex items-center justify-center overflow-hidden">
        <img
          src={template.previewImage}
          alt={template.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
```

- [ ] **Step 2: 验证可视化**

启动 dev server：`pnpm dev`
打开 `http://localhost:3000/create`，确认每个模板卡片显示预览图，不再显示 "1080 × 1080" 占位。

- [ ] **Step 3: 提交**

```bash
git add app/[locale]/(protected)/create/page.tsx
git commit -m "feat: show real template previews in TemplateCard"
```

---

## Task 17: 数据库 schema 新增 posts 和 post_image_pairs 表

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: 在 brandProfile 表后追加 post 和 postImagePair 表**

在 `lib/db/schema.ts` 末尾追加（注意保持现有 import 不变）：

```typescript
// Brago posts — finished poster records (per generation)
export const post = pgTable("post", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  industry: varchar("industry", { length: 32 }).notNull(), // 'pressure_washing' | 'auto_detailing'
  channel: varchar("channel", { length: 32 }).notNull(),   // 'google_business_profile' | 'facebook_nextdoor' | 'instagram'
  layoutMode: varchar("layout_mode", { length: 16 }).notNull(), // 'single_pair' | 'multi_area'
  templateId: text("template_id").notNull(),
  headline: text("headline").notNull(),
  caption: text("caption"),
  phoneDisplay: varchar("phone_display", { length: 12 }), // 'hidden' | 'subtle' | 'visible'
  status: varchar("status", { length: 16 }).notNull().default("completed"),
  outputUrl: text("output_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Brago post image pairs — 1-4 before/after pairs per post
export const postImagePair = pgTable(
  "post_image_pair",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    areaIndex: integer("area_index").notNull(),
    areaLabel: text("area_label"),
    beforeImageUrl: text("before_image_url"),
    afterImageUrl: text("after_image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    postIdx: index("post_image_pair_post_idx").on(t.postId),
  })
);
```

- [ ] **Step 2: 生成迁移**

Run: `pnpm db:generate`
Expected: 在 `drizzle/` 下生成新迁移文件，包含 CREATE TABLE post、CREATE TABLE post_image_pair、CREATE INDEX。

- [ ] **Step 3: 应用迁移到 dev 数据库**

Run: `pnpm db:push`
Expected: PROMPT 选 "create" / 直接应用；最终输出 "Changes applied".

- [ ] **Step 4: 验证 schema**

Run: `pnpm db:studio &` 然后打开 Studio，确认 `post` 和 `post_image_pair` 表存在。
也可命令行：

```bash
psql "$DATABASE_URL" -c "\dt" | grep -E "post(_image_pair)?"
```

Expected: 两表存在。

- [ ] **Step 5: 提交**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add post and post_image_pair tables for Brago posts persistence"
```

---

## Task 18: render API 同步写入 posts/post_image_pairs，支持 multi-area FormData

**Files:**
- Modify: `app/api/posters/render/route.ts`

- [ ] **Step 1: 在 import 区追加新表和 metadata helper**

`app/api/posters/render/route.ts` 顶部 import 区追加：

```typescript
import { generationHistory, post, postImagePair } from "@/lib/db/schema";
import { getTemplateById } from "@/lib/poster-templates/public-metadata";
import type { PhotoPair } from "@/lib/server/poster-templates/shared/multi-area-types";
```

并把原来的 `import { generationHistory } from "@/lib/db/schema";` 删除（避免重复）。

- [ ] **Step 2: 重构 FormData 解析支持 multi-area**

替换从 "// ── 2. Parse form data ──" 到 "renderer not found" 之间（约 47-92 行）的逻辑为：

```typescript
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const templateId = formData.get("templateId") as string | null;
  const headline = formData.get("headline") as string | null;

  if (!templateId || !headline || typeof templateId !== "string" || typeof headline !== "string") {
    return Response.json(
      { error: "Missing required fields: templateId, headline" },
      { status: 400 }
    );
  }

  const renderer = getRenderer(templateId);
  if (!renderer) {
    return Response.json({ error: `Unknown templateId: ${templateId}` }, { status: 400 });
  }

  const meta = getTemplateById(templateId);
  const isMultiArea = meta?.layoutFamily === "collage";

  // Collect before/after pairs — either single (legacy) or multi-area (areaN_before/after)
  type RawPair = { before: File; after: File; areaLabel?: string };
  const rawPairs: RawPair[] = [];

  if (isMultiArea) {
    for (let i = 1; i <= 4; i += 1) {
      const b = formData.get(`area${i}_before`);
      const a = formData.get(`area${i}_after`);
      if (b instanceof File && a instanceof File) {
        const label = formData.get(`area${i}_label`);
        rawPairs.push({
          before: b,
          after: a,
          areaLabel: typeof label === "string" && label.trim() ? label.trim() : undefined,
        });
      }
    }
    if (rawPairs.length === 0) {
      // Fall back to legacy single-pair fields
      const b = formData.get("beforeImage");
      const a = formData.get("afterImage");
      if (b instanceof File && a instanceof File) rawPairs.push({ before: b, after: a });
    }
  } else {
    const b = formData.get("beforeImage");
    const a = formData.get("afterImage");
    if (b instanceof File && a instanceof File) rawPairs.push({ before: b, after: a });
  }

  if (rawPairs.length === 0) {
    return Response.json(
      { error: "Missing required image fields (beforeImage/afterImage or areaN_before/areaN_after)" },
      { status: 400 }
    );
  }

  for (const p of rawPairs) {
    if (p.before.size > MAX_FILE_SIZE || p.after.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Image files must be under 10MB each" }, { status: 400 });
    }
  }
```

- [ ] **Step 3: 改 render 主体使用 pairs[0] 兼容单组 + photoPairs 数组传 multi-area**

替换从 "// ── 4. Render PNG ──" 块中 `[beforeImageDataUrl, afterImageDataUrl] = await Promise.all(...)` 到 `const element = renderer(renderInput);` 之间的代码为：

```typescript
    const dataUrls = await Promise.all(
      rawPairs.flatMap((p) => [fileToDataUrl(p.before), fileToDataUrl(p.after)])
    );
    const pairs: PhotoPair[] = rawPairs.map((p, i) => ({
      beforeImageDataUrl: dataUrls[i * 2],
      afterImageDataUrl: dataUrls[i * 2 + 1],
      areaLabel: p.areaLabel,
    }));

    function getTextField(name: string): string | undefined {
      const raw = formData.get(name);
      if (typeof raw !== "string") return undefined;
      const clean = raw.split("\n")[0].trim();
      if (clean.startsWith("--")) return undefined;
      return clean || undefined;
    }

    const cleanedHeadline = (getTextField("headline") ?? headline).slice(0, 36);

    const renderInput: RenderInput = {
      beforeImageDataUrl: pairs[0].beforeImageDataUrl,
      afterImageDataUrl: pairs[0].afterImageDataUrl,
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
      photoPairs: isMultiArea ? pairs : undefined,
    };

    const element = renderer(renderInput);
```

- [ ] **Step 4: 在写 history 区追加 posts/post_image_pairs 写入**

替换原来 "// ── 7. Write history ─" 块（约 163-179 行）为：

```typescript
    // ── 7. Write Brago post + image pairs + legacy history ─────────
    try {
      const postId = randomUUID();
      await db.insert(post).values({
        id: postId,
        userId,
        industry: meta?.industry ?? "pressure_washing",
        channel: meta?.channel ?? "google_business_profile",
        layoutMode: isMultiArea ? "multi_area" : "single_pair",
        templateId,
        headline: cleanedHeadline,
        caption: getTextField("caption") ?? null,
        phoneDisplay: meta?.phoneDefault ?? null,
        status: "completed",
        outputUrl: resultUrl,
      });
      await db.insert(postImagePair).values(
        pairs.map((_, i) => ({
          id: randomUUID(),
          postId,
          areaIndex: i,
          areaLabel: pairs[i].areaLabel ?? null,
          // The original uploaded files aren't stored individually (only the rendered poster is uploaded).
          // Future improvement: upload originals to R2 and persist their URLs here.
          beforeImageUrl: null,
          afterImageUrl: null,
        }))
      );

      await db.insert(generationHistory).values({
        id: randomUUID(),
        userId,
        type: "poster",
        prompt: cleanedHeadline,
        resultUrl,
        status: "completed",
        creditsUsed: POSTER_CREDIT_COST,
        metadata: JSON.stringify({ templateId, headline: cleanedHeadline, postId }),
      });
    } catch (histErr) {
      console.error("[posters/render] Failed to write post history:", histErr);
    }
```

- [ ] **Step 5: 验证类型**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add app/api/posters/render/route.ts
git commit -m "feat: render API supports multi-area pairs and writes to post/post_image_pair tables"
```

---

## Task 19: Create 页扩展 Area 1-4 上传 UI

**Files:**
- Modify: `app/[locale]/(protected)/create/page.tsx`

- [ ] **Step 1: 在 `CreatePage` 顶部添加 multi-area state 和 helpers**

替换原 `useState<File | null>` 两行（约 168-169 行）为：

```typescript
  type PairFile = { before: File | null; after: File | null; label?: string };
  const [pairs, setPairs] = useState<PairFile[]>([{ before: null, after: null }]);
```

并删除原来的 `beforeFile` / `afterFile` 单文件 state，相关 `setBeforeFile` / `setAfterFile` 后续会被替换。

- [ ] **Step 2: 根据选中模板的 photoPairCount 决定是否启用 multi-area**

紧跟 `selectedTemplate` state 之后增加：

```typescript
  const selectedMeta = POSTER_TEMPLATES.find((t) => t.id === selectedTemplate);
  const isMultiArea = (selectedMeta?.layoutFamily ?? "split") === "collage";
  const maxPairs = isMultiArea ? 4 : 1;

  // Trim pairs to maxPairs when switching templates
  useEffect(() => {
    setPairs((prev) => {
      if (prev.length > maxPairs) return prev.slice(0, maxPairs);
      return prev;
    });
  }, [maxPairs]);
```

- [ ] **Step 3: 替换 Photos section 渲染**

原 photos `<section>` (约 305-322 行) 替换为：

```tsx
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Photos
                </h2>

                <div className="space-y-4">
                  {pairs.map((p, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-widest font-mono text-neutral-500">
                          Area {idx + 1}
                          {isMultiArea && p.label ? ` — ${p.label}` : ""}
                        </p>
                        {isMultiArea && pairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPairs((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-xs text-neutral-400 hover:text-red-500"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <PhotoDropZone
                          label="Before"
                          file={p.before}
                          onFile={(f) =>
                            setPairs((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, before: f } : x))
                            )
                          }
                        />
                        <PhotoDropZone
                          label="After"
                          file={p.after}
                          onFile={(f) =>
                            setPairs((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, after: f } : x))
                            )
                          }
                        />
                      </div>
                      {isMultiArea && (
                        <input
                          type="text"
                          placeholder={`Area label (e.g. ${idx === 0 ? "Driveway" : idx === 1 ? "Patio" : "Siding"})`}
                          value={p.label ?? ""}
                          onChange={(e) =>
                            setPairs((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, label: e.target.value } : x
                              )
                            )
                          }
                          className="mt-1 w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs"
                          maxLength={24}
                        />
                      )}
                    </div>
                  ))}

                  {isMultiArea && pairs.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPairs((prev) => [...prev, { before: null, after: null }])
                      }
                      className="w-full rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 py-3 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      + Add another area
                    </button>
                  )}

                  {isMultiArea && pairs.length >= 4 && (
                    <p className="text-xs text-neutral-400 text-center">
                      Max 4 areas per collage. Need more? Create a carousel instead.
                    </p>
                  )}
                </div>
              </section>
```

- [ ] **Step 4: 改 canGenerate 和 handleGenerate**

替换 `canGenerate`（原 195 行）：

```typescript
  const canGenerate =
    pairs.length > 0 &&
    pairs.every((p) => p.before && p.after) &&
    selectedTemplate &&
    headline.trim().length > 0;
```

替换 `handleGenerate` 函数内 FormData 构造（原 199-218 行）为：

```typescript
    if (!selectedTemplate) return;
    if (pairs.some((p) => !p.before || !p.after)) return;

    setGenerateState({ status: "generating" });

    try {
      const fd = new FormData();
      fd.append("templateId", selectedTemplate);
      fd.append("headline", headline.trim().slice(0, 36));

      if (isMultiArea) {
        pairs.forEach((p, i) => {
          if (p.before) fd.append(`area${i + 1}_before`, p.before);
          if (p.after) fd.append(`area${i + 1}_after`, p.after);
          if (p.label) fd.append(`area${i + 1}_label`, p.label);
        });
      } else {
        if (pairs[0].before) fd.append("beforeImage", pairs[0].before);
        if (pairs[0].after) fd.append("afterImage", pairs[0].after);
      }

      if (brand.businessName) fd.append("businessName", brand.businessName);
      if (brand.phone) fd.append("phone", brand.phone);
      if (brand.serviceArea) fd.append("serviceArea", brand.serviceArea);
      fd.append("isLicensed", String(brand.isLicensed ?? false));
      fd.append("isInsured", String(brand.isInsured ?? false));
      if (brand.googleReviewCount != null) {
        fd.append("googleReviewCount", String(brand.googleReviewCount));
      }
```

保留下面 `const res = await fetch(...)` 及其后逻辑不变。

- [ ] **Step 5: 手工 dev 验证**

Run: `pnpm dev`
- 打开 `/create`，选 single-pair 模板（如 Driveway Hero Split），上传 1 对图，生成成功
- 选 collage 模板（如 Exterior Multi-area Proof），上传 2-4 对图，每对带 area label，生成成功
- 切换回单组模板，验证 UI 自动 trim 到 1 对

- [ ] **Step 6: 提交**

```bash
git add app/[locale]/(protected)/create/page.tsx
git commit -m "feat: support 1-4 area pairs upload in create page for collage templates"
```

---

## Task 20: Posts 列表页（用户的帖子历史）

**Files:**
- Create: `app/[locale]/(protected)/posts/page.tsx`

> **设计决定**：保留现有 `/history` 页（type-agnostic generation history），新增 `/posts` 专门展示 Brago posts，spec 4.2 中的 "Job history" 用例由此页满足。

- [ ] **Step 1: 写页面**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { post } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { Container } from "@/components/container";

export const dynamic = "force-dynamic";

const CHANNEL_LABEL: Record<string, string> = {
  google_business_profile: "Google",
  facebook_nextdoor: "Facebook / Nextdoor",
  instagram: "Instagram",
};

const INDUSTRY_LABEL: Record<string, string> = {
  pressure_washing: "Pressure Washing",
  auto_detailing: "Auto Detailing",
};

export default async function PostsPage() {
  const h = await headers();
  const access = await getActiveSessionUser(h);
  if (!access.ok) redirect("/login?next=/posts");

  const rows = await db
    .select()
    .from(post)
    .where(eq(post.userId, access.user.id))
    .orderBy(desc(post.createdAt))
    .limit(50);

  return (
    <div className="bg-background min-h-screen">
      <Container className="py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your posts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every poster you generated, sorted by newest first.
            </p>
          </div>
          <Link
            href="/create"
            className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            New post
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 py-16 text-center text-neutral-500">
            <p>No posts yet.</p>
            <Link
              href="/create"
              className="mt-3 inline-block text-sm underline hover:text-foreground"
            >
              Create your first post
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900"
              >
                {p.outputUrl ? (
                  <a href={p.outputUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.outputUrl}
                      alt={p.headline}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs text-neutral-400">
                    No image
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="text-sm font-medium line-clamp-1">{p.headline}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {INDUSTRY_LABEL[p.industry] ?? p.industry} ·{" "}
                    {CHANNEL_LABEL[p.channel] ?? p.channel}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
```

- [ ] **Step 2: 加入导航**

修改 `features/navigation/config.ts`（或受保护区域的导航），在 dashboard / create 附近增加 `{ href: "/posts", label: "Posts" }`。先查看：

Run: `grep -n "create\|dashboard\|history" features/navigation/config.ts`

根据现有写法插入 Posts 链接。如果导航是基于权限/section 的，把它放进 `protected` 区。

- [ ] **Step 3: 手工验证**

Run: `pnpm dev`
- 登录后访问 `/posts`，未生成过显示 empty state；生成 1 张后刷新看到该 post。

- [ ] **Step 4: 提交**

```bash
git add app/[locale]/\(protected\)/posts/page.tsx features/navigation/config.ts
git commit -m "feat: add /posts page listing user-generated Brago posts"
```

---

## Task 21: 隐藏旧 demo 路由

**Files:**
- Modify: `app/[locale]/demo/layout.tsx`（已存在则改；不存在则创建）

> SPEC 0.1 #5：删除/隐藏 demo，不删除核心依赖。最稳妥做法是把 demo 入口 notFound，但保留代码（火山引擎等基础依赖被这些 demo 引用，不能误删）。

- [ ] **Step 1: 查看 demo 目录**

Run: `ls app/[locale]/demo/`
Expected: 看到 chat / image / video 三个 demo

- [ ] **Step 2: 写 layout 让 demo 在生产环境 notFound**

替换或创建 `app/[locale]/demo/layout.tsx`:

```tsx
import { notFound } from "next/navigation";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  // Brago hides the upstream Sistine demos in all environments — they are not
  // a Brago product feature. Keep the underlying source code so we can still
  // reuse the volcano-engine / image generation infrastructure server-side.
  if (process.env.NEXT_PUBLIC_SHOW_SISTINE_DEMOS !== "true") {
    notFound();
  }
  return <>{children}</>;
}
```

- [ ] **Step 3: 验证**

Run: `pnpm dev`
打开 `http://localhost:3000/demo/chat`，应该返回 404。

- [ ] **Step 4: 检查导航**

Run: `grep -rn "/demo" features/navigation/ components/ app/ | grep -v "node_modules\|\.next" | head`
Expected: 不应出现 demo 链接（已确认 commit 0f6c2a9 之前的实现中导航不含 demo）。如果发现残留链接，删除。

- [ ] **Step 5: 提交**

```bash
git add app/[locale]/demo/layout.tsx
git commit -m "feat: hide Sistine starter demos behind env flag (Brago is not a demo app)"
```

---

## Task 22: 端到端 QA — 18 模板渲染验证

**Files:**
- Create: `tests/poster-templates.smoke.test.ts`

按 SPEC 13 QA 清单做基础冒烟测试（不需要把所有 input QA 都做完，但至少确保 18 个模板都能渲染出合法 PNG）。

- [ ] **Step 1: 写 smoke test**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { POSTER_TEMPLATES } from "@/lib/poster-templates/public-metadata";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";

const ROOT = process.cwd();

function dataUrl(p: string): string {
  const buf = readFileSync(path.join(ROOT, p));
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const fonts = [
  {
    name: "Inter",
    data: readFileSync(path.join(ROOT, "public/fonts/inter-regular.woff")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: readFileSync(path.join(ROOT, "public/fonts/jetbrains-mono-regular.woff")),
    weight: 400 as const,
    style: "normal" as const,
  },
];

describe("poster templates smoke", () => {
  it.each(POSTER_TEMPLATES)("renders $id without throwing", async (meta) => {
    const renderer = getRenderer(meta.id);
    expect(renderer).toBeTruthy();
    const isPressure = meta.industry === "pressure_washing";
    const before = dataUrl(isPressure ? "scripts/preview-assets/pressure-before.jpg" : "scripts/preview-assets/detail-before.jpg");
    const after = dataUrl(isPressure ? "scripts/preview-assets/pressure-after.jpg" : "scripts/preview-assets/detail-after.jpg");
    const input: RenderInput = {
      beforeImageDataUrl: before,
      afterImageDataUrl: after,
      templateId: meta.id,
      headline: "Concrete restored, not replaced.",
      businessName: "Test Co",
      phone: "(512) 555-0184",
      serviceArea: "Serving Austin, TX",
      isLicensed: true,
      isInsured: true,
      googleReviewCount: 247,
      projectNumber: 12,
    };
    if (meta.layoutFamily === "collage") {
      input.photoPairs = [
        { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A1" },
        { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A2" },
      ];
    }
    const element = renderer!(input);
    const svg = await satori(element, { width: 1080, height: 1080, fonts });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(png.byteLength).toBeGreaterThan(10_000);
  }, 30_000);

  it("renders multi-area templates with 4 pairs", async () => {
    const multiArea = POSTER_TEMPLATES.filter((t) => t.layoutFamily === "collage");
    expect(multiArea.length).toBeGreaterThanOrEqual(2);
    for (const meta of multiArea) {
      const renderer = getRenderer(meta.id)!;
      const isPressure = meta.industry === "pressure_washing";
      const before = dataUrl(isPressure ? "scripts/preview-assets/pressure-before.jpg" : "scripts/preview-assets/detail-before.jpg");
      const after = dataUrl(isPressure ? "scripts/preview-assets/pressure-after.jpg" : "scripts/preview-assets/detail-after.jpg");
      const input: RenderInput = {
        beforeImageDataUrl: before,
        afterImageDataUrl: after,
        templateId: meta.id,
        headline: "Multi-area job",
        photoPairs: [
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A1" },
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A2" },
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A3" },
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A4" },
        ],
      };
      const svg = await satori(renderer(input), { width: 1080, height: 1080, fonts });
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      expect(png.byteLength).toBeGreaterThan(10_000);
    }
  }, 60_000);
});
```

- [ ] **Step 2: 跑测试**

Run: `pnpm test tests/poster-templates.smoke.test.ts`
Expected: 19 个测试通过（18 个 `each` + 1 个 multi-area 4-pair）

如有失败，根据报错修复模板代码（最常见：satori 不支持的 CSS、img 缺尺寸、text overflow），然后重跑。

- [ ] **Step 3: 提交**

```bash
git add tests/poster-templates.smoke.test.ts
git commit -m "test: smoke test all 18 poster templates render to PNG without errors"
```

---

## Task 23: Sitemap 包含所有公开页

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: 检查现状**

Run: `cat app/sitemap.ts`
确认是否已包含：`/`、`/industries`、`/industries/pressure-washing-marketing`、`/industries/auto-detailing-marketing`、`/templates`、`/templates/google-business-profile-posts`、`/pricing`、5 个 `/resources/*` 页面。

- [ ] **Step 2: 补全缺失项**

如有缺失，修改 sitemap.ts。基础结构示例（按现有写法调整）：

```typescript
const STATIC_PATHS = [
  "/",
  "/pricing",
  "/industries",
  "/industries/pressure-washing-marketing",
  "/industries/auto-detailing-marketing",
  "/templates",
  "/templates/google-business-profile-posts",
  "/resources/how-to-get-pressure-washing-customers",
  "/resources/how-to-market-a-pressure-washing-business",
  "/resources/pressure-washing-advertising-ideas",
  "/resources/pressure-washing-marketing-ideas",
  "/resources/auto-detailing-marketing-posts",
];
```

应用旧 URL 301 重定向（SPEC 1.12）。在 `proxy.ts` 或 `next.config.ts` 的 redirects 中添加：

```typescript
{
  source: "/industries/pressure-washing-before-after-posts",
  destination: "/industries/pressure-washing-marketing",
  permanent: true,
},
{
  source: "/industries/auto-detailing-before-after-posts",
  destination: "/industries/auto-detailing-marketing",
  permanent: true,
},
```

- [ ] **Step 3: 验证**

Run: `pnpm dev`
访问 `http://localhost:3000/sitemap.xml`，确认所有页面 URL 都在。
访问 `http://localhost:3000/industries/pressure-washing-before-after-posts`，应 301 跳到 `pressure-washing-marketing`。

- [ ] **Step 4: 提交**

```bash
git add app/sitemap.ts next.config.* proxy.ts 2>/dev/null
git commit -m "feat: sitemap covers all Phase 2 SEO pages and legacy URL redirects"
```

---

## Task 24: 最终端到端验证

> **目标**：确认 SPEC 14 阶段 2 完成标准的每条都满足。

- [ ] **Step 1: 类型 + Lint + Test**

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test
```
Expected: 全部 PASS。

- [ ] **Step 2: 构建**

```bash
pnpm build
```
Expected: 构建成功，无错误。

- [ ] **Step 3: 手工 QA checklist**

启动 dev，逐条勾选：

1. [ ] 首页 H1 为 "Let your work brag."
2. [ ] `/pricing` 显示 Free / Pro $9.90 / Crew $19
3. [ ] `/industries` 列出 pressure washing 和 auto detailing
4. [ ] `/industries/pressure-washing-marketing` 有行业专属内容、模板预览、headline 示例、FAQ
5. [ ] `/industries/auto-detailing-marketing` 同上但是 auto detailing 内容
6. [ ] `/templates/google-business-profile-posts` 文中同时出现 "Google My Business posts" 和 "Google Business Profile posts"
7. [ ] 5 个 `/resources/*` 页面正文都不是 placeholder
8. [ ] 注册 → 首次登录走品牌设置 → 进 `/create`
9. [ ] `/create` 默认显示 Area 1，选模板（pressure & detail 各试一个），生成成功，可下载 PNG
10. [ ] 选 multi-area collage 模板，能加到 4 组，每组带 label，生成成功
11. [ ] 生成后 `/posts` 出现该条
12. [ ] `/demo/chat` 返回 404
13. [ ] 模板卡显示真实预览图（不是 1080×1080 占位）
14. [ ] AI Suggest 给出 3 个 headline 备选
15. [ ] Caption 生成并可复制
16. [ ] Free 用户生成的 PNG 带水印
17. [ ] 积分扣除 10 一次

- [ ] **Step 4: 提交并合并到 main**

如所有 checklist 通过：

```bash
git status
git log --oneline -25
```

确认 commit 历史干净。可选用 `pnpm db:studio` 检查 `post` / `post_image_pair` 表有真实数据。

- [ ] **Step 5: 最终 PR/合并**

如果在 worktree 上工作：

```bash
git push -u origin <branch-name>
gh pr create --title "Brago Phase 2 completion" --body "$(cat <<'EOF'
## Summary
- Auto detailing 7 个 single-pair 模板 + 1 个 multi-area = 8 个模板
- Pressure washing 增加 1 个 multi-area 模板（exterior-multi-area-proof）
- 18 张 webp 预览图（含 pressure_washing 8 + auto_detailing 8 + 2 multi-area，外加 multi-area 是新增）
- `posts` / `post_image_pair` 表 + render API 同步写入
- Create 页支持 Area 1-4 上传
- `/posts` 用户帖子列表页
- 旧 Sistine demo 隐藏
- 18 模板 smoke 测试

## Test plan
- [x] `pnpm tsc --noEmit`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] 手工 17 项 QA 通过
EOF
)"
```

如直接在 main 分支：审查 `git log` 后由用户决定是否 push。

---

## Self-Review Notes

**Spec coverage 检查：**

- SPEC 5.3 16 模板（实际 18，因为我们没替换现有模板而是 2 个 multi-area 增量）→ Tasks 2-12 ✓
- SPEC 5.4 metadata 扩展 → Tasks 9, 12 ✓
- SPEC 4.3 1-4 pairs 上传 → Tasks 10, 11, 19 ✓
- SPEC 12 posts + post_image_pairs 表 → Task 17 ✓
- SPEC 0.1 #5 demo 隐藏 → Task 21 ✓
- SPEC 1.12 sitemap + 301 → Task 23 ✓
- SPEC 13 模板 QA → Task 22 smoke 测试覆盖渲染层（视觉 QA 在 Task 24 手工 checklist）
- SPEC 14 阶段 2 完成标准 → Task 24 全覆盖

**未覆盖（属于阶段 3 或 SPEC 明确推迟的）：**

- 模板 metadata 中 `supportedPhotoRatios` / `labelStyle` / `labelPlacement` / `trustBadgeDefault` 扩展（SPEC 5.4 / 7.4）— 当前 BragoTemplateMeta 没有这些字段，SPEC 也说"为未来保留"，不是阶段 2 阻塞
- Caption 生成中 service type 输入 — 当前 caption API 已工作，扩展可选字段不阻塞
- 持久化原始上传图片到 R2 — Task 18 把 `postImagePair.beforeImageUrl/afterImageUrl` 留 null，注释了未来扩展点
- AI 反向 before/after 自动检测 — SPEC 4.3 明确说"AI 不要自动改"，不实现自动反转就是正确做法
- Sistine demo 物理删除 — SPEC 0.1 #5 明确说"不要因为删除 demo 误删火山引擎等基础代码"，env flag 隐藏即可

**Placeholder 扫描：** 已检查，全部代码块完整，无 "TBD / implement later"。

**类型一致性：** `RenderInput.photoPairs` 在 types.ts、registry, render API、create 页、smoke test 中均使用相同类型 `PhotoPair[]`，字段名 `beforeImageDataUrl`/`afterImageDataUrl`/`areaLabel` 一致。`post` / `postImagePair` 表字段在 schema、render API、posts 页一致。

---

## 🚀 上线前 must-fix Checklist

阶段 2 代码本身完整，但 `.env.local` / 部署环境必须做以下事情才能正常对外提供服务，否则会出现「用户注册了但永远收不到验证邮件」「webhook 不触发」等真实生产事故。

### Email（**P0 — 不修注册系统瘫痪**）

`.env.local` 当前是模板占位值（在本次 QA 中已用 SQL `UPDATE "user" SET email_verified=true` 临时绕过）：

```bash
# 必须改成真实值 —— 否则 sendVerificationEmail() 直接 401，注册流程卡在 /check-email
RESEND_API_KEY=re_<在 https://resend.com/api-keys 创建>
RESEND_FROM_EMAIL="Brago <noreply@<已在 Resend 验证的域名>>"

# 推荐设置（lib/email.ts 在生产模式下要求 RESEND_VERIFIED_DOMAIN）
RESEND_VERIFIED_DOMAIN=<你的已验证域名>
RESEND_FROM_NAME=Brago
```

验证步骤：
1. https://resend.com 注册账号 → Domains 加你的域名 → 按提示加 SPF / DKIM TXT
2. 域名 Verified 后 → API Keys → Create
3. 改 `.env.local` 三个值
4. 重启 dev server，注册新邮箱 → 收件箱 30 秒内应收到验证邮件

### Better Auth（**P0**）

```bash
# 生产环境必须改成真实域名（带 https://），否则 cookie/redirect 全错
BETTER_AUTH_URL=https://你的生产域名
NEXT_PUBLIC_APP_URL=https://你的生产域名
```

### Creem 支付（**P1 — 不修付费功能不可用，但免费流程能跑**）

- Creem Dashboard → Webhooks 加 `https://你的生产域名/api/payments/creem/webhook`
- 监听事件：`checkout.completed`、`subscription.paid`、`subscription.active`
- `.env` 配 `CREEM_API_KEY` + `CREEM_WEBHOOK_SECRET`

### Cron（**P1 — 不修年付订阅积分不会自动发放**）

Vercel 部署的话用 `vercel.json` cron，或外部定时器每小时调：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://你的生产域名/api/cron/subscription-grants
```

### 其它

- `NEXT_PUBLIC_SHOW_SISTINE_DEMOS` 保持**不设**或 `false` —— `/demo/*` 会 404，符合 SPEC 0.1 #5
- 生产环境可选：`NEXT_PUBLIC_POSTHOG_KEY`、`NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`、`NEXT_PUBLIC_CLARITY_PROJECT_ID`
- R2 存储原图（阶段 3 才用到）—— 阶段 2 可空着，`postImagePair.beforeImageUrl/afterImageUrl` 留 null 是预期

### Checklist 勾选

- [ ] Resend API key 真实、域名已 verified、`from` 用 verified 域名
- [ ] 注册一个新邮箱 → 30 秒内收到验证邮件 → 点链接 → 自动登录
- [ ] `BETTER_AUTH_URL` + `NEXT_PUBLIC_APP_URL` 改成生产 https 域名
- [ ] Creem webhook URL 已在 Dashboard 注册
- [ ] `CRON_SECRET` 配好 + Vercel/外部定时器已注册 `/api/cron/subscription-grants`
- [ ] `NEXT_PUBLIC_SHOW_SISTINE_DEMOS` 未设
- [ ] 数据库迁移已执行（`pnpm db:push` 或 `pnpm db:migrate`，含 0009_dashing_lester.sql）
- [ ] 至少一个 admin 账号已建（`pnpm admin:setup` 或手动改 `user.role='admin'`）

