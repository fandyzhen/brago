# 海报积分扣除 + 生成历史 — 设计 Spec

日期: 2026-05-22
状态: 已批准

---

## 目标

在现有海报渲染流程中接入积分消耗，并将每次生成记录持久化到数据库和 R2，让用户可在历史页面回看、下载、重新生成。

---

## 核心决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 积分消耗 | 10 积分/张 | 与对话消耗对齐 |
| 存储方案 | Cloudflare R2 | 图片永久保存，支持重新下载 |
| 执行模式 | 全流程内联（同步） | 原子性好，失败时回滚明确 |
| 历史页操作 | 下载 + 重新生成 | 完整闭环，重新生成跳转 /create 并预填参数 |

---

## 数据流

```
POST /api/posters/render
  1. getActiveSessionUser()              验证登录，未登录返回 401
  2. canUserAfford(userId, 10)           积分不足返回 402 + { error: "Insufficient credits" }
  3. 渲染 PNG（现有 satori + sharp）      失败返回 500，不扣分
  4. uploadPosterToR2(buffer, userId)    失败返回 500，不扣分
  5. deductCredits(userId, 10,           失败返回 500（R2 孤儿文件，可定期清理）
       "poster_generation")
  6. db.insert(generationHistory)        失败记录 error 日志，PNG 仍正常返回（降级）
  7. return PNG 字节流                   行为与现在完全一致，前端无感知
```

---

## 失败回滚策略

| 步骤失败 | 行为 |
|---|---|
| 渲染（步骤 3） | 不扣分，不写 DB，返回 500 |
| R2 上传（步骤 4） | 不扣分，不写 DB，返回 500 |
| 扣积分（步骤 5） | PNG 已上传 R2（孤儿文件），返回 500，不写历史 |
| 写历史（步骤 6） | 积分已扣，记录 error 日志，PNG 正常返回（降级处理） |

---

## 新增文件

```
lib/server/r2-poster.ts                       PNG → R2 上传工具函数
app/api/posters/history/route.ts              GET 历史列表（分页）
app/[locale]/(protected)/history/page.tsx     历史页面（客户端组件）
tests/lib/r2-poster.test.ts                   R2 上传单元测试
tests/api/posters-history.test.ts             历史 API 单元测试
```

## 修改文件

```
app/api/posters/render/route.ts               接入积分检查 + R2 + 历史写入
app/[locale]/(protected)/create/page.tsx      读取 URL query 参数预填 templateId + headline
features/navigation/components/user-menu.tsx  添加 History 导航链接
tests/api/posters-render.test.ts              补充 402 和历史写入的测试用例
```

---

## R2 上传模块

**文件：** `lib/server/r2-poster.ts`

```typescript
export async function uploadPosterToR2(
  buffer: Buffer,
  userId: string
): Promise<string | null>
```

- 文件名格式：`posters/{userId}/{timestamp}-{crypto.randomUUID().slice(0,8)}.png`
- 使用现有 `lib/r2-storage.ts` 的 S3 兼容客户端
- `STORAGE_BUCKET_NAME` 未配置时返回 `null`（本地开发降级）
- 成功返回 `STORAGE_PUBLIC_URL + "/" + key`

---

## API 设计

### `POST /api/posters/render`（修改）

新增行为：
- 请求开始时验证用户登录和积分
- 渲染成功后上传 R2、扣积分、写历史
- 响应格式不变（仍返回 PNG 字节流）

新增错误响应：
- `401 { error: "Unauthorized" }` — 未登录
- `402 { error: "Insufficient credits", required: 10, available: N }` — 积分不足

### `GET /api/posters/history`（新增）

**查询参数：**
- `limit`（可选，默认 20，最大 50）
- `cursor`（可选，上一页最后一条的 createdAt ISO 字符串，用于游标分页）

**响应：**
```json
{
  "items": [
    {
      "id": "xxx",
      "createdAt": "2026-05-22T10:00:00Z",
      "headline": "Driveway Clean",
      "templateId": "pressure_driveway_hero_split",
      "templateName": "Driveway Hero Split",
      "resultUrl": "https://cdn.example.com/posters/...",
      "creditsUsed": 10
    }
  ],
  "nextCursor": "2026-05-22T09:00:00Z",
  "hasMore": true
}
```

