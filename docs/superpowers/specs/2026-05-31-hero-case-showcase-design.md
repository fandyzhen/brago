# Hero Case Showcase — 多案例排版重设计

**作者**：fandyzhen / Claude
**日期**：2026-05-31
**状态**：approved-by-user-decision（"你自己决定"授权）

## 背景与问题

`components/hero.tsx:137-183` 的 proof 卡片当前只承载 **1** 张 Park Slope 灶台案例。桌面端这块占据 max-w-md（28rem，约 448px）居中，左右两侧大量留白，视觉上"太空"且单一案例难以传达"Brago 适用各行各业"的信号。

`research/source-photos/` 已落地 21 对真实 before/after 素材（cleaning 7 / pressure-washing 8 / auto-detailing 6），完全可以喂给项目现成的 `composeProofImage` 流水线（`lib/brago/compose/proof-image.ts`）生成多张同规格 1200×900 证明图，与现有 `public/hero/proof.jpg` 一致。

## 目标

1. **桌面端**：把这块从单卡升级成多案例展示区，主卡保持完整三段式 caption 不阉割，配 4 张副卡支撑"全行业适用"叙事。
2. **移动端**：禁止竖向堆叠（会拖长首屏）；改为单卡横向 snap-scroll 轮播 + 圆点指示器。
3. **图片真实**：5 张证明图全部由项目自己的 `composeProofImage` 从真实 before/after 对生成，不用占位图、不用 AI 生成图。
4. **文案真实**：每张 caption 遵循现有结构（neighborhood + 业务标题 / 价值描述 / Call CTA），通过 caption 政策硬性 gate（无电话/URL/em-dash/AI 套话）。

## 非目标

- 不动 Hero 上半段（badge / H1 / subtitle / CTA / 三步条）。
- 不引入 carousel 第三方依赖（embla-carousel / swiper 都 over-kill），用原生 CSS `scroll-snap` + `useRef`/`IntersectionObserver`。
- 不做自动轮播（autoplay）——服务行业 owner 的注意力是稀缺资源，让他们自己选；自动滚也会被无障碍工具标记。
- 不做缩略图 hover 预加载主图——5 张图总大小 ~500KB，Next/Image priority + lazy 即可。

## 架构

### 数据层

新增 `lib/hero/cases.ts`：

```ts
export type HeroCase = {
  id: string;                 // url-safe slug，也是文件名
  industry: "cleaning" | "pressure-washing" | "auto-detailing";
  industryLabel: string;      // 显示用，如 "Cleaning"
  imagePath: string;          // /hero/cases/{id}.jpg
  alt: string;                // 完整 alt（无障碍）
  title: string;              // caption 第一行（粗体）
  body: string;               // caption 正文，必须含 Call CTA
  overlay: { line1: string; line2: string }; // 喂给 buildOverlayText
};

export const HERO_CASES: HeroCase[] = [/* 5 项 */];
```

5 个案例（locked-in）：

| id | 行业 | 素材源 | overlay | caption title |
|---|---|---|---|---|
| `park-slope-kitchen` | cleaning | `cleaning/stovetop-{before,after}.jpg` | "Park Slope" / "Deep Clean" | Park Slope kitchen, fresh by lunch |
| `austin-driveway` | pressure-washing | `pressure-washing/driveway-01-{before,after}.jpg` | "Austin" / "Driveway Wash" | Austin driveway, curb appeal back |
| `bellevue-siding` | pressure-washing | `pressure-washing/house-siding-{before,after}.jpg` | "Bellevue" / "Siding Wash" | Bellevue siding, like-new in 3 hours |
| `denver-suv-interior` | auto-detailing | `auto-detailing/dodge-journey-interior-{before,after}.jpg` | "Denver" / "Interior Detail" | Denver SUV interior, like-new |
| `chicago-range-hood` | cleaning | `cleaning/range-hood-{before,after}.jpg` | "Chicago" / "Range Hood" | Chicago range hood, grease-free overnight |

地名是合成的（与项目当前 Park Slope 灶台同款做法——overlay 走"city + service" 3-5 words upper 的 spec §1.4 规则）。

### 图片生成脚本

新增 `scripts/generate-homepage-cases.ts`（参照 `scripts/generate-homepage-hero.ts:1-61` 模板）：

- 输入：`research/source-photos/{industry}/{slug}-{before,after}.jpg`
- 流程：`composeProofImage` → `validateOutputImage` 闸门 → 写 `public/hero/cases/{id}.jpg`
- 一次跑完 5 张，任一失败抛错（CI 不会跑这个脚本，本地一次性 dogfood）
- README 注释：素材是 gitignored 第三方版权内容；生成出的 1200×900 证明图是 Brago 流水线 derived works，本仓库 ship 这 5 张 jpg。

执行命令：
```bash
NODE_OPTIONS=--conditions=react-server npx tsx scripts/generate-homepage-cases.ts
```

### 组件层

把 `components/hero.tsx` 末尾的单卡块（行 137-183）抽成新组件 `components/hero-case-showcase.tsx`。Hero 主组件只 import 一行。

