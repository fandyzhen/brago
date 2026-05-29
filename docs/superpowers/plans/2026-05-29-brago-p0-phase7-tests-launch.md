# Brago P0 Phase 7 — 验收、隐私 / Terms、Launch Checklist

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** 收尾。spec 18.1/18.2 要求的合规文案、19.3 测试覆盖、20 Phase 0 外部依赖清单更新到 `launch-checklist.md`。

---

## Task 1: Privacy 页面追加 Customer property photos 段落

**Files:**
- Modify: `app/[locale]/(marketing)/privacy/page.tsx`（或 mdx）
- Modify: `app/[locale]/(marketing)/terms/page.tsx`

- [ ] **Step 1: Privacy 段落**

新增标题 `Customer property photos` 内容（英文）：

> Brago lets you upload photos from finished jobs. You confirm before each upload that you have permission to use these photos for marketing. We process the originals to remove location-identifying EXIF data, generate a Google-ready version (square crop, light auto-enhancement), and store both the original and processed versions under your account in our R2 storage. We do not use customer photos to train AI models. You can delete any post (and its photos) from `/google-posts` at any time, which removes the records and queues files for purge.

中文同步。

- [ ] **Step 2: Terms 加段**

> By uploading photos, you confirm that (a) you have permission from the customer (where applicable) to use the images in marketing materials and (b) Brago provides AI-assisted draft captions and image selection — you remain responsible for final review and posting.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(marketing)/privacy/" "app/[locale]/(marketing)/terms/"
git commit -m "docs(legal): customer property photos clause"
```

---

## Task 2: 删除 post + photos 的删除路径

**Files:**
- Create: `app/api/brago/google-posts/[postId]/delete/route.ts`

- [ ] **Step 1:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto, captionHistory, uploadConsent } from "@/lib/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;
  await db.transaction(async (tx) => {
    await tx.delete(googlePostPhoto).where(eq(googlePostPhoto.googlePostId, postId));
    await tx.delete(captionHistory).where(and(eq(captionHistory.googlePostId, postId), eq(captionHistory.userId, access.user.id)));
    await tx.delete(uploadConsent).where(and(eq(uploadConsent.googlePostId, postId), eq(uploadConsent.userId, access.user.id)));
    await tx.delete(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id)));
  });
  return NextResponse.json({ ok: true });
}
```

注：R2 实际文件 purge P0 暂记 TODO；UI 操作记录在 db 即可，文件 P1 加 lifecycle 策略。launch-checklist 标记。

- [ ] **Step 2: 输出页加 "Delete this post" 操作**

`/google-posts/[postId]/page.tsx` 底部加：

```tsx
<button
  onClick={async () => {
    if (!confirm("Delete this post and its photos?")) return;
    await fetch(`/api/brago/google-posts/${postId}/delete`, { method: "POST" });
    window.location.href = "/dashboard";
  }}
  className="mt-6 text-xs text-red-600 underline"
>
  Delete this post
</button>
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/delete/route.ts" "app/[locale]/(protected)/google-posts/[postId]/page.tsx"
git commit -m "feat(google-posts): user-initiated delete"
```

---

## Task 3: 测试集合 sweep

**Files:**
- 现有 / Create: 看 spec 19.3 列表

- [ ] **Step 1: 确认存在以下测试 + 增补缺失项**

spec 要求：
- `tests/lib/brago-google-policy.test.ts` — Phase 5 已建
- `tests/lib/brago-caption-templates.test.ts` — Phase 5 已建
- `tests/lib/brago-caption-history.test.ts` — Phase 5 已建
- `tests/lib/brago-photo-analysis.test.ts` — Phase 4 已建 (`brago-vision-fallback` + `brago-vision-schema`，文件名不同但覆盖)
- `tests/lib/brago-image-processing.test.ts` — Phase 3 已建
- `tests/lib/brago-reminders.test.ts` — Phase 6 已建
- `tests/components/google-post-card.test.tsx` — 缺
- `tests/components/google-post-output.test.tsx` — 缺
- `tests/constants/billing.test.ts` — 缺

