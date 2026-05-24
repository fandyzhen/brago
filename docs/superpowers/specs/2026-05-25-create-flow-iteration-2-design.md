# Create 流程二轮重构设计

> **Goal**：把"上传 → 自动选 3 模板 → 一句话 → 生成 → 选 1 下载"升级为"双输入（描述 + headline）→ 纯模板渲染 3 张缩略图 → 选中点下载得到 1080 高清版"。**核心原则：成本绑定扣费——AI 介入才扣，AI 不介入不扣**。本次 AI 未接入，全程零积分消耗。P1-5 接入豆包 AI 后，finalize 路径插入 AI 步骤并同步开启扣费（10 积分/新模板）。

**作者**：Claude（与用户协作 brainstorm）  
**日期**：2026-05-25  
**对应任务**：#38 QA-3-v2  
**前置**：QA-3 一轮重构（task #27 已完成），本设计在其基础上演进

---

## 1. 决策摘要（已与用户拍板）

| 决策点 | 选择 |
|---|---|
| **核心原则** | **成本绑定扣费**：调豆包 AI（真实 API 成本）= 扣 10；纯 satori+sharp 模板渲染（零外部 API 成本）= 不扣 |
| **本次（AI 未接入）扣费** | **全程零积分**。preview-batch 不扣、finalize 不扣 |
| **P1-5 AI 接入后扣费** | preview-batch 仍免费（缩略图纯模板）；finalize **每个新 index 扣 10**（调一次 AI）；**同 batch 同 index 重复下载命中 cache 不扣**（避免重复调 AI） |
| **"AI 接入 ↔ finalize 扣费"是同步开关** | 不能先开扣费后接 AI、也不能先接 AI 后开扣费。由 env 变量或 feature flag 控制：`ENABLE_AI_FINALIZE=true` ⇒ 同时启用 AI 调用 + 10 积分扣费 |
| **预览阶段是否预渲 1080 高清** | **不预渲**。preview-batch 只产 360 缩略图。finalize 被点时才渲 1080（未来 AI 接入也在这步） |
| **存储策略** | server 端内存 Map，30 min TTL。cache 内容：原图 dataURL + 文本字段 + templateIds + usedIndices + 已 finalize 过的 1080 dataURL。R2 未配置，post.outputUrl 暂用 base64 dataURL |
| **Headline 输入** | 双输入：`description`（80 字符）+ `headline`（36 字符） |
| **AI Suggest** | 先 stub（预烘 3 个 headline + 1 个 caption），prompt 留待 LLM 接入时设计 |
| **multi-area collage 入口** | 本次不动，后续单独建 `/create/collage`（已记入 launch-checklist P2-1） |
| **右侧"将渲染哪些模板"预览** | **去掉**——用户上传图后不展示推荐模板小图，等用户点 Generate 才出 3 张缩略图 |

---

## 2. 用户故事

**故事 A — 主流程（本次：全程免费）**
> 我是一个干压力清洗的小老板。我打开 Create 页，看到顶部说"using brand info: Smith Pressure Pros · (512) 555-0184 · Austin, TX"。我上传了今天干完的活儿的 before 和 after 两张照片。我在"Describe the work"框里写"Cleaned a driveway in 3 hours, all stains gone"。我点"AI Suggest"，看到 3 个候选 headline，挑了一个塞到"Headline on poster"框。我点"Generate 3 previews"（按钮**不显示积分**），等几秒看到右侧出现 3 张不同布局的预览缩略图（每张 360×360）。我点中第二张，点"Download"（按钮也**不显示积分**），浏览器下载了一张 1080×1080 PNG。**整个流程积分余额没变**。

**故事 A' — P1-5 AI 接入后**
> 同上，但缩略图阶段仍免费（按钮"Generate 3 previews"），点 Download 时按钮显示"Download · 10 credits"，弹 confirm "Download this layout for 10 credits? (AI will enhance your photo)" 确认后调豆包 i2i + satori 渲 1080，积分 100 → 90。

**故事 B — 同一张反复下载（本次：永远免费）**
> 第二张下载完，我又点了一次下载——直接下载（无 confirm 无扣费）。**本次和 AI 接入后行为一致**：server 端检测到 batchId + index 2 已经 finalize 过，直接返回缓存 dataURL，无 AI 调用、无扣费。

**故事 B' — 换模板（本次：免费 / AI 接入后：扣 10）**
> 看完第二张觉得不错，但第三张布局也好。我点第三张缩略图变成选中态，点"Download"。**本次**：直接下载、无扣费。**AI 接入后**：弹 confirm "Each new layout costs 10 credits (AI runs again on a different layout). Continue?"，确认后扣 10、调 AI、下载。

