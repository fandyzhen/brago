# Spec：匿名试用同款 + 末端登录墙

**Status**: Approved (2026-05-30)
**Owner**: fandyzhen
**Touches**: `/free-google-post-generator`、`lib/db/schema.ts`、`/api/brago/anonymous/*`（新）、`/api/upload/image`、`lib/auth.ts` 注册 hook、首页 hero CTA

---

## 1. 背景与目标

### 现状
- `/free-google-post-generator` 是首页主 CTA 落地页，未登录可访问
- 当前实现极弱：只有 `service type 下拉 + city` 输入，API 走纯模板字符串替换（[app/api/brago/free-generator/route.ts:22-32](../../../app/api/brago/free-generator/route.ts:22)），不调任何 AI
- 输出一行模板化句子 + 一个 Copy 按钮 + "Try full Brago" 链接到 `/signup`

### 问题
访客一键就能拿到一段生硬模板文案，**完全感受不到 Brago 真实价值**（vision 选图、AI 文案、双语、历史去重）。看完就走，转化漏斗在第一步就断
了。

### 目标
把这条入口改造成**"试用同款 + 末端登录墙"**：
- 未登录用户体验**与付费版几乎相同**的输入和生成流程（真 AI、真 vision）
- 结果**看得到**（文案全显示、选图推荐全显示）
- **拿不走**（Copy、Download、切语言、重生成全锁）
- 触墙 → 注册 modal → 注册成功后**这次结果直接绑到新账号** → 跳 `/google-posts/[id]`

### 成功指标
- 未登录访问 → 完成一次试用的比例 ≥ 30%
- 完成试用 → 点登录墙 → 注册成功的比例 ≥ 15%
- 单访客 AI 成本 < $0.02（保证 1000 试用者/天 < $20）

---

## 2. 核心决策摘要

| 维度 | 决策 |
|---|---|
| 方向 | 试用同款（看得到拿不走） |
| 频率 | 每 IP / 每天 1 次（服务端 IP hash + localStorage 双重） |
| 输入 | 多图上传 + 服务类型 + 城市 + 品牌名 + 语气 + 双语 → 与付费版输入对齐 |
| 解锁墙 | vision 选图全显 + 文案全显；锁 Copy / Download / 切语言 / 重生成 |
| 注册后 | 注册时携带 anonId → 服务端把那条 `google_post` 认领到新账号 → 跳 `/google-posts/[id]` |
| 路由 | 原地改造 `/free-google-post-generator`；已登录访问 → 服务端 redirect 到 `/create` |
| 实现策略 | 方案 A — 复用 `google_post` 模型 + 新建 `/api/brago/anonymous/*` 路由族；prompt/vision/policy 通过 lib 层共享，杜绝试用版/付费版能力漂移 |

---

## 3. 数据模型

### 3.1 改 `google_post`
- `user_id` 由 `text NOT NULL REFERENCES user.id ON DELETE CASCADE` 改为 **nullable**：`text REFERENCES user.id ON DELETE CASCADE`
- 新增 `anon_id text`（nullable）：未登录访客的 UUID
- 新增约束 `CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)`：至少一个所有者
- 新增**部分索引** `CREATE INDEX google_post_anon_id_idx ON google_post (anon_id) WHERE anon_id IS NOT NULL` — 只索引匿名记录，付费用户记录不进索引、不增加写开销
- 既有索引（`google_post_user_idx` / `google_post_user_created_idx`）保持，NULL `user_id` 不会污染查 `WHERE user_id = ?` 的现有代码

### 3.2 改 `google_post_photo`
- `user_id` 同样改 nullable
- 不加 `anon_id`：通过 `google_post_id → google_post.anon_id` 反查

