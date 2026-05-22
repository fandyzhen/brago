# 海报渲染基础设施 — 设计 Spec

日期: 2026-05-22
状态: 已批准

---

## 目标

搭建 server-only 海报渲染基础设施，实现第一张 1080×1080 PNG 的端到端生成：
用户上传 before/after 照片 + 填写标题 → API 返回 PNG 文件。

---

## 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| JSX → SVG | satori | 轻量、server-only、Next.js 生态标准 |
| SVG → PNG | sharp（已安装） | 高质量压缩，可做图像后处理 |
| 图片输入 | multipart form upload | 一步完成，不依赖 R2 |
| 图片输出 | 直接返回 PNG 字节流 | MVP 不需要 R2，零额外环境变量 |

不选 @vercel/og（灵活性不足），不选 Puppeteer（二进制包过大，Vercel 不支持）。

---

## 新增包

- `satori` — 需要安装

---

## 目录结构

```
lib/server/poster-templates/          # 全部 server-only，禁止 client import
  shared/
    types.ts                          # BragoTemplateMeta、TemplateProps、RenderInput 类型
    image-utils.ts                    # File/Buffer → base64 data URL 工具函数
    label.tsx                         # BEFORE/AFTER pill 标签组件（satori inline style）
    trust-bar.tsx                     # 底部信息条组件（名称/电话/服务区域/徽章）
  pressure-washing/
    driveway-hero-split.tsx           # 第一个模板
  registry.ts                         # templateId → RenderFn 映射

lib/poster-templates/public-metadata.ts   # 只含 metadata，无渲染逻辑，可被 client import

app/api/posters/
  render/route.ts                     # POST multipart → PNG

public/fonts/
  inter-regular.ttf                   # Satori 字体（下载自 Google Fonts）
  jetbrains-mono-regular.ttf          # 标签字体（下载自 JetBrains）
```

---

## 第一个模板：driveway-hero-split

**ID:** `pressure_driveway_hero_split`
**渠道:** Google Business Profile
**行业:** Pressure Washing
**尺寸:** 1080 × 1080 px
**布局（用户选定 C 方案）:**

```
┌─────────────────────────────────┐
│                                 │
│     AFTER 照片（全幅大图）        │
│                                 │
│  ┌────────┐                     │
│  │ BEFORE │  ← 左下角缩略图      │
│  │ 缩略图  │    占 30% 宽         │
│  └────────┘                     │
│─────────────────────────────────│
│ 标题文字  (黑底白字信息条)         │
│ 服务区域 · Licensed · Insured    │
│ 电话号码                         │
└─────────────────────────────────┘
```

**标签位置:** AFTER 标签在大图左上角，BEFORE 标签在缩略图左上角（pill 样式）

**可选字段（未填则隐藏）:**
- `phone` — 电话号码
- `serviceArea` — 服务区域（如 "Serving Austin, TX"）
- `isLicensed` / `isInsured` — 显示 "Licensed · Insured"
- `googleReviewCount` — 显示 "★★★★★ 247 Google reviews"

---

## API 设计

### `POST /api/posters/render`

**Content-Type:** `multipart/form-data`

**表单字段:**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `beforeImage` | File | ✅ | before 照片（JPG/PNG/WebP，最大 10MB） |
| `afterImage` | File | ✅ | after 照片 |
| `templateId` | string | ✅ | 模板 ID，如 `pressure_driveway_hero_split` |
| `headline` | string | ✅ | 标题文字，最大 36 字符 |
| `businessName` | string | | 商家名称 |
| `phone` | string | | 电话号码 |
| `serviceArea` | string | | 服务区域 |
| `isLicensed` | string (`"true"`) | | 是否持牌 |
| `isInsured` | string (`"true"`) | | 是否投保 |
| `googleReviewCount` | string (数字) | | Google 评价数量 |

**成功响应:**
- Status: 200
- Content-Type: `image/png`
- Body: PNG 字节流（1080×1080）
- Header: `Content-Disposition: attachment; filename="brago-post.png"`

**错误响应:**
- 400: 缺少必填字段 / 文件过大 / 模板 ID 不存在
- 500: 渲染失败

---

## 类型定义（核心）

```typescript
// lib/server/poster-templates/shared/types.ts

export type RenderInput = {
  beforeImageDataUrl: string;   // "data:image/jpeg;base64,..."
  afterImageDataUrl: string;
  templateId: string;
  headline: string;
  businessName?: string;
  phone?: string;
  serviceArea?: string;
  isLicensed?: boolean;
  isInsured?: boolean;
  googleReviewCount?: number;
};

export type RenderFn = (input: RenderInput) => React.ReactElement;

export type BragoTemplateMeta = {
  id: string;
  name: string;
  industry: "pressure_washing" | "auto_detailing";
  channel: "google_business_profile" | "facebook_nextdoor" | "instagram";
  layoutFamily: "split" | "hero_photo" | "stacked" | "collage";
  photoPairCount: 1 | 2 | 3 | 4;
  previewImage: string;   // 公开 URL，用于前端展示
};
```

---

## 渲染流程

```
POST /api/posters/render
  ↓
验证字段（templateId 存在、图片大小合法）
  ↓
读取 before/after File → arrayBuffer → base64 data URL
  ↓
registry.getRenderer(templateId)(renderInput) → ReactElement
  ↓
satori(element, { width: 1080, height: 1080, fonts: [...] }) → SVG string
  ↓
sharp(Buffer.from(svg)).png({ quality: 90 }) → PNG buffer
  ↓
Response(pngBuffer, { headers: { "Content-Type": "image/png" } })
```

---

## 字体方案

Satori 需要字体 buffer，不能读取系统字体。

- **Inter Regular** — 标题和正文（Google Fonts 下载，保存到 `public/fonts/`）
- **JetBrains Mono Regular** — BEFORE/AFTER 标签（JetBrains 下载）

字体在 API 路由 cold start 时一次性加载，缓存到模块级变量（避免每次请求重复读文件）。

---

## 不在本阶段做的事

- 水印（免费用户）— 后续迭代
- 图片亮度/色温标准化 — 后续迭代
- 保存到 R2 / 历史记录 — 下一个 spec
- 多组 before/after（collage 模式）— 下一个 spec
- 其他模板 — 下一个 spec
- 积分扣除 — 下一个 spec（渲染基础先跑通）

---

## 成功标准

- `pnpm test` 全绿（新增渲染相关单元测试）
- 调用 API 传入两张真实照片 + 标题 → 返回 PNG
- PNG 在浏览器/Finder 预览中能看出 after 大图 + before 缩略图 + 底部信息条
- `pnpm lint` 0 warning
- TypeScript 无新增错误
