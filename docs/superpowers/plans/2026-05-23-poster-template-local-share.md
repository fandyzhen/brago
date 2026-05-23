# Local Job Share 模板 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第三个海报模板 `pressure_driveway_local_share`（Local Job Share），顶部暖棕横幅 + 右上角深棕色块 + 左右各半（Before 上标签下照片 / After 上照片下标签）。

**Architecture:** 新建模板 TSX，注册 registry，更新 public-metadata，扩展 registry 测试。与现有模板共享 RenderInput 接口、GoldStars、buildTrustText，无新依赖。

**Tech Stack:** React (satori JSX inline styles)、TypeScript、Vitest

---

## 文件结构

| 文件 | 操作 |
|---|---|
| `lib/server/poster-templates/pressure-washing/driveway-local-share.tsx` | 新建 |
| `lib/server/poster-templates/registry.ts` | 修改 |
| `lib/poster-templates/public-metadata.ts` | 修改 |
| `tests/lib/poster-registry.test.ts` | 修改 |

---

## Task 1: 写失败测试

**Files:** Modify `tests/lib/poster-registry.test.ts`

- [ ] **Step 1: 追加 2 个新 it 块**

将 `tests/lib/poster-registry.test.ts` 替换为：

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

  it("contains the local share pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_local_share");
  });

  it("returns a render function for pressure_driveway_local_share", () => {
    const renderer = getRenderer("pressure_driveway_local_share");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });
});
```

- [ ] **Step 2: 确认 2 个新测试失败**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/poster-registry.test.ts 2>&1 | tail -8
```

Expected: 2 个新 it FAIL，原有 5 个 PASS。

---

## Task 2: 实现模板 + 注册 + 更新元数据

**Files:** 新建模板 tsx + 修改 registry + 修改 public-metadata

- [ ] **Step 1: 新建模板文件**

新建 `lib/server/poster-templates/pressure-washing/driveway-local-share.tsx`：

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

// Brand colors for this template
const WARM_TAN = "#C9A870";
const DARK_BROWN = "#4A2A18";
const HEADER_TEXT = "#1A0C08";

export const drivewayLocalShare: RenderFn = (input: RenderInput) => {
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
        background: WARM_TAN,
      }}
    >
      {/* ── Top header bar ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: 194,
          flexShrink: 0,
          background: WARM_TAN,
        }}
      >
        {/* Left: headline + trust */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "36px 40px",
          }}
        >
          {/* Headline */}
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: HEADER_TEXT,
              lineHeight: 1.15,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {input.headline}
          </div>

          {/* Trust row */}
          {hasTrust && (
            <div
              style={{
                fontSize: 20,
                color: "rgba(26,12,8,0.6)",
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
                fontSize: 18,
                color: "rgba(26,12,8,0.45)",
                marginTop: 5,
                display: "flex",
              }}
            >
              {input.phone}
            </div>
          )}
        </div>

        {/* Right: dark brown accent square */}
        <div
          style={{
            width: 194,
            flexShrink: 0,
            background: DARK_BROWN,
          }}
        />
      </div>

      {/* ── Bottom: Left / Right split ── */}
      <div style={{ flex: 1, display: "flex" }}>

        {/* Left column: BEFORE label (top) + Before photo (bottom) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: `3px solid #ffffff`,
          }}
        >
          {/* BEFORE label area */}
          <div
            style={{
              height: 230,
              flexShrink: 0,
              background: DARK_BROWN,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 28,
                fontWeight: 700,
                color: WARM_TAN,
                letterSpacing: 3.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              BEFORE
            </span>
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 15,
                color: "rgba(201,168,112,0.65)",
                letterSpacing: 2.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              SNAPSHOT
            </span>
          </div>

          {/* Before photo */}
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
          </div>
        </div>

        {/* Right column: After photo (top) + AFTER label (bottom) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* After photo */}
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
          </div>

          {/* AFTER label area */}
          <div
            style={{
              height: 230,
              flexShrink: 0,
              background: DARK_BROWN,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 28,
                fontWeight: 700,
                color: WARM_TAN,
                letterSpacing: 3.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              AFTER
            </span>
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 15,
                color: "rgba(201,168,112,0.65)",
                letterSpacing: 2.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              SNAPSHOT
            </span>
          </div>
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
import { drivewayLocalShare } from "./pressure-washing/driveway-local-share";

const REGISTRY: Record<string, RenderFn> = {
  pressure_driveway_hero_split: driveWayHeroSplit,
  pressure_driveway_stacked: drivewayBoldStacked,
  pressure_driveway_local_share: drivewayLocalShare,
};

export function getRenderer(templateId: string): RenderFn | null {
  return REGISTRY[templateId] ?? null;
}

export function getRegisteredTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}
```

- [ ] **Step 3: 更新 public-metadata.ts**

将 `lib/poster-templates/public-metadata.ts` 替換为：

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
  {
    id: "pressure_driveway_local_share",
    name: "Local Job Share",
    industry: "pressure_washing",
    channel: "facebook_nextdoor",
    layoutFamily: "split",
    photoPairCount: 1,
    previewImage: "/template-previews/pressure_driveway_local_share.webp",
  },
];

export function getTemplateById(id: string): BragoTemplateMeta | undefined {
  return POSTER_TEMPLATES.find((t) => t.id === id);
}
```

- [ ] **Step 4: 运行测试，确认 7 个全绿**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/poster-registry.test.ts 2>&1 | tail -6
```

Expected: `Tests 7 passed (7)`

- [ ] **Step 5: 提交**

```bash
cd /Volumes/FZD/开发项目/Brago && git add \
  lib/server/poster-templates/pressure-washing/driveway-local-share.tsx \
  lib/server/poster-templates/registry.ts \
  lib/poster-templates/public-metadata.ts \
  tests/lib/poster-registry.test.ts && \
git commit -m "feat: add Local Job Share poster template (warm tan header, split layout)"
```

---

## Task 3: 全量验证 + 推送

- [ ] **Step 1: 全量测试**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test 2>&1 | tail -6
```

Expected: `Tests 109 passed (109)`（107 + 2 新增）

- [ ] **Step 2: Lint**

```bash
pnpm lint 2>&1
```

Expected: 无输出

- [ ] **Step 3: 推送**

```bash
git push
```