`HeroCaseShowcase` 结构：

```
<section role="region" aria-label="Brago case showcase">
  {/* DESKTOP — md:↑：左 spotlight + 右缩略竖排 */}
  <div className="hidden md:grid md:grid-cols-[1fr_18rem] md:gap-6 ...">
    <SpotlightCard case={cases[active]} />          {/* 主卡：图 + 完整 caption */}
    <ThumbColumn cases={cases} active={active} onSelect={setActive} />
  </div>

  {/* MOBILE — md:↓：横向 snap carousel */}
  <div className="md:hidden">
    <div ref={trackRef} className="flex snap-x snap-mandatory overflow-x-auto ...">
      {cases.map(c => <SpotlightCard key={c.id} case={c} className="snap-center w-[88vw] flex-none" />)}
    </div>
    <DotIndicator total={5} active={mobileIndex} onSelect={scrollToIndex} />
  </div>
</section>
```

- **SpotlightCard**：复用现有 proof.jpg 卡片的 DOM（图 + Google-ready 条 + caption 区），从 props 取数据。`max-w-2xl` 替代当前 `max-w-md`——桌面端宽度由父 grid 控制；移动端由 `w-[88vw]` 控制。
- **ThumbColumn**（仅桌面）：4 张副卡（去掉当前 active 的那张）竖排，每张 aspect 4:3、缩略图 + 单行 city + industry chip，点击 setActive。selected 状态有 brand-color 边框。
- **DotIndicator**（仅移动）：5 个 ~8px 圆点，当前激活的拉成胶囊（w-6 rounded-full bg-brand），点击跳转到对应卡片。

### 移动端交互细节

- `scroll-snap-type: x mandatory` + `scroll-snap-align: center` ——iOS/Android 原生触屏体验，无 JS 卡顿。
- 圆点 active 状态：在轨道上挂 `IntersectionObserver`（threshold 0.6），哪张卡片最大可见度 → 哪个圆点高亮。SSR 安全：组件挂载后 `useEffect` 再启动 observer。
- 圆点点击 → `el.scrollTo({ left: index * cardWidth, behavior: "smooth" })`。
- 卡片左右两边的 padding：第一张前面 + 最后一张后面各 6vw padding，保证 snap-center 把它们居中。

### 桌面端切换交互

- `useState<number>(0)` 管 `active`。
- 缩略图 button 角色 + `aria-pressed`。
- 切换主卡时 framer-motion fade（200ms），不要 layout shift。
- 主卡图片用 `priority` 仅给 `cases[0]`，其余 `loading="eager"` + `sizes` 指定，让浏览器在闲时预取。

## 文件清单

**新增**
- `lib/hero/cases.ts` — 5 个 HeroCase 数据
- `scripts/generate-homepage-cases.ts` — 一次性生成 5 张证明图
- `components/hero-case-showcase.tsx` — 桌面 + 移动双布局组件
- `public/hero/cases/{park-slope-kitchen,austin-driveway,bellevue-siding,denver-suv-interior,chicago-range-hood}.jpg` — 生成产物（5 个）

**修改**
- `components/hero.tsx` — 删除行 133-183 单卡块，换成 `<HeroCaseShowcase />`，import 加一行
- 不动 `messages/en.json` 的 `hero.*` 文案（标题/副标题/CTA 都不变），新增 cases 的文案直接写在 `lib/hero/cases.ts` 里（仅英文，符合项目 i18n 现状）

**不动**
- `lib/brago/compose/proof-image.ts`、`lib/brago/compose/overlay.ts`、`lib/brago/compose/gates.ts`
- `public/hero/proof.jpg` 暂时保留（向后兼容；下一轮可删）

## 测试

- 单元测试：`tests/lib/hero-cases.test.ts` — 断言 5 个案例的 caption 通过 `caption/policy.ts` 所有硬性 gate（无电话/URL/em-dash/blacklist），title 在 30-60 字符范围。
- 视觉测试：本地 `pnpm dev` → 桌面 1440px、移动 iPhone 12 (390px) 各截一张。
- 无障碍：缩略图 button 有 `aria-pressed`，圆点 button 有 `aria-label="Show case 2 of 5"`。

## 风险

| 风险 | 缓解 |
|---|---|
| 5 张图首屏带宽 | 主图 priority、副图 lazy；目标 5×~80KB = ~400KB；jpg quality 80 |
| 横向 snap 在某些老 Android Chrome 抖动 | scroll-snap 是 baseline 2019 特性，可接受；fallback 是普通横滚 |
| 缩略图点击切主卡时图片闪烁 | framer fade + 主卡保持固定高度（aspect 4:3）防 CLS |
| 移动端 88vw 卡片在超宽屏（>500px）反而显小 | 加 `max-w-md` 上限 |

## 实施分阶段

1. **Phase 1**：建数据 + 跑生成脚本 + 落地 5 张 jpg（不动 UI）。提交。
2. **Phase 2**：抽 `HeroCaseShowcase` 组件 + 接 Hero。本地手测桌面 + 移动。提交。
3. **Phase 3**：单元测试 + caption 政策断言。提交。
