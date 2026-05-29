# Brago 上线前 must-do 清单

> **使用说明**：用户说"准备上线了"/"上线前检查"/"现在能上吗" → Claude 必须读这个文件，逐项核对，告诉用户：
> 1. 还有哪些代码 / 配置 / 集成没完成
> 2. 哪些需要用户提供 API key 或第三方账号才能继续
> 3. 哪些测试还没跑通
>
> **更新规则**：每次发现新的"上线前必须搞定的事"就追加到这个文件；做完一项就标 `✅` 不要删除（保留历史）。

---

## P0 Google-Ready Posts 发布前必做（2026-05-29 重设计后）

### G1 — 外部 AI / 存储 / 邮件 key
- [ ] `VOLCANO_ENGINE_API_KEY` 填生产 key（缺失时 Brago 走 fallback：手动选 best after + 模板 caption，UI 已提示 "Photo AI not connected"）
- [ ] `VOLCANO_ENGINE_VISION_MODEL`（或 `BRAGO_VISION_MODEL`）选实际模型名（spec 14.2 要求当天查官方文档）
- [ ] `VOLCANO_ENGINE_TEXT_MODEL` 同上
- [ ] 全套 `STORAGE_*` R2 变量配生产 bucket 和公网域名（缺失时 upload 路径自动 fall-back 到 data URL，性能差但能跑通）
- [ ] `RESEND_API_KEY` 切真 key + verified `RESEND_FROM_EMAIL`
- [ ] `BRAGO_CAPTION_CREDIT_COST` / `BRAGO_REWRITE_CREDIT_COST` 调成业务目标值（默认 1，AI 调用时扣，fallback 不扣）

### G2 — Creem 产品 ID（新 plan key）
- [ ] 在 Creem 控制台新建两个订阅产品：`Brago Local Monthly ($19)`、`Brago Local Yearly ($190)`
- [ ] 拿到 prod_xxx 填回 `constants/billing.ts` 的 `brago_local_monthly.creemPriceId` / `brago_local_yearly.creemPriceId`
- [ ] webhook URL 注册成 `https://你域名/api/payments/creem/webhook`，监听 `checkout.completed` / `subscription.paid` / `subscription.active`
- [ ] 测试模式跑一次完整 checkout + cron 自动续费

### G3 — Vercel Cron
- 已在 `vercel.json` 注册：
  - [ ] `/api/cron/brago-weekly-reminders`（每小时跑，handler 内部判断 7 天阈值；缺 `RESEND_API_KEY` 时无 op）
  - [ ] `/api/cron/subscription-grants`（保留）
- [ ] `CRON_SECRET`（Bearer / x-cron-secret）或 `CRON_JOBS_USERNAME`/`CRON_JOBS_PASSWORD` 配到 Vercel

### G4 — 数据库迁移
- [ ] 生产数据库执行最新迁移（`drizzle/0010_smart_shinobi_shaw.sql` 新增 google_post / google_post_photo / brand_voice_profile / caption_history / reminder_settings / upload_consent 共 6 张表）
- [ ] 已有 starter/pro/pack 等历史订阅数据不受影响

### G5 — R2 文件 lifecycle（P1）
- [ ] P0 删除 post 时清空 db，R2 文件不立即 purge（节省时间）
- [ ] P1 用 R2 lifecycle 自动清 60 天前未引用文件
- 当前不阻断上线

### G6 — Privacy / Terms
- [x] Privacy 增加 `Customer property photos` 段落（Phase 7）
- [x] Terms `Service Description` 改 Google-ready 表述 + 权限确认句子（Phase 1/7）
- [ ] 中英文文案最后校对

### G7 — 旧 multi-channel 兼容性
- [x] 旧 `post` / `post_image_pair` 表保留不动（Phase 2 spec 12.1）
- [x] 旧 `/api/posters/*` 路由保留兼容（Phase 1/2/3）
- [x] 公开端无任何 multi-channel 文案残留（Phase 1 grep 通过）
- [x] 旧 `/create` UI 备份为 `_legacy-multi-area.tsx.bak`，不挂路由
- [ ] 老用户上线后通知：旧 multi-channel UI 已下线，原 post 仍可查看 `/posts`