**故事 C — 新用户没填 brand**
> 我刚注册完，第一次点"Create"。被自动跳到 `/settings/brand?returnTo=/create`，页面说"Fill in your business name to continue"。我填了"Smith Pressure Pros"，点保存，600ms 后自动跳回 /create 页。

**故事 D — 预览过期**
> 我生成了 3 张预览后被叫去干活，1 小时后回来再点 Download。提示"Preview expired, please regenerate" + 一个"Regenerate"按钮。我点 Regenerate，前端重新调 preview-batch（**仍然不扣**，毕竟纯模板渲染）。

---

## 3. 数据流

```
┌─ Step 1: 上传 + 描述 ──────────────────────────────────────┐
│ Upload before + after                                       │
│ 读 after 图 aspect ratio → pickPreviewTemplates(o, 3)       │
│ 右侧此时**空 placeholder**，不预展示模板缩略图              │
│                                                             │
│ Describe the work textarea (≤80 char)                       │
│ [✨ AI Suggest] → stub 返 3 headlines + 1 caption           │
│ Headline on poster input (≤36 char)                         │
│ [Generate 3 previews]   ← 注意：无 credits 字样             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─ Step 2: POST /api/posters/preview-batch ──────────────────┐
│ 1. 鉴权（不查 canAfford——本步不扣，且永远不会扣）         │
│ 2. 并行渲染 3 张 **360×360** 缩略图（satori + sharp resize） │
│ 3. 写 batchCache:                                          │
│      BatchEntry = {                                         │
│        userId,                                              │
│        beforeDataUrl, afterDataUrl,  // 原图，留给 finalize │
│        headline, description, brandFields, ...,             │
│        items: [{ templateId, name, thumbnailDataUrl }, ...] │
│        usedIndices: Set<number>,                            │
│        downloadedDataUrls: Map<number, string>, // 1080 dataURL │
│        createdAt, expiresAt: createdAt + 30min              │
│      }                                                      │
│ 4. **不扣积分**（无 AI 调用）                               │
│ 5. 返回 { batchId, thumbnails: [{ templateId, name,         │
│           thumbnailDataUrl }, ...], expiresAt }             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─ Step 3: 用户在右侧看到 3 张 360 缩略图，点选中态 ─────────┐
│ 主预览图：360 base64                                        │
│ 用户点 [Download] 按钮                                      │
│ 前端 confirm（仅 AI 接入后启用）：                          │
│   ENABLE_AI_FINALIZE=false → 跳过 confirm 直接 fetch        │
│   ENABLE_AI_FINALIZE=true 且 新 index → confirm "10 credits"│
│   命中 cache → 永远跳过 confirm                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─ Step 4: POST /api/posters/finalize { batchId, index } ────┐
│ - cache miss / 过期 → 410 { error: "Preview expired" }     │
│ - usedIndices 包含 index（同 index 重复）：                 │
│      直接返 downloadedDataUrls.get(index)                   │
│      返回 { url, charged: 0, remainingCredits, cachedHit:true } │
│      **不扣 / 不写库 / 不调 AI**                           │
│ - usedIndices 不包含 index（新 index 首次）：               │
│      IF ENABLE_AI_FINALIZE:                                 │
│        canAfford(10) → 否则 402                            │
│        调豆包 i2i 改 after 图                              │
│        扣 10 积分（reason: "poster_ai_finalize"）           │
│      satori + sharp 渲 1080×1080 PNG                       │
│      buffer → base64 dataURL（R2 未配置走 fallback）       │
│      写 post 行（status='completed', outputUrl=dataURL）   │
│      写 generationHistory 行                                │
│      usedIndices.add(index)                                 │
│      downloadedDataUrls.set(index, dataURL)                 │
│      返回 { url, charged: 10 或 0, remainingCredits }       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─ Step 5: 前端拿 dataURL ────────────────────────────────────┐
│ a.download 触发下载                                         │
│ 更新积分余额显示（charged=0 时不变）                        │
│ 缩略图按钮文案改成 "Download again"（命中 cache 永远免费）  │
└─────────────────────────────────────────────────────────────┘
```

**ENABLE_AI_FINALIZE 切换**（P1-5 上线时翻转）：
- 切换前：finalize 直接走 satori+sharp 渲 1080，跳过 canAfford / 扣费 / AI 调用
- 切换后：finalize 先调豆包 `doubao-seededit-3-0-i2i-250628`，然后喂 satori。**同时**启用 canAfford(10) + 扣 10 积分
- 这两件事必须同步切换，不能拆分