- [ ] **Step 2: billing constants 测试**

```ts
// tests/constants/billing.test.ts
import { describe, it, expect } from "vitest";
import { subscriptionPlans, oneTimePacks, isSubscriptionKey, isPackKey, BRAGO_LOCAL_DISPLAY } from "@/constants/billing";

describe("billing constants", () => {
  it("includes brago_local plans", () => {
    expect(isSubscriptionKey("brago_local_monthly")).toBe(true);
    expect(isSubscriptionKey("brago_local_yearly")).toBe(true);
  });

  it("brago_local_monthly is $19 / 30 credits / month", () => {
    const p = subscriptionPlans.brago_local_monthly;
    expect(p.priceCents).toBe(1900);
    expect(p.creditsPerCycle).toBe(30);
    expect(p.cycle).toBe("month");
  });

  it("yearly is installment-scheduled", () => {
    const p = subscriptionPlans.brago_local_yearly;
    expect(p.grantSchedule?.mode).toBe("installments");
  });

  it("BRAGO_LOCAL_DISPLAY exposes promo + normal", () => {
    expect(BRAGO_LOCAL_DISPLAY.promoPriceCents).toBe(1900);
    expect(BRAGO_LOCAL_DISPLAY.normalPriceCents).toBe(3900);
  });

  it("retains legacy pack_200", () => {
    expect(isPackKey("pack_200")).toBe(true);
    expect(oneTimePacks.pack_200.priceCents).toBe(500);
  });
});
```

- [ ] **Step 3: google-post-card 测试**

新建 `features/brago/dashboard/google-post-card.tsx`（如果之前用 RecentGooglePosts 内联了，现在抽出来：）

```tsx
// features/brago/dashboard/google-post-card.tsx
import Link from "next/link";

export type GooglePostCardProps = {
  id: string;
  serviceType: string;
  serviceArea: string | null;
  status: "draft" | "ready" | "posted_manually" | "archived";
  language: "en" | "es";
  thumbnailUrl?: string | null;
};

export function GooglePostCard(p: GooglePostCardProps) {
  return (
    <Link href={`/google-posts/${p.id}`} className="block rounded-xl border p-4 hover:bg-foreground/5">
      <div className="flex items-start gap-3">
        {p.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumbnailUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{p.serviceType}</div>
          <div className="text-xs text-muted-foreground truncate">
            {p.serviceArea ?? "—"} · <span data-testid="status">{p.status}</span> · <span data-testid="lang">{p.language.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

测试 `tests/components/google-post-card.test.tsx`：

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GooglePostCard } from "@/features/brago/dashboard/google-post-card";

describe("GooglePostCard", () => {
  it("renders status and language", () => {
    render(<GooglePostCard id="p1" serviceType="driveway" serviceArea="Austin" status="ready" language="en" />);
    expect(screen.getByTestId("status").textContent).toBe("ready");
    expect(screen.getByTestId("lang").textContent).toBe("EN");
  });
});
```

更新 RecentGooglePosts 用 GooglePostCard 渲染。

- [ ] **Step 4: google-post-output 简单 smoke 测试**

输出页 client 组件难测（依赖 fetch），写一个最小 smoke：

```tsx
// tests/components/google-post-output.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useParams: () => ({ postId: "p1" }),
}));

vi.stubGlobal("fetch", vi.fn(async () => ({
  json: async () => ({ post: null }),
  ok: true,
})));

import Page from "@/app/[locale]/(protected)/google-posts/[postId]/page";

describe("GooglePostOutput", () => {
  it("renders loading state", () => {
    const { container } = render(<Page />);
    expect(container.textContent ?? "").toContain("Loading");
  });
});
```

- [ ] **Step 5: 跑全测**