### G8 — 关键功能 smoke 测
- [ ] 用真账号上传一组 driveway 照片 → 跳 `/google-posts/[id]` → `Find the best after shot` 拿到 vision 推荐
- [ ] 切 `Single after` / `Before & after proof`，确认水印只有 "Before"/"After" 简洁标签
- [ ] 点 `Write Google caption` → 拿到符合 policy 的英文 caption → `Switch to Spanish` 换语言
- [ ] `Mark as posted` 后 dashboard `FreshnessBanner` 显示 streak
- [ ] cron 模拟 7 天后跑一次 `/api/cron/brago-weekly-reminders`，确认收到 Resend 邮件
- [ ] 邮件里点 `Pause for 4 weeks` 验证 `/reminders/unsubscribe?u=...` 可用

---

## P0 — 不修就瘫痪的事

### P0-1 Resend 邮件配置（注册/验证邮件依赖）
- [ ] `.env.local` / 生产环境的 `RESEND_API_KEY` 改成真 key（当前是占位 `re_your_api_key`）
- [ ] `RESEND_FROM_EMAIL` 改成 Resend 已验证的域名邮箱（当前是 `noreply@yourdomain.com` 占位）
- [ ] `RESEND_VERIFIED_DOMAIN` 配置好（生产模式要求）
- [ ] 测试：注册一个新邮箱，30 秒内收到验证邮件，点链接能自动登录
- **当前状态**：占位值，导致所有新用户注册卡在 /check-email 页（已用 SQL 手工 verify 测试账号绕过）
- **依赖用户提供**：去 https://resend.com/api-keys 申请 + verified domain

### P0-2 Better Auth 生产 URL
- [ ] `.env.local` / 生产环境的 `BETTER_AUTH_URL` 改成生产 https 域名
- [ ] `NEXT_PUBLIC_APP_URL` 改成生产 https 域名
- **当前状态**：本地是 `http://localhost:3000`，上线必须改

---

## P1 — 上线后才能跑通核心功能

### P1-1 Creem 支付 webhook 注册
- [ ] 在 Creem Dashboard 把生产 webhook URL 注册成：`https://你的生产域名/api/payments/creem/webhook`
- [ ] 监听事件：`checkout.completed`, `subscription.paid`, `subscription.active`
- [ ] `CREEM_WEBHOOK_SECRET` 配好并与 Dashboard 一致
- **测试方法**：用 Creem 测试模式买一次订阅，看 webhook 日志能不能验证签名通过 + 积分自动到账

### P1-2 Cron job 调度（年付积分分期发放）
- [ ] 在 Vercel Cron 或外部定时器注册：每小时调用 `https://你的生产域名/api/cron/subscription-grants`
- [ ] 带 Header `Authorization: Bearer <CRON_SECRET>` 通过认证
- **当前状态**：年付订阅会一次扣 12 倍钱但只发 1 个月积分，必须靠这个 cron 补发剩 11 个月

### P1-3 数据库迁移
- [ ] 生产数据库执行 `drizzle/0009_dashing_lester.sql`（post + postImagePair 表）+ 所有早期迁移
- [ ] 至少建 1 个 admin 账号（`pnpm admin:setup` 或手工 UPDATE `user.role='admin'`）

### P1-4 Cloudflare R2 存储配置
- [ ] `.env.local` / 生产配置全部 `STORAGE_*` 变量（REGION/BUCKET_NAME/ACCESS_KEY_ID/SECRET_ACCESS_KEY/ENDPOINT/PUBLIC_URL）
- [ ] 测试：调一次 `/api/posters/finalize`，看返回的 URL 是不是 R2 公网链接 + 浏览器能直接打开
- **当前状态**：未配置。Create 流的 finalize 端点临时走 base64 dataURL fallback（性能差但能用）
- **依赖用户提供**：Cloudflare R2 账户 + bucket + 对应 access key

---