---

## 4. 模块拆解

| 模块 | 职责 | 文件路径 |
|---|---|---|
| **batchCache** | server-side 内存 Map + 30min TTL 清理 + getter/setter + LRU 上限 200 | `lib/server/poster-preview-cache.ts`（新建） |
| **preview-batch（改）** | 现有端点改造：**只渲 3 张 360 缩略图**，写 cache，**永远不扣积分** | `app/api/posters/preview-batch/route.ts` |
| **finalize（新）** | 校验 cache + 判断 index 是否首次 + 受 ENABLE_AI_FINALIZE 控制 AI 调用 + 扣费 | `app/api/posters/finalize/route.ts`（新建） |
| **suggest stub** | 不调 LLM，纯模板组合返回 3 headlines + 1 caption | `app/api/posters/caption/route.ts`（改）或独立端点 |
| **Create 页（重写）** | 双输入 + 右侧空 placeholder → 缩略图列表 + 选中态 + Download 按钮（按 flag 显示价格） | `app/[locale]/(protected)/create/page.tsx` |

---

## 5. 数据结构

### 5.1 batchCache 内存结构（不入库）

```ts
type BatchItem = {
  templateId: string;
  name: string;
  thumbnailDataUrl: string; // 360×360 base64，约 30-80 KB
};

type BatchEntry = {
  userId: string;
  // 原图 + 文本，留给 finalize 重新拼 RenderInput
  beforeDataUrl: string;
  afterDataUrl: string;
  headline: string;
  description?: string;
  brandFields: {
    businessName?: string;
    phone?: string;
    serviceArea?: string;
    isLicensed: boolean;
    isInsured: boolean;
    googleReviewCount?: number;
  };
  items: BatchItem[];                  // 长度 1-3
  usedIndices: Set<number>;            // 已 finalize 过的 index
  downloadedDataUrls: Map<number, string>; // index → 1080 高清 dataURL
  createdAt: number;
  expiresAt: number;                   // createdAt + 30min
};

// 文件级 singleton
const batchCache = new Map<string, BatchEntry>();

// 每 5 分钟扫描清理过期 entry
setInterval(cleanupExpired, 5 * 60 * 1000);
```

**内存预算**：单个 BatchEntry ≈ 原图 1-5 MB（用户上传，已限 10 MB 上限）× 2 + 3 张 360 缩略图（90-240 KB）+ 0-3 张 1080 高清 dataURL（1-3 MB × N）。最坏情况 3 张高清都 finalize 过：约 12-25 MB / entry。LRU 上限 200 → 最坏 2.5-5 GB；实际平均（多数用户只 finalize 1 张）≈ 1-2 GB。

**Vercel serverless 注意**：每实例内存上限 1-3 GB，必须**LRU 上限**控制。生产可考虑 100 个 entry 上限 + 缩短 TTL 到 15 min。

### 5.2 API 契约

**preview-batch 请求**（multipart/form-data）：
```
beforeImage: File
afterImage:  File
description: string (≤80 char) — 新加
headline:    string (≤36 char)
templateIds: JSON string of [id, id, id]
businessName, phone, serviceArea, ... (brand info)
```

**preview-batch 响应**（200）：
```json
{
  "batchId": "uuid",
  "thumbnails": [
    {
      "templateId": "pressure_driveway_hero_split",
      "name": "Driveway Hero Split",
      "thumbnailDataUrl": "data:image/png;base64,iVBORw0KG..."
    }
  ],
  "expiresAt": 1716618000000
}
```
> 注意：**永远不返回** `creditsCharged` / `remainingCredits` 字段——本步永远不扣（即使 AI 接入后也是缩略图纯模板渲染）。

**finalize 请求**（JSON）：
```json
{ "batchId": "uuid", "index": 2 }
```

**finalize 响应**（200）：
```json
{
  "url": "data:image/png;base64,iVBORw0KG...",
  "charged": 0,             // 本次永远 0；AI 接入后新 index 首次为 10
  "remainingCredits": 100,
  "cachedHit": false        // true 表示同 index 重复
}
```

**finalize 错误响应**：
- `410 Gone` — `{ error: "Preview expired, please regenerate" }`
- `402 Payment Required` — `{ error: "Insufficient credits", required: 10, available: 3 }` **（仅 ENABLE_AI_FINALIZE=true 时可能出现）**
- `404 Not Found` — `{ error: "Unknown batchId" }`
- `400 Bad Request` — index 越界 / 字段缺失

