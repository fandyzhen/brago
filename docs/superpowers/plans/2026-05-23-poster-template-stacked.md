# Driveway Bold Stacked 模板 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第二个海报模板 `pressure_driveway_stacked`（Driveway Bold Stacked），采用 Before 上 / 黑色 Headline 横幅 / After 下 三段式布局。

**Architecture:** 新建模板 TSX 文件，导出 `RenderFn`；在 `registry.ts` 注册；在 `public-metadata.ts` 添加元数据。与现有 `driveway-hero-split` 完全共享字体、颜色、`RenderInput` 接口，零新依赖。

**Tech Stack:** React（satori JSX inline styles）、TypeScript、Vitest

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/server/poster-templates/pressure-washing/driveway-bold-stacked.tsx` | 新建 | 三段式模板渲染函数 |
| `lib/server/poster-templates/registry.ts` | 修改 | 注册新模板 ID |
| `lib/poster-templates/public-metadata.ts` | 修改 | 添加前端可见的元数据 |
| `tests/lib/poster-registry.test.ts` | 修改 | 扩展注册表测试（2 个新 it） |

---

## Task 1: 写失败测试

**Files:**
- Modify: `tests/lib/poster-registry.test.ts`

- [ ] **Step 1: 在现有测试文件末尾追加 2 个新 `it` 块**

`tests/lib/poster-registry.test.ts` 完整替换为：

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

  it("contains the stacked pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_stacked");
  });

  it("returns a render function for pressure_driveway_stacked", () => {
    const renderer = getRenderer("pressure_driveway_stacked");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });
});
```

- [ ] **Step 2: 运行新增测试，确认它们失败**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/poster-registry.test.ts 2>&1 | tail -10
```

Expected: 2 个新测试 FAIL（`pressure_driveway_stacked` 不在 registry），原有 3 个测试 PASS。

---

## Task 2: 实现模板 + 注册 + 更新元数据

**Files:**
- Create: `lib/server/poster-templates/pressure-washing/driveway-bold-stacked.tsx`
- Modify: `lib/server/poster-templates/registry.ts`
- Modify: `lib/poster-templates/public-metadata.ts`

- [ ] **Step 1: 新建模板文件**

新建 `lib/server/poster-templates/pressure-washing/driveway-bold-stacked.tsx`，完整内容：

```tsx
/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function GoldStars() {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          style={{ display: "flex" }}
        >
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

export const drivewayBoldStacked: RenderFn = (input: RenderInput) => {
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
      {/* ── Before photo (top) ── */}
      <div style={{ flex: 1.1, display: "flex", position: "relative" }}>
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
        {/* BEFORE pill — top-left */}
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
            BEFORE
          </span>
        </div>
      </div>

      {/* ── Middle headline band ── */}
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

        {/* Trust row: service area · licensed · insured  +  ★★★★★ N reviews */}
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
            {trustText.length > 0 && (
              <span style={{ display: "flex" }}>{trustText}</span>
            )}
            {trustText.length > 0 && hasReviews && (
              <span style={{ display: "flex" }}>·</span>
            )}
            {hasReviews && (
              <span
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <GoldStars />
                <span style={{ display: "flex" }}>
                  {input.googleReviewCount} Google reviews
                </span>
              </span>
            )}
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

      {/* ── After photo (bottom) ── */}
      <div style={{ flex: 1.1, display: "flex", position: "relative" }}>
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
        {/* AFTER pill — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 28,
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
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 注册新模板**

将 `lib/server/poster-templates/registry.ts` 替换为：

```typescript
import type { RenderFn } from "./shared/types";
import { driveWayHeroSplit } from "./pressure-washing/driveway-hero-split";
import { drivewayBoldStacked } from "./pressure-washing/driveway-bold-stacked";

const REGISTRY: Record<string, RenderFn> = {
  pressure_driveway_hero_split: driveWayHeroSplit,
  pressure_driveway_stacked: drivewayBoldStacked,
};

export function getRenderer(templateId: string): RenderFn | null {
  return REGISTRY[templateId] ?? null;
}

export function getRegisteredTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}
```

- [ ] **Step 3: 更新公开元数据**

将 `lib/poster-templates/public-metadata.ts` 替换为：

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
  {
    id: "pressure_driveway_stacked",
    name: "Driveway Bold Stacked",
    industry: "pressure_washing",
    channel: "instagram",
    layoutFamily: "stacked",
    photoPairCount: 1,
    previewImage: "/template-previews/pressure_driveway_stacked.webp",
  },
];

export function getTemplateById(id: string): BragoTemplateMeta | undefined {
  return POSTER_TEMPLATES.find((t) => t.id === id);
}
```

- [ ] **Step 4: 运行 registry 测试，确认全部通过**

```bash
pnpm test tests/lib/poster-registry.test.ts 2>&1 | tail -8
```

Expected:
```
Test Files  1 passed (1)
      Tests  5 passed (5)
```

- [ ] **Step 5: 提交**

```bash
git add \
  lib/server/poster-templates/pressure-washing/driveway-bold-stacked.tsx \
  lib/server/poster-templates/registry.ts \
  lib/poster-templates/public-metadata.ts \
  tests/lib/poster-registry.test.ts && \
git commit -m "feat: add Driveway Bold Stacked poster template (stacked layout)"
```

---

## Task 3: 全量验证

**Files:** 无改动，仅验证

- [ ] **Step 1: 运行全部测试**

```bash
pnpm test 2>&1 | tail -8
```

Expected:
```
Test Files  29 passed (29)
      Tests  107 passed (107)
```

（原有 105 个测试 + 新增 2 个 = 107）

- [ ] **Step 2: Lint 检查**

```bash
pnpm lint 2>&1
```

Expected: 无输出（0 errors，0 warnings）

- [ ] **Step 3: 类型检查**

```bash
pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 无输出（类型全部正确）

- [ ] **Step 4: 推送**

```bash
git push
```