## P1 — 功能必须接入 AI 才完整

### P1-5 接入豆包 AI 改 after 图 + 同步开启 finalize 扣费 ⚠️ 必须同步切换
> **核心原则（用户拍板）**：AI 介入才扣积分，AI 不介入不扣。当前 AI 未接入 → 全程免费；P1-5 切换后 → finalize 扣 10/新模板。这两件事必须同时翻转，绝不能拆开。

- [ ] **位置确认**：在 `/api/posters/finalize` 路径里、satori 渲 1080 之前插一步 `doubao-seededit-3-0-i2i-250628`（**不是** `/api/posters/preview-batch`——缩略图永远纯模板、永远不扣）
- [ ] **设计 AI prompt**（用户必须确认）：
  - 候选方向：自动调亮、增强对比、去除杂物（车、树叶、人）、矫正畸变、统一色调
  - 行业差异化：pressure_washing 强调"地面变干净"、auto_detailing 强调"漆面/内饰光泽"
- [ ] **⚠️ AI 接入 ↔ finalize 扣费开关必须同步翻转**：
  - [ ] env 加 `ENABLE_AI_FINALIZE=true`
  - [ ] finalize 路径：检测到 flag → 调豆包 i2i **且** canAfford(10) **且** 扣 10 积分（reason: `poster_ai_finalize`）
  - [ ] 三者放在同一个 if 分支内，保证不会出现"接了 AI 但没扣钱"或"扣钱但没调 AI"
  - [ ] 同 batchId + index 重复 finalize 命中 cache → **不调 AI 不扣费**（避免重复 AI 成本）
- [ ] **前端同步切**：Download 按钮文案 `Download` → `Download · 10 credits`；新 index 弹 confirm "Each new layout costs 10 credits (AI runs again). Continue?"；命中 cache 仍无 confirm
- [ ] **测试 QA-3 重跑（staging 翻 flag）**：上传 → 生成（免费）→ 第 1 张下载（扣 10）→ 第 2 张下载（再扣 10）→ 重下第 1 张（不扣）
- [ ] 给用户提供"AI 增强 开/关"开关（可选，P2 再说）
- **当前状态**：未接入。`ENABLE_AI_FINALIZE=false`（默认），finalize 走 satori 纯模板、不扣积分
- **依赖用户提供**：决定 prompt 风格 + 测试样片 + 豆包 i2i 实际单次调用成本核算（决定 10 积分是否合适）

### P1-6 AI Suggest headline 接入真 LLM
- [ ] `/api/posters/caption`（或新建 `/api/posters/suggest-headline`）的 stub 实现换成调用火山引擎 doubao
- [ ] **设计 prompt**：input = `{description, industry, channel, businessName, serviceArea}`；output JSON = `{headlines: 3 strings ≤36 char, caption: 60-160 char}`
- [ ] 风格指引：友好本地化、动词开头、不带 hashtag、避免夸张词
- **当前状态**：先用 stub（预烘 3 个 headline 模板拼接），prompt 待写
- **依赖用户提供**：prompt 文案风格 + 是否需要中英文双语

---

## P2 — 锦上添花但能延后

### P2-1 Multi-area collage 入口恢复
- [ ] 新建路由 `/create/collage`，把原 multi-area UI（4 组 before/after + label）整体搬过去
- [ ] /create 主页加链接 "Need a 2-4 area collage? →"
- [ ] **测试覆盖**：
  - [ ] 上传 1/2/3/4 组对照，验证多组渲染正确
  - [ ] 测试用户中途加减 area
  - [ ] 测试 area label 中英文混合
  - [ ] 测试 collage 模板（pressure_exterior_multi_area_proof + detail_full_multi_area_proof）水印 / brand 字段
- **当前状态**：UI 入口已隐藏（注释在 `app/[locale]/(protected)/create/page.tsx`），后端 API + 2 个模板仍可用。预计 30-60min 接回
- **用户明确要求**：上线前提醒，本轮先跳过