---

## 6. 边界 / 失败处理

| 场景 | 行为 |
|---|---|
| **preview-batch 全部 3 张渲染失败** | 返 500，不写 cache（本来就不扣，无副作用） |
| **preview-batch 部分失败（1-2 张成功）** | 仍写 cache，返成功的那些 + thumbnails 数组长度<3。前端展示 "X of 3 layouts rendered" |
| **finalize cache 过期** | 410 + 文案"Preview expired, please regenerate"。**不扣积分**（生成阶段就没扣），用户点 Regenerate 重新过 preview-batch |
| **finalize 1080 渲染失败** | 500，不扣积分（即便 AI 接入后也要 refund）、不写 post、不写 cache。前端 toast "Render failed, please try again" |
| **finalize AI 调用失败（AI 接入后）** | 500，不扣积分（事务回滚或不进入扣费分支）、不写 post |
| **finalize 同 index 重复调用** | 直接返 `downloadedDataUrls.get(index)`，charged=0，cachedHit=true，**永远不调 AI 不扣**（本次和未来一致） |
| **finalize 积分不足（仅 AI 接入后）** | 402，不写库不调 AI，前端 toast "Insufficient credits — top up to download" |
| **finalize 写 post 表失败但扣费已成功（AI 接入后）** | 立即 `refundCredits(10)`，500 给前端。事务一致性优先 |
| **Server 重启 / Vercel 冷启动** | cache 全丢；用户下次点 download 走 410 → Regenerate（免费）流程。文档化 |
| **AI Suggest 任何错误** | 返 500，前端 toast "Could not generate suggestions"，用户可手动输入 |

---

## 7. /posts 历史可见性

- **预览阶段**：不写任何 post / postImagePair / generationHistory 行
- **finalize 首次成功后**（无论是否扣费）：每个新 index 下载写 1 行 post（status=completed）+ 1 行 generationHistory
- **finalize 同 index 重复**：**不重复写**（cache 命中直接返）
- 用户下载 1 张 → /posts 看到 1 行；3 张全下 → 看到 3 行（每行各 1 张 outputUrl）
- 当前 outputUrl 是 base64 dataURL（巨大），列表页要小心**不要把 dataURL 整个 SELECT 出来**渲染缩略图（用 LIMIT、不渲染图，或单独存 thumbnail_url 字段）。**P1-4 R2 接入后**改成真正 R2 URL，列表页就正常了。

---

## 8. AI Suggest stub 实现

**输入**（JSON POST）：
```json
{
  "description": "Cleaned Smith's driveway, 3 hrs, all stains gone",
  "industry": "pressure_washing",
  "channel": "google_business_profile",
  "businessName": "Smith Pressure Pros",
  "serviceArea": "Austin, TX"
}
```

**输出**：
```json
{
  "headlines": [
    "Driveway Brought Back to New",
    "Smith Pressure Pros Did It Again",
    "Fresh Results in Austin, TX"
  ],
  "caption": "Cleaned Smith's driveway, 3 hrs, all stains gone — call us for a free quote!"
}
```

**stub 拼接逻辑**（伪代码）：
```ts
function stubSuggest(input) {
  const verbs = { pressure_washing: ["Spotless", "Brought Back to New", "Gone in Hours"],
                  auto_detailing: ["Mirror Finish", "Showroom Clean", "Like-New Inside"] };
  const v = verbs[input.industry] ?? verbs.pressure_washing;
  return {
    headlines: [
      `${shortNoun(input.description) ?? "Driveway"} ${v[0]}`.slice(0, 36),
      `${input.businessName ?? "We"} ${v[1]}`.slice(0, 36),
      `Fresh Results in ${input.serviceArea ?? "Your Area"}`.slice(0, 36),
    ],
    caption: `${input.description} — call us for a free quote!`.slice(0, 200),
  };
}
```

`shortNoun()` 从 description 里抓第一个名词（粗糙正则即可，stub 容忍粗糙）。

**接 LLM 时**：换实现，输入输出契约不变 → 前端零改动。详见 `docs/launch-checklist.md` P1-6。

**注意**：AI Suggest 是**文本生成**（豆包 thinking），不属于"AI 改 after 图"那条扣费线。本次和 P1-5 切换后，AI Suggest 一直都不扣积分（成本极低 + 频繁交互场景）。如果未来发现 LLM 成本不可忽略，再单独设计 suggest 限频 / 计费。

---

## 9. 测试覆盖

