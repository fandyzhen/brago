# Brago P0 Phase 1 — 信息架构和公开页

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把公开端的多渠道 job pack 话术全部替换为 Google-ready posts；新增 `/free-google-post-generator` SEO 入口；定价改成 Free + Brago Local。

**Architecture:** 改动只涉及静态 UI + 文案 + 定价配置；不动数据库；不删旧 API 但 UI 不暴露。

**Tech Stack:** Next.js App Router、next-intl、Tailwind、constants/billing.ts。

---

## 文件清单

- Modify: `messages/en.json`, `messages/zh.json` — hero / hero.supporting / hero.cta 等文案
- Modify: `messages/seo.en.json`, `messages/seo.zh.json` — 首页 meta + 新的 free generator 页
- Modify: `components/hero.tsx` — 去掉 4-channel CHANNELS、改文案
- Modify: `app/[locale]/(marketing)/page.tsx` — INDUSTRIES、HOW_IT_WORKS 文案
- Modify: `app/[locale]/(marketing)/pricing/page.tsx` 或 `components/pricing.tsx` — Free + Brago Local
- Modify: `constants/billing.ts` — 重新设计 plan：brago_local_monthly / brago_local_yearly
- Modify: `app/api/payments/creem/webhook/route.ts` 与 `lib/payments/creem.ts` — 兼容新 plan key（保留旧 key 转译以免存量订阅炸）
- Create: `app/[locale]/(marketing)/free-google-post-generator/page.tsx` — SEO 免费工具页
- Create: `app/api/brago/free-generator/route.ts` — 免登录 stub 端点（先 fake，Phase 5 接 caption engine）
- Modify: `components/footer.tsx` 与导航 — 移除 multi-channel 描述

---

## Task 1: 调研 + 备份现有公开端文案

**Files:**
- 只读：`messages/en.json`, `messages/zh.json`, `components/hero.tsx`, `app/[locale]/(marketing)/page.tsx`

- [ ] **Step 1: 列出所有受影响文案 key**

读 `messages/en.json` 里 `hero`, `homepage`, `pricing`, `footer` namespace；列出含有 "channel" / "job pack" / "Facebook" / "Instagram" / "Nextdoor" / "4 channels" 的 key。整理一张映射表(旧文案→新文案)写到本任务的备注里(草稿即可，不提交)。

- [ ] **Step 2: 不需要 commit**

只是调研，不动文件。

---

## Task 2: 改 Hero 组件 + 翻译

**Files:**
- Modify: `components/hero.tsx`
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

- [ ] **Step 1: 改 hero.tsx 去掉 CHANNELS 数组与 4-channel badge**

删除 `const CHANNELS = [...]` 与渲染处。第一屏只展示文案 + CTA。Hero 视觉里"channels showcase"换成"three step preview"（占位文字也行，Phase 2 再做可视化）。

- [ ] **Step 2: 改 hero 翻译**

`messages/en.json` 的 `hero` namespace：
```json
"hero": {
  "badge": "Google-ready posts",
  "title": "Let your work brag.",
  "description": "Turn finished job photos into Google-ready posts.",
  "supporting": "Drafts ready in moments — copy and post to your Google Business Profile.",
  "cta": "Create a free Google post",
  "ctaSecondary": "See example"
}
```

`messages/zh.json` 对应中文：
```json
"hero": {
  "badge": "Google 现成贴文",
  "title": "让你的作品自己说话。",
  "description": "完工照片秒变 Google Business Profile 贴文。",
  "supporting": "几秒得到首版草稿——复制粘贴就能发到 Google Business Profile。",
  "cta": "免费生成一条 Google 贴文",
  "ctaSecondary": "看示例"
}
```

- [ ] **Step 3: build + lint**

```bash
pnpm lint
```
预期：通过。

- [ ] **Step 4: Commit**

```bash
git add components/hero.tsx messages/en.json messages/zh.json
git commit -m "feat(hero): refocus to Google-ready posts"
```

---

## Task 3: 改首页 INDUSTRIES / HOW_IT_WORKS

**Files:**
- Modify: `app/[locale]/(marketing)/page.tsx`

- [ ] **Step 1: 改 HOW_IT_WORKS 文案**

把第 3 步 "Pick where to post" 替换为 "Pick the best after photo"；第 4 步 "Download and post" 改成 "Copy and post to Google"；去掉 "in under 60 seconds"（改成 "in a few taps"）。

- [ ] **Step 2: INDUSTRIES 数组**

保留 pressure-washing 和 auto-detailing；新增 `cleaning`（包括 carpet cleaning / move-out cleaning / window cleaning）：