### 3.3 新建 `anonymous_quota`（IP 限流账本）
```sql
CREATE TABLE anonymous_quota (
  id           text PRIMARY KEY,
  ip_hash      text NOT NULL,           -- SHA256(ip + BETTER_AUTH_SECRET)，不存原始 IP（隐私合规）
  usage_date   date NOT NULL,           -- UTC 日期
  count        integer DEFAULT 0 NOT NULL,
  last_anon_id text,                    -- 用于复盘：知道这条限额对应哪个 anonId
  created_at   timestamp DEFAULT now() NOT NULL,
  UNIQUE (ip_hash, usage_date)
);
CREATE INDEX anonymous_quota_created_at_idx ON anonymous_quota (created_at);
```
- `UNIQUE(ip_hash, usage_date)` 让 INSERT 走 `ON CONFLICT (...) DO UPDATE SET count = count + 1` 一条 SQL 搞定
- 不存原始 IP，只存 hash，与现有 `BETTER_AUTH_SECRET` 复用作 salt

### 3.4 清理策略
- 新建 cron `/api/cron/cleanup-anonymous` 每日跑：
  - 删 `anonymous_quota.created_at < now() - INTERVAL '7 days'`
  - 删 `google_post.anon_id IS NOT NULL AND user_id IS NULL AND created_at < now() - INTERVAL '24 hours'`（连带 `google_post_photo` cascade）
- 不阻断 P0；如果 cron 没接上线，靠 R2 lifecycle 24h 自动清文件

---

## 4. API 路由

### 4.1 新增 `/api/brago/anonymous/*` 路由族
**为什么独立路由族**：不污染现有 `google-posts/*` 的 session 检查，限流逻辑集中。所有匿名路由内部调用**同一组 lib 函数**（`lib/brago/caption/*`、`lib/brago/vision/*`），保证试用版/付费版 prompt 完全一致。

#### `POST /api/brago/anonymous/google-posts`
- 入参：`{ industry, serviceType, serviceArea, brandName, brandPhone?, tone, language, anonId }`
- 校验：
  - 取 `request.headers.get('x-forwarded-for')` 算 ipHash
  - 查 `anonymous_quota` WHERE `ipHash, today`，若 count ≥ 1 → 429 `{ error: 'trial_used', message: '今日试用已用完，注册可继续使用' }`
- 写：
  - INSERT `google_post (anon_id, user_id=NULL, industry, ...)` 拿到 postId
  - UPSERT `anonymous_quota` count + 1, last_anon_id = anonId
- 返回：`{ postId, anonId }`

