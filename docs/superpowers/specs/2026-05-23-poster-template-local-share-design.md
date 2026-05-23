# 海报模板：Local Job Share — 设计 Spec

日期: 2026-05-23
状态: 已批准

---

## 目标

新增第三个海报模板 `pressure_driveway_local_share`（Local Job Share），采用「顶部暖棕标题横幅 + 右上角深棕色块 + 左右各半照片区」布局，适合 Facebook / Nextdoor 的本地完工分享场景。

---

## 布局规格（1080 × 1080）

```
┌─────────────────────────────────────────┬─────────┐
│  Headline (44px bold #1A0C08)           │ ███████ │  ← 高 194px
│  Trust text (20px rgba(26,12,8,0.6))   │ ███████ │    背景 #C9A870
│                                         │ #4A2A18 │    色块宽 194px
├──────────────────────┬──────────────────┴─────────┤
│  [BEFORE]            │                            │  ↑ 高 ~230px
│  [SNAPSHOT]          │       After 照片            │    背景 #4A2A18
│  (居中，#C9A870)      │       全幅 cover            │
├──────────────────────┤                            │
│                      ├────────────────────────────┤
│  Before 照片          │  [AFTER]                   │  ↓ 高 ~230px
│  全幅 cover           │  [SNAPSHOT]                │    背景 #4A2A18
│                      │  (居中，#C9A870)             │
└──────────────────────┴────────────────────────────┘
                ↑ 中间白色竖线 3px
```

---

## 详细元素规格

### 顶部横幅（height: 194）

- 外层：`display:flex, flexDirection:row, height:194, background:"#C9A870"`
- 左区（flex:1）：`padding:"36px 40px"`, `flexDirection:column`, `justifyContent:center`
  - Headline：`fontSize:44, fontWeight:700, color:"#1A0C08", lineHeight:1.15, display:"flex", flexWrap:"wrap"`
  - Trust text（复用 buildTrustText 逻辑）：`fontSize:20, color:"rgba(26,12,8,0.6)", marginTop:10, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"`
  - Phone（可选）：`fontSize:18, color:"rgba(26,12,8,0.45)", marginTop:5, display:"flex"`
- 右区（深棕色块）：`width:194, background:"#4A2A18", flexShrink:0`

### 左列（flex:1，右侧白线 3px）

**BEFORE 标签区**（height: 230, flexShrink:0）
- `background:"#4A2A18"`, `display:"flex"`, `flexDirection:"column"`, `alignItems:"center"`, `justifyContent:"center"`, `gap:8`
- 主标签：JetBrains Mono，`fontSize:28`, `fontWeight:700`, `color:"#C9A870"`, `letterSpacing:3.5`, `textTransform:"uppercase"`, `display:"flex"`
- 副标签：JetBrains Mono，`fontSize:15`, `color:"rgba(201,168,112,0.65)"`, `letterSpacing:2.5`, `textTransform:"uppercase"`, `display:"flex"`
- 内容：`"BEFORE"` / `"SNAPSHOT"`

**Before 照片区**（flex:1）
- `<img>` position:absolute，全幅 objectFit:cover

### 右列（flex:1）

**After 照片区**（flex:1）
- `<img>` position:absolute，全幅 objectFit:cover

**AFTER 标签区**（height: 230, flexShrink:0）
- 同 BEFORE 标签区规格，内容改为 `"AFTER"` / `"SNAPSHOT"`

---

## Trust Text 逻辑（与现有模板完全一致）

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

Trust text 包含 GoldStars 组件（`fill:"#FFD63A"`，同现有模板）。

---

## 文件改动

```
新建  lib/server/poster-templates/pressure-washing/driveway-local-share.tsx
修改  lib/server/poster-templates/registry.ts          注册新模板
修改  lib/poster-templates/public-metadata.ts          添加元数据
修改  tests/lib/poster-registry.test.ts               扩展测试（2 个新 it）
```

## 模板元数据

```typescript
{
  id: "pressure_driveway_local_share",
  name: "Local Job Share",
  industry: "pressure_washing",
  channel: "facebook_nextdoor",
  layoutFamily: "split",
  photoPairCount: 1,
  previewImage: "/template-previews/pressure_driveway_local_share.webp",
}
```

---

## 成功标准

- `pnpm test` 全绿（107 → 109 个测试）
- `pnpm lint` 0 warnings
- `/create` 页出现第三个模板选项"Local Job Share"
- 生成的 PNG：顶部暖棕横幅 + 右上深棕色块 + 左 Before（上标签/下照片）/ 右 After（上照片/下标签）