字段说明：
- `headline` 和 `templateId` 从 `generationHistory.metadata`（JSON 字符串）解析
- `templateName` 在 API 层从 `POSTER_TEMPLATES` 映射（不存库）
- `resultUrl` 为 null 时前端隐藏下载按钮

---

## 数据库

复用现有 `generationHistory` 表，无需迁移。字段映射：

| 表字段 | 存储内容 |
|---|---|
| `type` | `"poster"` |
| `prompt` | headline 文字 |
| `resultUrl` | R2 public URL（或 null） |
| `status` | `"completed"` |
| `creditsUsed` | `10` |
| `metadata` | `JSON.stringify({ templateId, headline })` |
| `error` | `null`（或失败原因） |
| `imageUrl` | 不使用（为 null） |
| `taskId` | 不使用（为 null） |

---

## 历史页面 UI

**路由：** `/history`（protected，复用 protected layout）

**组件结构：**
```
HistoryPage
  ├── 空状态（无记录时）→ CTA 跳转 /create
  └── 网格列表（有记录时）
        └── PosterHistoryCard × N
              ├── 缩略图（resultUrl，懒加载，无 URL 时显示占位符）
              ├── headline（截断超长文字）
              ├── templateName
              ├── 相对时间（"2 hours ago"）
              ├── "10 credits"
              ├── Download 按钮（target="_blank"，无 resultUrl 时禁用）
              └── Re-generate 按钮（→ /create?templateId=xxx&headline=yyy）
  └── Load More 按钮（hasMore 时显示，游标翻页）
```

---

## /create 页预填参数

URL query 参数 `?templateId=xxx&headline=yyy` 时自动填入表单。

修改位置：`app/[locale]/(protected)/create/page.tsx`

```typescript
// 读取 query 参数
const searchParams = useSearchParams();
const initTemplate = searchParams.get("templateId") ?? POSTER_TEMPLATES[0]?.id ?? "";
const initHeadline = searchParams.get("headline") ?? "";
// 用作 useState 初始值
const [selectedTemplate, setSelectedTemplate] = useState(initTemplate);
const [headline, setHeadline] = useState(initHeadline);
```

---

## 导航入口

在 `user-menu.tsx` 的 "Create Post" 链接下方添加 "History" 链接（IconHistory 图标）。

---

## 环境变量依赖

R2 功能依赖以下变量（未配置时优雅降级，resultUrl 存 null）：

```env
STORAGE_REGION=auto
STORAGE_BUCKET_NAME=your-bucket
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_PUBLIC_URL=https://your-public-domain.com
```

---

## 测试覆盖

### `tests/lib/r2-poster.test.ts`（新增）
- R2 已配置时：调用 S3 putObject，返回正确 publicUrl
- R2 未配置时（STORAGE_BUCKET_NAME 为空）：返回 null，不调用 S3

### `tests/api/posters-render.test.ts`（扩展）
- 未登录 → 401
- 积分不足 → 402，包含 required/available 字段
- R2 上传失败 → 500，不扣积分，不写历史
- 成功路径：调用 deductCredits，调用 db.insert(generationHistory)，返回 200 PNG

### `tests/api/posters-history.test.ts`（新增）
- 未登录 → 401
- 无历史记录 → `{ items: [], hasMore: false }`
- 有记录 → 返回正确字段结构，metadata 正确解析
- limit/cursor 参数生效

---

## 成功标准

- `pnpm test` 全绿（新增测试全部通过）
- `pnpm lint` 0 warnings
- 积分不足时 `/create` 生成按钮返回 402，前端提示"积分不足"
- 生成成功后 `/history` 出现新记录，缩略图可点击下载
- Re-generate 按钮跳转到 `/create` 并正确预填标题和模板
- R2 未配置时，历史记录正常写入但 resultUrl 为 null，UI 隐藏下载按钮