| 测试文件 | 测试内容 |
|---|---|
| `tests/lib/poster-preview-cache.test.ts`（新） | cache set/get/expire；usedIndices 累加；downloadedDataUrls 写入；LRU 上限 |
| `tests/api/posters-preview-batch.test.ts`（改） | 渲染 3 张 360 缩略图 + cache 写入 + 原图存入；**断言永远不扣积分**；全失败不写 cache |
| `tests/api/posters-finalize.test.ts`（新） | **ENABLE_AI_FINALIZE=false（本次默认）**：新 index 不扣、写 post；同 index 重复 charged=0 不写库；410 过期；404 未知 batchId；500 渲染失败<br>**ENABLE_AI_FINALIZE=true**：新 index 扣 10、调 AI；402 积分不足；AI 失败 refund；同 index 仍 charged=0 |
| `tests/api/posters-suggest.test.ts`（新或改） | stub 行业差异化；description 抓名词；businessName/serviceArea fallback |
| `tests/lib/orientation-match.test.ts`（新） | landscape/portrait/square 推荐顺序；模板不足时返回数量正确 |

---

## 10. 非目标 / 不在本设计范围

- ❌ 接入豆包 AI 改图（launch-checklist P1-5）—— finalize 路径预留 `ENABLE_AI_FINALIZE` 切换点
- ❌ AI Suggest 真 LLM（launch-checklist P1-6）
- ❌ R2 上传（launch-checklist P1-4 —— finalize 临时走 dataURL fallback）
- ❌ multi-area collage 入口（launch-checklist P2-1）
- ❌ Redis / 跨实例 cache（cache 30min TTL 当前单实例足矣）
- ❌ 海报水印移除（仍按现有逻辑：免费用户加水印）
- ❌ AI Suggest 计费（成本暂忽略）

---

## 11. 风险

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Vercel serverless 冷启动丢 cache | 中 | 用户体验差但**不丢钱**（生成阶段就没扣，本次 finalize 也没扣） | 文档化；R2 + post 表持久化是 P1-4 真正修法 |
| BatchEntry 含原图 1-5 MB×2，100 个并发把 Node 内存吃光 | 中 | OOM | LRU 上限 200 → 生产建议 100；TTL 缩短到 15min |
| **AI 接入和扣费开关未同步切换** | 中 | 用户被冤扣 / 或反过来白嫖 AI 成本 | env 变量 `ENABLE_AI_FINALIZE` 控制两条逻辑分支共用同一个 if；测试覆盖两种 flag 状态 |
| 用户狂点不同模板 Download 压成本（AI 接入后） | 中 | 用户被多扣或抱怨 | confirm "Each new layout costs 10 credits (AI runs again)"；同 index 命中 cache 不重复扣 |
| 用户绕过前端 confirm 直接 fetch finalize（AI 接入后） | 低 | 用户自掏积分扣费 | server 端扣费在 finalize，confirm 仅 UX；用户绕过等于自愿扣费 |
| 缩略图被用户当成成品贴出去（本次免费可白嫖纯模板） | 低 | 收入损失 | 360×360 偏小，社媒会糊；本次免费正符合"AI 才扣费"原则，纯模板就是允许免费用 |
| description 含恶意脚本注入到 caption / headline | 低 | XSS | 前端 maxLength + 后端 trim + satori 自动 escape |

---

## 12. 上线前依赖

引用 `docs/launch-checklist.md`：
- P0-1 / P0-2（邮件 + Better Auth URL）— 本设计不依赖
- P1-3 数据库迁移 — 用到 post / generationHistory 表（已建）
- P1-4 R2 配置 — **强烈建议**上线前补；当前先走 dataURL fallback
- **P1-5 豆包 AI 改图接入 = ENABLE_AI_FINALIZE 翻转**：
  - 在 finalize 路径里 satori 渲 1080 之前插一步 `doubao-seededit-3-0-i2i-250628`
  - **同时**启用 canAfford(10) + 扣 10 积分（reason: `poster_ai_finalize`）
  - 这两件事必须**同步**：不能先开扣费、后接 AI；也不能先接 AI、后开扣费
  - 前端"Download"按钮：flag=false 时无价格、flag=true 时显示"Download · 10 credits" + confirm
  - 切换前先在 staging 用测试账号跑 QA-3
- P1-6 AI Suggest 真 LLM — 上线前替换 stub（默认不计费）

本设计完成后，QA-3 main flow 即可全功能验证（**按本次"AI 未接入、全程免费"语义**，生成 + 下载 + 重复下载 + 换模板 + 过期重生 全部跑通且积分不变）。