```ts
{
  slug: "/industries/cleaning-marketing",
  name: "Cleaning",
  accent: "#22C55E",
  scenes: ["Carpet", "Move-out", "Window", "Commercial"],
}
```

industries 路由可以是 404；保留 slug 是为 Phase 5 SEO 时直接对接。

- [ ] **Step 3: 顶部 metadata 改**

```ts
title: "Brago — Google-ready posts from finished job photos",
description: t("description"),
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(marketing)/page.tsx"
git commit -m "feat(home): drop multi-channel pitch, refocus on Google"
```

---

## Task 4: 改定价配置 (`constants/billing.ts`)

**Files:**
- Modify: `constants/billing.ts`

- [ ] **Step 1: 新增 brago_local plan key**

```ts
export type PlanKey =
  | "brago_local_monthly"
  | "brago_local_yearly"
  // 兼容历史 key（不要删，Webhook 用旧 ID 续费时仍可匹配）
  | "starter_monthly"
  | "starter_yearly"
  | "pro_monthly"
  | "pro_yearly";
```

在 `subscriptionPlans` 里新增：

```ts
brago_local_monthly: {
  key: "brago_local_monthly",
  kind: "subscription",
  priceCents: 1900,   // $19 promo
  currency: "usd",
  creditsPerCycle: 30, // 30 Google-ready posts / month
  cycle: "month",
  creemPriceId: undefined,
  grantSchedule: { mode: "per_cycle" },
},
brago_local_yearly: {
  key: "brago_local_yearly",
  kind: "subscription",
  priceCents: 19000,   // $190/year
  currency: "usd",
  creditsPerCycle: 360, // 30 * 12
  cycle: "year",
  creemPriceId: undefined,
  grantSchedule: {
    mode: "installments",
    grantsPerCycle: 12,
    intervalMonths: 1,
    creditsPerGrant: 30,
    initialGrants: 1,
  },
},
```

旧四档保留原样（用于历史订阅）。

- [ ] **Step 2: 新增公开展示常量**

文件末尾新增：

```ts
export const BRAGO_LOCAL_DISPLAY = {
  promoPriceCents: 1900,
  normalPriceCents: 3900,
  monthlyCreditsLabel: "30 Google-ready posts / month",
  promoBadge: "Launch price for early customers",
  annual: {
    priceCents: 19000,
    altPriceCents: 19900,
  },
} as const;
```

- [ ] **Step 3: 验证**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add constants/billing.ts
git commit -m "feat(billing): introduce Brago Local plan keys"
```

---

## Task 5: 改定价页 UI

**Files:**
- Modify: `components/pricing.tsx`
- Modify: `app/[locale]/(marketing)/pricing/page.tsx`（如有需要）
- Modify: `messages/en.json`, `messages/zh.json` 的 `pricing` namespace

- [ ] **Step 1: 改 pricing 组件，只展示两档**

Pricing 卡片：
1. Free：$0、3 Google posts total、`Best after shot`、`Google-safe caption`、`English / Spanish output`、`No credit card required`。
2. Brago Local：促销价 `$19/mo`、`Normally $39/mo` 划线、`Launch price for early customers` 徽章、30 posts/mo 包含项参 spec 16。

去掉旧 starter/pro 多档展示。

- [ ] **Step 2: 改翻译**

`pricing` namespace 增加：
```json
{
  "free": {
    "name": "Free",
    "price": "$0",
    "tagline": "Try it before you commit",
    "feature_posts": "3 Google posts total",
    "feature_after_shot": "Best after shot",
    "feature_caption": "Google-safe captions",
    "feature_languages": "English / Spanish output",
    "feature_no_card": "No credit card required"
  },
  "local": {
    "name": "Brago Local",
    "price": "$19/mo",
    "normalPrice": "Normally $39/mo",
    "badge": "Launch price for early customers",
    "feature_posts": "30 Google-ready posts per month",
    "feature_after_shot": "Best after shot",
    "feature_caption": "Google-safe captions",
    "feature_languages": "English / Spanish output",
    "feature_history": "History-aware wording",
    "feature_reminder": "Weekly Google reminders",
    "feature_no_watermark": "No Brago watermark on exports",
    "annual_label": "Or $190/year"
  }
}
```

中文同步。

- [ ] **Step 3: 验证**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add components/pricing.tsx messages/en.json messages/zh.json "app/[locale]/(marketing)/pricing/page.tsx"
git commit -m "feat(pricing): Free + Brago Local two-tier"
```

---

## Task 6: 创建 `/free-google-post-generator` SEO 页面