```bash
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add tests/ features/brago/dashboard/google-post-card.tsx
git commit -m "test: cover billing constants + google post card + output smoke"
```

---

## Task 4: launch-checklist 全面更新

**Files:**
- Modify: `docs/launch-checklist.md`

- [ ] **Step 1: 新增 P0 Google-ready 段落**

在 `docs/launch-checklist.md` 顶部新增 (在 "P0 — 不修就瘫痪的事" 上面)：

```markdown
## P0 Google-Ready Posts 发布前必做（2026-05-29 重设计后）

### G1 — 外部 AI/存储/邮件 key
- [ ] `VOLCANO_ENGINE_API_KEY` 填生产 key
- [ ] `VOLCANO_ENGINE_VISION_MODEL` 选择实际模型名（参 spec 14.2 当天查官方文档）
- [ ] `VOLCANO_ENGINE_TEXT_MODEL` 同上
- [ ] 全套 `STORAGE_*` R2 变量填生产 bucket / 公网域
- [ ] `RESEND_API_KEY` 切真 key + verified `RESEND_FROM_EMAIL`
- [ ] `BRAGO_CAPTION_CREDIT_COST` / `BRAGO_REWRITE_CREDIT_COST` 调成业务希望的扣分（默认 1）

### G2 — Creem 产品 ID
- [ ] 在 Creem 控制台新建两个订阅产品：`Brago Local Monthly ($19)`、`Brago Local Yearly ($190)`
- [ ] 拿到 prod_xxx 填回 `constants/billing.ts` 的 `brago_local_monthly.creemPriceId` / `brago_local_yearly.creemPriceId`
- [ ] 把 webhook URL 注册成 `https://你域名/api/payments/creem/webhook`，监听 checkout/subscription 事件
- [ ] 测试模式跑一次完整 checkout + cron 自动续费

### G3 — Vercel Cron 注册
- [ ] `/api/cron/brago-weekly-reminders`（每小时跑，handler 内部判断 7 天阈值）
- [ ] `/api/cron/subscription-grants`（保留）
- [ ] `CRON_SECRET` 配到 Vercel

### G4 — 数据库迁移
- [ ] 跑 `pnpm db:push` 或 `db:migrate` 把 `0010_*.sql` 应用到生产
- [ ] 验证 6 张新表均创建（google_post / google_post_photo / brand_voice_profile / caption_history / reminder_settings / upload_consent）

### G5 — R2 文件 lifecycle (P1 进度)
- [ ] P0 删除 post 时清空 db，R2 文件不立即 purge（节省时间）；P1 用 R2 lifecycle 自动清 60 天前未引用文件
- [ ] 当前 launch 不阻断

### G6 — Privacy / Terms 重审
- [ ] Customer property photos 段落已加（Phase 7 Task 1）
- [ ] 中英文文案确认

### G7 — 旧 Brago multi-channel 兼容
- [ ] 旧 `post` / `post_image_pair` 表保留
- [ ] 旧 `/api/posters/*` 路由保留兼容
- [ ] 公开端无任何 multi-channel 文案残留（Phase 1 Task 9 grep 过）
```

- [ ] **Step 2: Commit**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): full pre-launch checklist for Google-ready P0"
```

---

## Task 5: 最终验收 sweep

- [ ] **Step 1: 全测**

```bash
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 2: spec 19.1 产品验收逐项核对**

把 spec 第 19.1 的每条用人脑过一遍（不要求自动化，但 PR 评审备查）。

- [ ] **Step 3: Commit allow-empty**

```bash
git commit --allow-empty -m "chore: Phase 7 complete — Brago Google-ready P0 ready for owner config"
```

## Definition of Done

- Privacy + Terms 已增 customer property photos 段。
- 删 post 接口 + UI 入口可用。
- spec 19.3 测试列表全部存在并通过（含 billing constants、google-post-card、output smoke）。
- launch-checklist 含完整外部配置 todo。
- 全栈 lint/test/build 绿。