### P2-2 Analytics / 监控
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` 配置（用户行为分析）
- [ ] `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` 配置
- [ ] `NEXT_PUBLIC_CLARITY_PROJECT_ID` 配置
- [ ] Sentry / 日志告警接入

### P2-3 Demo 路由清理验证
- [ ] 确认 `/demo` `/demo/chat` `/demo/image` `/demo/video` 在生产环境返回 404 或被 `NEXT_PUBLIC_SHOW_SISTINE_DEMOS` 控制隐藏
- [ ] sitemap.xml 不暴露 demo 路由

---

## QA 串测（上线前必跑）

### QA 清单（来自 Phase 2 plan）
- [x] **QA-1** 营销层：首页 H1 + 定价 + 行业页 + 资源页 + sitemap 正常（法律页占位符已填 Brago/brago.ai，上线前用户最终 review）
- [x] **QA-2** 301 重定向：legacy industries URL 跳新路径（`next.config.mjs` 已配 `permanent: true`）
- [x] **QA-3** Create 主流：上传 → 3 张预览（无水印）→ 选 1 下载（高清+水印 free 用户）→ flag=true 时新 index 扣 10 → 缓存命中不扣
- [ ] **QA-4** Multi-area collage（依赖 P2-1 接回入口后才能跑）
- [x] **QA-5** /posts 列表能看到下载过的海报 + UserMenu 有入口（`features/navigation/components/user-menu.tsx:138`）
- [x] **QA-6** 余额不足时弹 402 提示 + 显示 "Top up →" 链接到 `/pricing`
- [x] **QA-7** /demo 路由 404（`app/[locale]/demo/layout.tsx` 默认 notFound 除非 `NEXT_PUBLIC_SHOW_SISTINE_DEMOS=true`）
- [ ] **QA-8** 注册 → 收验证邮件 → 点链接 → 自动登录 → 300 积分到账（依赖 P0-1 真实 Resend）
- [ ] **QA-9** Creem 测试模式买订阅 → webhook 自动加积分（依赖 P1-1）
- [x] **QA-10** AI Suggest 按钮点了能拿到 3 个 headline 候选 + channel-styled caption（stub fallback 永远可用，LLM 失败也返 200）

---

## 当前已确认完成 ✅

- ✅ Phase 2 全部 24 个开发任务完成（多区域类型/17 个模板/preview + post 表 schema/Create 页 UI/posts 列表/sitemap/301/smoke 测试）
- ✅ Phase 2 commit 已建（`c64a8b7`），分支领先 origin/main 2 个 commit
- ✅ Create 流文字模糊修复（Container `relative z-10`）
- ✅ Create 流重构 v1（single-pair + 自动选 3 模板 + brand 强制跳转）
- ✅ /settings/brand 支持 `?returnTo=/create`
- ✅ 147/147 测试全过，lint 干净
- ✅ Create 流二轮重构（task #38）：双输入 description+headline / 缩略图选 1 / finalize 端点 / `ENABLE_AI_FINALIZE` flag / cache 命中不重复扣 / 全程零积分直到 flag 翻
- ✅ 178/178 测试全过，lint 干净（v2 重构后）
- ✅ v2-fix1：preview-batch 缩略图 watermark 越界 bug（root cause：`watermark.ts` 硬编码 1080 vs 360 缩略图），缩略图改为无水印（finalize 高清才水印），watermark.ts 按实际尺寸缩放 + 域名改 `brago.ai`
- ✅ v2-fix2：channel 选择 + auto-styled caption (GBP / Nextdoor / Instagram)
- ✅ QA-1/2/5/6/7/10 全过；prod `pnpm build` 通过；181/181 测试全过
- ✅ 法律页 4 个（privacy/terms/cookies/refund）占位符全部填入 Brago/brago.ai/Delaware/effective 2026-05-25 等具体值
- ✅ Create 页 402 余额不足 → 显示 "Top up →" 链接到 /pricing

---

**最后更新**：2026-05-25  
**文件路径**：`docs/launch-checklist.md`  
**触发关键词**：用户说"准备上线"/"上线前检查"/"现在能上吗"/"check launch" → Claude 读此文件