**Files:**
- Create: `app/[locale]/(marketing)/free-google-post-generator/page.tsx`
- Create: `app/[locale]/(marketing)/free-google-post-generator/client.tsx`
- Modify: `messages/seo.en.json`, `messages/seo.zh.json`

- [ ] **Step 1: 写 page.tsx (SSR)**

```tsx
import { Metadata } from "next";
import type { Locale } from "@/i18n.config";
import { generatePageMetadata } from "@/lib/metadata";
import { FreeGeneratorClient } from "./client";

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return generatePageMetadata({
    locale,
    path: "/free-google-post-generator",
    title: "Free Google Business Post Generator for Pressure Washers",
    description: "Upload finished pressure washing job photos and get a Google-safe Business Profile caption in seconds. No signup required for first draft.",
  });
}

export default function Page() {
  return <FreeGeneratorClient />;
}
```

- [ ] **Step 2: 写 client.tsx，提供最小骨架**

最小骨架包含：H1、upload 1-3 张占位 button、industry/serviceType/city 输入框、Generate 按钮 → 调 `/api/brago/free-generator` → 展示生成的 caption（先用 stub 返回）；底部 CTA `Try full Brago with best photo selection` → `/signup`。

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/container";

export function FreeGeneratorClient() {
  const [city, setCity] = useState("");
  const [serviceType, setServiceType] = useState("driveway");
  const [photos, setPhotos] = useState<File[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("industry", "pressure_washing");
      fd.set("serviceType", serviceType);
      fd.set("city", city);
      photos.slice(0, 3).forEach((f, i) => fd.set(`photo_${i}`, f));
      const res = await fetch("/api/brago/free-generator", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setCaption(data.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-16">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">
        Free Google Business Post Generator for Pressure Washers
      </h1>
      <p className="text-muted-foreground mb-8">
        Upload up to 3 finished job photos. Get a Google-safe caption you can paste into your Business Profile.
      </p>

      <div className="grid gap-4 max-w-xl">
        <label className="flex flex-col gap-1 text-sm">
          City or neighborhood
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="South Austin"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Service type
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="rounded-md border px-3 py-2"
          >
            <option value="driveway">Driveway cleaning</option>
            <option value="patio">Patio cleaning</option>
            <option value="siding">House wash</option>
            <option value="walkway">Walkway cleaning</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Up to 3 photos (optional)
          <input
            type="file"
            multiple
            accept="image/*,.heic,.heif"
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 3))}
          />
        </label>
        <button
          disabled={loading}
          onClick={onGenerate}
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate caption"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {caption && (
        <div className="mt-8 rounded-xl border p-6 max-w-xl">
          <p className="whitespace-pre-wrap text-sm">{caption}</p>
          <button
            className="mt-3 text-xs text-muted-foreground underline"
            onClick={() => navigator.clipboard.writeText(caption)}
          >
            Copy
          </button>
        </div>
      )}

      <div className="mt-12 rounded-xl bg-foreground/5 p-6 max-w-xl">
        <h3 className="text-base font-semibold mb-2">Want best-photo selection + history-aware wording?</h3>
        <Link
          href="/signup"
          className="inline-flex rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
        >
          Try full Brago with best photo selection
        </Link>
      </div>
    </Container>
  );
}
```

- [ ] **Step 3: 添加 SEO 翻译**

`messages/seo.en.json` 增加 `freeGenerator` 段；中文同步。

- [ ] **Step 4: 确认路由**

```bash
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(marketing)/free-google-post-generator/" messages/seo.en.json messages/seo.zh.json
git commit -m "feat(seo): /free-google-post-generator SEO page (stub generator)"
```

---

## Task 7: 创建 `/api/brago/free-generator` stub 端点

**Files:**
- Create: `app/api/brago/free-generator/route.ts`

- [ ] **Step 1: 写 stub**

```ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FALLBACK_TEMPLATES: Record<string, string> = {
  driveway:
    "Cleaned up a driveway in {city} today. Pulled out the built-up grime and got the concrete looking fresh again.",
  patio:
    "Pressure washed a patio in {city} this week. Brought back the original color so it's ready for cookouts.",
  siding:
    "House wash done in {city}. Removed the dingy buildup on the siding and left a clean, bright finish.",
  walkway:
    "Walkway cleaning in {city}. Stripped off the slick green growth so it's safe to walk on again.",
};

