# 统一创作流程 — 一条 funnel、按身份解锁

**作者**：fandyzhen / Claude
**日期**：2026-05-31
**状态**：approved-by-user-decision（"A 方案 + 你自己决定"）

## 背景

当前两条流程并存，体验割裂：

| 路径 | 谁用 | 表单字段 | 结果页 |
|---|---|---|---|
| `/free-google-post-generator` | 匿名 | industry + tone + location + photos + consent | 图 + caption + **4 个 locked 按钮** + 主 Unlock CTA |
| `/create` | 登录用户 | industry + **serviceType 下拉** + **serviceArea 输入** + photos + consent | 跳到 `/posts/[id]` 详情页（与匿名版完全不同的 UI） |

且 `/free-google-post-generator` 顶层有一行 `if (access.ok) redirect("/create")`——登录用户强制被踢走。

## 目标

1. **一条 funnel**：所有人（匿名 / 注册 / 付费）走 `/free-google-post-generator` 同一页，看同一表单、同一结果页。
2. **解锁矩阵（方案 A）**：
   - 匿名 → 4 按钮全锁，点击弹 SignupModal
   - 注册（含免费）→ 4 按钮**全开**
   - 付费 → 同上，差异仅在次数（订阅周期补 credits）
3. **次数控制**：
   - 匿名 → `useTrialState` 沿用
   - 注册/付费 → 走 `lib/credits.ts` 现有积分系统（caption 10 积分等）
4. **`/create` 退役**：删除页面，所有内部链接改向 `/free-google-post-generator`。

## 架构

### 入口判定（page.tsx）

`app/[locale]/(marketing)/free-google-post-generator/page.tsx`：
- **删除** 行 30-33 的 `if (access.ok) redirect("/create")`
- 把 `isLoggedIn = !!access?.ok` 作为 prop 传给 client

### 客户端分支（client.tsx）

`FreeGeneratorClient` 接 `{ isLoggedIn: boolean }`，内部用一个 `endpoints` 对象封装 anonymous vs authed API：

```ts
const endpoints = isLoggedIn ? {
  createPost: "/api/brago/google-posts",
  uploadPhoto: (postId) => `/api/brago/google-posts/${postId}/photos/upload`,
  analyze:     (postId) => `/api/brago/google-posts/${postId}/analyze`,
  caption:     (postId) => `/api/brago/google-posts/${postId}/generate-caption`,
  rewrite:     (postId) => `/api/brago/google-posts/${postId}/rewrite`,
  renderPhoto: (postId) => `/api/brago/google-posts/${postId}/render-photo`,
  needsAnonId: false,
  needsConsentInBody: true,   // hasMarketingPermission: true
} : {
  createPost: "/api/brago/anonymous/google-posts",
  uploadPhoto: () => "/api/brago/anonymous/upload",
  analyze:     (postId) => `/api/brago/anonymous/google-posts/${postId}/analyze`,
  caption:     (postId) => `/api/brago/anonymous/google-posts/${postId}/generate-caption`,
  rewrite:     null,          // 匿名无 regen API；锁按钮即可
  renderPhoto: null,          // 匿名无 download API；锁按钮即可
  needsAnonId: true,
  needsConsentInBody: false,
};
```

调用处把 `anonId` 字段在 authed 模式下省略。

### 4 个按钮的实际行为

| 按钮 | 匿名 | 登录态实现 |
|---|---|---|
| **Copy** | 锁 → SignupModal | `navigator.clipboard.writeText(result.caption)` + 显示 "Copied" 2s |
| **Download** | 锁 → SignupModal | `POST endpoints.renderPhoto(postId)` → 浏览器把 blob 触发下载为 `brago-post-{shortId}.jpg` |
| **Spanish** | 锁 → SignupModal | 调 `caption` 端点带 `language: "es"`，结果替换当前 caption（toggle 状态：再点切回 EN）|
| **Regen** | 锁 → SignupModal | 调 `rewrite` 端点 → 拿新 caption 替换 |

每个按钮有 `pending` 态（loading spinner）+ `error` 态（红字一行）。

### `/create` 退役

**删除**：
- `app/[locale]/(protected)/create/page.tsx`
- `app/[locale]/(protected)/create/_legacy-multi-area.tsx.bak`

**改链接**（全替换为 `/free-google-post-generator`）：
- `app/[locale]/(protected)/posts/page.tsx:46,57`
- `app/[locale]/(protected)/dashboard/page.tsx:130` (router.push)
- `app/[locale]/(protected)/history/page.tsx:45,177,207`
- `features/navigation/components/user-menu.tsx:129`
- `features/brago/dashboard/recent-google-posts.tsx:43`

## 文件清单

**新增**：无（复用现有 endpoints）

**修改**：
- `app/[locale]/(marketing)/free-google-post-generator/page.tsx` — 删除 redirect、传 isLoggedIn
- `app/[locale]/(marketing)/free-google-post-generator/client.tsx` — 接 isLoggedIn、endpoints 抽象、4 按钮真实化
- 上述 5 处链接文件

**删除**：
- `app/[locale]/(protected)/create/` 整目录

## 风险与权衡

| 风险 | 处理 |
|---|---|
| 登录用户失去 serviceType / serviceArea 精细控制 | location 文本框保留（喂给 caption policy），serviceType 用 industry 默认值（`DEFAULT_SERVICE_TYPE`）。这是"统一"的代价，符合简化原则 |
| `/posts/[id]` 详情页本是 /create 提交后的目的地，统一后是否还能访问？ | 详情页本身独立存在，从 history 可访问；只是入口变了。不删 |
| 已书签 `/create` 的用户 404 | 加一个 `app/[locale]/(protected)/create/page.tsx` 的极简 redirect → `/free-google-post-generator`（保 backward compat） |
| anonymous 端点没有 rewrite/render-photo | 匿名状态下按钮就是锁的，本来就不调；问题不存在 |
| Spanish 切换后再点变回 EN 的 toggle 状态管理 | 用 `displayLanguage` state（独立于初始 `language`），按钮文案随之切换 |

## 测试

- 手测 1：匿名跑完一次 → 看到 4 锁按钮 + 主 CTA → 点任意 → SignupModal 弹起
- 手测 2：登录跑完一次 → 看到 4 开按钮 → Copy 写剪贴板 → Download 触发文件下载 → Spanish 切 ES caption → Regen 出新 caption
- 自动：单元测试有限——主要是端点 mapping 的正确性；不强求 e2e

## 实施阶段

1. **Phase 1**：page.tsx + client.tsx 接 isLoggedIn + endpoints 抽象（按钮先保持锁定 UI，但行为绑端点）— 提交
2. **Phase 2**：4 按钮真实功能（Copy / Download / Spanish / Regen）— 提交
3. **Phase 3**：`/create` 退役 + 链接全替换 — 提交
