# 海报模板扩展：Driveway Bold Stacked — 设计 Spec

日期: 2026-05-23
状态: 已批准

---

## 目标

在现有 `pressure_driveway_hero_split` 模板基础上，新增第二个海报模板 `pressure_driveway_stacked`。

新模板使用"上 Before / 中 Headline 横幅 / 下 After"三段式布局，与现有模板共享同一套字体、颜色和 RenderInput 接口，零新依赖，零 schema 变更。

---

## 核心决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 新模板数量 | 1 个 | YAGNI；先做好一个再扩展 |
| 布局 | 三段式 Stacked | 上下对比直观，适合 Instagram 信息流 |
| 配色 | 纯黑横幅 #111111 | 与现有模板风格一致，无需引入新颜色变量 |
| 字体 | Inter + JetBrains Mono | 复用已加载字体，无额外开销 |
| 测试 | 扩展现有 poster-registry.test.ts | 遵循现有模式，不新建文件 |

---

## 布局规格

```
1080 × 1080 px，fontFamily: "Inter"，background: #111111

┌─────────────────────────────────────┐
│  [BEFORE pill: 左上角]               │  flex: 1.1（约 43% 高）
│                                     │  beforeImageDataUrl 全幅 cover
│                                     │
├─────────────────────────────────────┤
│  Headline 大字（44px bold #fff）     │  padding: 28px 36px 32px
│  Trust text（20px rgba白 0.55）      │  background: #111111
│  Phone（20px rgba白 0.40）           │
├─────────────────────────────────────┤
│                                     │  flex: 1.1（约 43% 高）
│                                     │  afterImageDataUrl 全幅 cover
│               [AFTER pill: 右下角]   │
└─────────────────────────────────────┘
```

### 详细元素规格

**Before 区域（上）**
- 图片：`position:absolute` 全幅 `objectFit:cover`
- BEFORE pill：左上角 `top:28 left:28`，`background:rgba(0,0,0,0.72)`，`color:#fff`，`padding:5px 14px`，`borderRadius:24`，JetBrains Mono，15px，letterSpacing 2.5，UPPERCASE

**中间横幅**
- `background:#111111`，`color:#fff`，`padding:28px 36px 32px`，`flexDirection:column`
- Headline：`fontSize:44`，`fontWeight:700`，`lineHeight:1.15`，`color:#fff`，`flexWrap:wrap`
- Trust text（复用 `buildTrustText` 逻辑）：`fontSize:20`，`color:rgba(255,255,255,0.55)`，`marginTop:10`，含 GoldStars 组件
- Phone：`fontSize:20`，`color:rgba(255,255,255,0.40)`，`marginTop:5`

**After 区域（下）**
- 图片：`position:absolute` 全幅 `objectFit:cover`
- AFTER pill：右下角 `bottom:28 right:28`，同 BEFORE pill 样式（字号 15px，letterSpacing 2.5）

### buildTrustText 逻辑（与现有模板完全相同）

```typescript
function buildTrustText(input: RenderInput): string {
  const parts: string[] = [];
  if (input.serviceArea) parts.push(input.serviceArea);
  if (input.isLicensed && input.isInsured) parts.push("Licensed · Insured");
  else if (input.isLicensed) parts.push("Licensed");
  else if (input.isInsured) parts.push("Insured");
  return parts.join(" · ");
}
```

---

## 新增文件

```
lib/server/poster-templates/pressure-washing/driveway-bold-stacked.tsx   新建
```

## 修改文件

```
lib/server/poster-templates/registry.ts          注册 pressure_driveway_stacked
lib/poster-templates/public-metadata.ts          添加模板元数据
tests/lib/poster-registry.test.ts               扩展注册表测试（2 个新 it）
```

---

## 模板元数据

```typescript
{
  id: "pressure_driveway_stacked",
  name: "Driveway Bold Stacked",
  industry: "pressure_washing",
  channel: "instagram",
  layoutFamily: "stacked",
  photoPairCount: 1,
  previewImage: "/template-previews/pressure_driveway_stacked.webp",
}
```

（previewImage 为占位路径，实际 webp 由后续资产生成流程提供；前端 fallback 已有处理）

---

## 测试覆盖

扩展 `tests/lib/poster-registry.test.ts`：

```typescript
it("contains the stacked pressure washing template", () => {
  expect(getRegisteredTemplateIds()).toContain("pressure_driveway_stacked");
});

it("returns a render function for pressure_driveway_stacked", () => {
  const renderer = getRenderer("pressure_driveway_stacked");
  expect(renderer).not.toBeNull();
  expect(typeof renderer).toBe("function");
});
```

不需要渲染快照测试——现有 `posters-render.test.ts` 已通过 mock 覆盖 render 路由，单模板的像素级输出由 satori + sharp 保证，不在单元测试范围。

---

## 不在本次 Spec 范围内

- previewImage WebP 资产的生成（需要实际渲染后截图）
- 第三个或更多模板
- auto_detailing 行业模板
- 模板预览图在 `/create` 页面的展示优化

---

## 成功标准

- `pnpm test` 全绿（新增 2 个测试，原有 105 个测试不受影响）
- `pnpm lint` 0 warnings
- `/create` 页面的模板选择器中出现"Driveway Bold Stacked"作为第二选项
- 生成的 PNG：1080×1080，三段式布局，BEFORE/AFTER pill 位置正确，标题横幅显示 headline + trust + phone