export async function POST(req: NextRequest) {
  // 限流可在 Phase 5 加；P0 stub 直接放过
  const form = await req.formData();
  const city = (form.get("city") as string | null)?.trim() || "your neighborhood";
  const serviceType = (form.get("serviceType") as string | null) || "driveway";
  const tmpl = FALLBACK_TEMPLATES[serviceType] ?? FALLBACK_TEMPLATES.driveway;
  const caption = tmpl.replace("{city}", city);

  return NextResponse.json({
    caption,
    ctaHint: "Use the Call button on our Google profile to reach us.",
    source: "fallback-template",
  });
}
```

注：这里先输出 fallback；Phase 5 会替换为真正的 caption engine（仍走同一路径）。

- [ ] **Step 2: 单元测试**

`tests/api/brago-free-generator.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/brago/free-generator/route";

function makeReq(form: Record<string, string>) {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.set(k, v));
  return new Request("http://localhost/api/brago/free-generator", {
    method: "POST",
    body: fd,
  });
}

describe("/api/brago/free-generator", () => {
  it("returns caption with city interpolated", async () => {
    const res = await POST(makeReq({ city: "South Austin", serviceType: "driveway" }) as never);
    const json = await res.json();
    expect(json.caption).toContain("South Austin");
  });

  it("falls back to generic city when missing", async () => {
    const res = await POST(makeReq({ serviceType: "patio" }) as never);
    const json = await res.json();
    expect(json.caption).toContain("your neighborhood");
  });

  it("falls back to driveway template when unknown service type", async () => {
    const res = await POST(makeReq({ serviceType: "unknown", city: "Plano" }) as never);
    const json = await res.json();
    expect(json.caption).toContain("driveway");
  });
});
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test tests/api/brago-free-generator.test.ts
```

预期：3 个 pass。

- [ ] **Step 4: Commit**

```bash
git add app/api/brago/free-generator/route.ts tests/api/brago-free-generator.test.ts
git commit -m "feat(api): /api/brago/free-generator stub + tests"
```

---

## Task 8: 关闭旧 multi-channel 在 dashboard / posts 表面话术

**Files:**
- Modify: `app/[locale]/(protected)/dashboard/page.tsx`
- Modify: `app/[locale]/(protected)/posts/page.tsx`
- Modify: `app/[locale]/(protected)/posts/[postId]/page.tsx`（如存在）

- [ ] **Step 1: dashboard 改 hero copy**

把 "Generate posters for any channel" 之类话术改成 "Ready to post today's job?"；保留旧 cards 显示，不删除。CTA 主按钮文案改为 `Upload job photos`。

- [ ] **Step 2: posts 列表改标题**

`Your posts` → `Your Google posts`；保留旧记录展示，新建路径仍指向旧 `/create`（Phase 2 会重写 create）。

- [ ] **Step 3: 验证**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(protected)/dashboard/page.tsx" "app/[locale]/(protected)/posts/page.tsx"
git commit -m "feat(protected): refocus dashboard/posts copy on Google"
```

---

## Task 9: footer / nav 去掉 channel 暗示

**Files:**
- Modify: `components/footer.tsx`
- Modify: `features/marketing/*` 中含 channel 字样的组件（grep）

- [ ] **Step 1: grep**

```bash
grep -rn "Facebook\|Nextdoor\|Instagram\|multi-channel\|job pack" components features messages --include="*.tsx" --include="*.json"
```

- [ ] **Step 2: 删/改对应文案**

footer 链接里如果有 "Facebook"/"Instagram" 链接（指 platform），保留（那是社交分享链接，不是产品功能）；如果是 "Facebook posts feature" 这种，删掉或改为 "Google posts"。

- [ ] **Step 3: lint + 截图(可选)**

```bash
pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "feat(marketing): scrub residual multi-channel references"
```

---

## Task 10: Phase 1 完整性 + 提交

**Files:**
- 无新文件

- [ ] **Step 1: 跑全套**

```bash
pnpm lint
pnpm test
pnpm build
```

预期：全 pass。如果失败，定位原因并修。

- [ ] **Step 2: 更新 launch-checklist**

在 `docs/launch-checklist.md` 顶部追加 "Phase 1 完成 - YYYY-MM-DD" 一行。

- [ ] **Step 3: Commit**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): mark Phase 1 (info architecture) complete"
```

## Definition of Done

- 公开首页第一屏完全不出现 "Facebook/Instagram/Nextdoor/4-channel" 等过时承诺。
- `/free-google-post-generator` 可访问、可生成 stub caption。
- `/pricing` 只显示两档：Free + Brago Local。
- 旧 `/api/posters/*` 路由仍然存在并响应（兼容历史数据）。
- `pnpm lint && pnpm test && pnpm build` 全过。