#### `POST /api/brago/anonymous/upload`
- 入参：`multipart/form-data { file, anonId, postId }`
- 校验：
  - 该 anonId 在 24h 内有效（找 `google_post.anon_id = X AND created_at > now() - 24h`，否则 401）
  - 文件 ≤ 10MB、image/*
- 写：
  - R2 路径 `anon-tmp/{anonId}/{photoId}.jpg`
  - INSERT `google_post_photo (google_post_id, user_id=NULL, original_url, ...)`
- 返回：`{ photoId, url }`

#### `POST /api/brago/anonymous/google-posts/[postId]/analyze`
- 校验：postId 的 anon_id 匹配 cookie/body 中的 anonId
- 调 `lib/brago/vision/openai.ts` 同步 vision 推荐
- 写：UPDATE `google_post` `bestPhotoId`、`proofRecommendationJson`
- 不计入 quota（quota 在 create 时已扣）

#### `POST /api/brago/anonymous/google-posts/[postId]/generate-caption`
- 校验：anonId 匹配
- 调 `lib/brago/caption/openai-text.ts` 拿 caption
- 调 `lib/brago/caption/policy.ts` 跑 GBP policy check
- 写：UPDATE `google_post.caption / captionPolicyJson`
- 返回：`{ caption, policy }`
- **不支持** rewrite / switch language（这是付费功能，前端会让按钮指向注册）

#### `GET /api/brago/anonymous/google-posts/[postId]`
- 读 google_post + photos，让结果页可刷新而不丢失
- 校验：anonId 匹配（防越权读他人 anon post）

### 4.2 改现有 `/api/brago/free-generator`
- 行为不变，但**只在新流跑挂的情况下作为兜底文案模板**（lib 层已有 `findTemplates`）
- 实际上前端新流不再调用它；保留是为不影响现有 SEO 链接

---

## 5. 反白嫖（双重防线）

### 5.1 服务端：IP hash 限流
- 单条函数 `assertTrialQuota(ipHash, anonId)` 在 `POST /api/brago/anonymous/google-posts` 里跑
- 用 `INSERT ... ON CONFLICT (ip_hash, usage_date) DO UPDATE SET count = count + 1, last_anon_id = $anonId RETURNING count`
- 如果返回 count > 1 → 抛 `TrialQuotaExceededError` → 429
- 一条 SQL 保证并发安全（同 IP 同时两个请求过来，第二个被拒）

### 5.2 浏览器端：localStorage 软锁
- 客户端 `useTrialQuota()` hook：读 `localStorage['brago_trial_state']`
- 状态：`{ usedDate: '2026-05-30', postId: 'gp_xxx', anonId: 'a_xxx' }`
- 流程入口判断：
  - 没记录 → 允许进入新流
  - 有记录且 `usedDate === 今天` → 跳到 step 5（结果页）展示历史那条 + 持续展示登录墙
  - 有记录但 `usedDate !== 今天` → 清记录 + 允许重新进入
- 注册成功后清 `brago_trial_state`

### 5.3 攻击面
- **换 IP/换浏览器/无痕**：能绕，但每次重做都要重传图 + 等 vision + 等 caption（3-5 秒），白嫖成本本身已经很高
- **同 IP 多设备并发**：第二个被 429
- **接受残留漏洞**：技术党拿到 1-3 段文案不构成商业损失；非技术党（目标客户）打不穿

---

## 6. 前端多步流程（client.tsx 重构）

### 6.1 步骤拆分
原 `<form>` 拆成 step machine（useState `'upload' | 'brand' | 'tone' | 'generating' | 'result'`）：

| Step | 内容 |
|---|---|
| 1. upload | 拖拽/选择 3-10 张照片，预览缩略图，最多 10MB/张 |
| 2. brand | 服务类型 (5 个 pressure_washing 选项)、城市/服务区、品牌名（必填）、电话（选填） |
| 3. tone | 语气：Friendly / Professional / Local pride；语言：English / Spanish |
| 4. generating | 全屏进度条：「Vision 选最佳 After 图…」→「撰写 GBP 合规文案…」（顺序调用 analyze + generate-caption） |
| 5. result | 半墙 result 页（见 6.2） |

每步 "Next" 按钮验证当前步骤必填字段。客户端表单状态用 react-hook-form。

### 6.2 半墙 result 页
```
┌───────────────────────────────────────────┐
│ ✨ Your Google Business post is ready     │
├───────────────────────────────────────────┤
│ [vision 推荐的"最佳 After 图"，带 Brago      │
│  半透明水印（不挡内容，能看清）]              │
│  "Why this photo?" → vision reasoning      │
├───────────────────────────────────────────┤
│ Caption (完整 caption 全显，不模糊)          │
│ Lorem ipsum dolor sit amet...              │
│ GBP policy check: ✅ No phone, ✅ ≤200 字, │
│  ✅ Soft CTA only                         │
├───────────────────────────────────────────┤
│ [🔒 Copy caption] [🔒 Download image]      │
│ [🔒 Switch to Spanish] [🔒 Regenerate]     │
│                                            │
│ → Sign up free to unlock & save this post │
│ → 300 credits included                    │
└───────────────────────────────────────────┘
```

- 所有锁定按钮**外观看起来正常**（不灰掉），点击触发**注册 modal**
- 锁图标在按钮文字前
- 底部 CTA `Sign up free to unlock & save this post` 加粗、品牌橙色

### 6.3 注册 modal
- 用 `<Dialog>` 弹出（不跳页，免得丢上下文）
- 复用 `/signup` 现有表单组件
- 隐藏字段：`anonId` 从 localStorage 取
- Google OAuth 按钮也带 `?anon=...` query param
- 注册成功 → modal 关 → `router.push('/google-posts/' + postId)`

### 6.4 已登录用户访问的处理
- `page.tsx` server component 顶部：
  ```ts
  const session = await getActiveSessionUser(headers);
  if (session?.user) redirect('/create');
  ```
- 不在客户端做这个判断，避免闪屏

---

## 7. 注册认领（关键 UX 接缝）

### 7.1 改 `lib/auth.ts` better-auth hook
现有 `hooks.after` 已经处理了 registration_bonus，加一段：
```ts
if (ctx.path.startsWith("/sign-up")) {
  const newSession = ctx.context.newSession;
  if (newSession) {
    // ... 现有 grantCredits(300, registration_bonus) ...

    // 新增：认领匿名 trial post
    try {
      const anonId = readAnonCookieFromCtx(ctx); // 从 request cookies 或 body 取
      if (anonId) {
        await claimAnonymousPost(newSession.user.id, anonId);
        // 内部：
        //  1. UPDATE google_post SET user_id=$1, anon_id=NULL WHERE anon_id=$2
        //  2. UPDATE google_post_photo SET user_id=$1 WHERE google_post_id IN (...)
        //  3. R2 copy: anon-tmp/{anonId}/* → user/{userId}/*
        //  4. UPDATE google_post_photo.original_url / processed_url to new R2 path
      }
    } catch (error) {
      console.error("[Auth] Failed to claim anonymous post:", error);
      // 不阻断注册——失败时用户照样进 dashboard，只是丢了那次试用结果
    }
  }
}
```

### 7.2 R2 文件迁移
- 写 `lib/brago/r2-upload.ts` 加 `copyR2Object(srcKey, destKey)` helper
- 用 S3 SDK `CopyObjectCommand`（R2 兼容 S3 API）
- 迁移成功后 DB URL 改成新 key 的公共 URL
- 不立即删 anon-tmp/ 原文件：让 R2 24h lifecycle 自然清，避免迁移失败/竞态丢图

### 7.3 ClaimAnonymousPost 的事务性
- DB 部分用 drizzle `db.transaction(async (tx) => {...})` 保证 photo + post 一起改
- R2 copy 在事务**外**（R2 不能回滚），失败则记 log 后继续：用户最差情况是新账号下看到一条 post 但图加载失败，可以提示「重传图」（这不在本期 P0 范围内）

### 7.4 anonId 传递
- 进入流程时，前端 generate POST 携带 anonId，并写 cookie `brago_anon_id`（path=/, sameSite=Lax, httpOnly=false, 1 天 expiry）
- 注册 modal 邮箱注册：浏览器自动带这个 cookie 发给 `/api/auth/sign-up`，better-auth hook 内部从 `ctx.request.headers.get('cookie')` 解析读出 anonId
- Google OAuth：**不能用 OAuth state 参数**（better-auth 用它做 CSRF 防护）。改用 `sameSite=Lax` cookie 在 OAuth 回调时仍然可见（用户点 OAuth 按钮 → 跳 Google → 回 Brago 域名时 cookie 还在），better-auth 回调 hook 同样能读到
- 实测保险：cookie 写两份，一份 `brago_anon_id`、一份独立的 `brago_anon_id_persist` 备份，避免被任何 oauth middleware 意外清掉

---

## 8. R2 临时存储

### 8.1 路径约定
- 匿名上传：`anon-tmp/{anonId}/{photoId}.jpg`
- 认领后迁移：`user/{userId}/{photoId}.jpg`（或保持现有 user 上传约定）

### 8.2 Lifecycle Rule
- 在 R2 控制台为 `anon-tmp/` 前缀配 lifecycle policy：24h 后删除
- 即使匿名 post 没有被认领、cron 没跑、用户失踪，R2 也能 24h 内自动清，避免无限堆积

### 8.3 公网 URL
- 复用现有 `STORAGE_PUBLIC_URL` 域名
- 客户端能直接通过 URL 访问（vision 调用也是用公网 URL 传给 OpenRouter）

---

## 9. 文案与翻译

### 9.1 新增翻译 namespace
`messages/{en,zh}.json` 加 `freeTrial.*`：
- step 标题与提示（upload / brand / tone / generating / result）
- 半墙提示 "Sign up free to unlock & save this post"
- 注册 modal 的 anon 上下文 hint "We'll save your draft to your new account"
- 限流提示 "Today's free trial is used. Sign up to keep going."

### 9.2 原 `/free-google-post-generator` 文案
- 顶部 H1 改为更聚焦的："Try Brago free — Google posts in 30 seconds"
- 副标改为价值主张式："Upload your job photos, get a Google-safe caption + the best after shot picked for you."

---

## 10. 测试与验证

### 10.1 单元测试（vitest）
- `lib/brago/anonymous/quota.test.ts`：并发 INSERT 时只允许一个 count = 1 通过
- `lib/brago/anonymous/claim.test.ts`：claim 成功后 user_id 写入 + anon_id 清空 + photo 全部继承

### 10.2 集成测试
- 提交 anon → 看到结果（含 vision 推荐 + 文案）
- 同 IP 再来一次 → 429
- 触墙点注册 → 新账号能看到 `/google-posts/[id]` 且 200 OK + 图能加载

### 10.3 浏览器端到端验证（preview tools）
- `/free-google-post-generator` 走完 5 步
- localStorage 写入 `brago_trial_state`
- 点 Copy → 注册 modal 弹出
- 注册 → 跳到 `/google-posts/[id]`，post 归属新账号

---

## 11. 上线前关注

- 需要 **R2 控制台手动配 `anon-tmp/` 24h lifecycle rule**（追加到 `docs/launch-checklist.md`）
- 需要确认 **OpenRouter 余额能撑 ≥ 1000 试用 / 天**（$0.012/帖 × 1000 ≈ $12，当前余额 $5 → 上线前充值）
- 需要把 **CRON_SECRET 已配** + 新 cron `/api/cron/cleanup-anonymous` 注册到 vercel.json
- 需要在 R2 控制台 **anon-tmp/ 桶/前缀公网读权限可访问**（vision 调用要公网 URL）

---

## 12. 不做的事（YAGNI）

- 不做 captcha：1 次/IP 已经足够防大规模白嫖；加 captcha 摩擦更大、转化更低
- 不做匿名用户的 history（只能跑一次，没必要做"历史列表"）
- 不做匿名用户的 brand profile 持久化（每次重新填，认领时一并迁到 `brand_profile` 表也不做——下个版本再说）
- 不做匿名用户的 ES 切换/重生成（这才是付费版价值点，强行让 anon 享受会让付费版价值打折）
- 不做匿名用户的下载/复制（这就是登录墙存在的意义）
- 不替换 `/api/brago/free-generator` 旧路由：保留兜底 + SEO 兼容

---

## 13. 风险与降级

| 风险 | 降级方案 |
|---|---|
| OpenRouter 余额耗尽 | API 路由检测 402，前端展示「免费试用今日额度已用完，明天再来」（实际是 quota 满文案的复用） |
| R2 anon-tmp 上传失败 | step upload 报错，允许重传；不让用户卡死 |
| vision 选图返回畸形 JSON | 复用现有 fallback：默认推第一张图 + 不展示 "Why this photo?" reasoning |
| AI 文案生成超时 | 复用现有模板 fallback，与 `/api/brago/free-generator` 完全相同的兜底，文案标记 `source: 'template-fallback'`，前端不显示这个标记（避免让用户觉得"哦这不是真 AI"） |
| 注册时 claim 失败 | 注册照常进行，新账号 dashboard 顶部 banner 提示「你刚才试用的那条 post 没能迁入，请到 /create 重新生成（300 新人积分已就位）」；banner 一次性，关闭即消失 (P1) |

---

**最后更新**：2026-05-30
**实施计划**：见 `docs/superpowers/plans/2026-05-30-anonymous-trial-plan.md`（下一步通过 writing-plans skill 产出）
