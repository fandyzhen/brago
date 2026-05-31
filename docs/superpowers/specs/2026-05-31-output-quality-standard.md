# Spec：Brago 输出质量标准（图片 + 文案）

**Status**: Approved (2026-05-31)
**Scope**: 仅定义"Brago 生成的 GBP post 图 + caption 必须长什么样、不能长什么样"。**不**涵盖：水印实现代码、落地页文案、营销叙事、定价。这些是同一系列后续 spec。
**Owner**: fandyzhen
**触及代码**：`lib/brago/caption/*`, `lib/brago/vision/*`, `app/api/brago/anonymous/google-posts/[postId]/generate-caption/route.ts`, `app/api/brago/google-posts/[postId]/generate-caption/route.ts`（付费版同步生效）

---

## 0. 这份 spec 的来源

90% 决策来自一份可证伪的研究——**Sterling Sky 对 1,037 条真实 GBP post 的公开数据集**（[来源](https://www.sterlingsky.ca/google-posts/)）+ Google 官方 GBP 内容政策。**任何不在这份 spec 里出现的"好 post 应该…"建议都不属于硬标准**，可以但不强制。

定位前提（产品决策）：
- 心智占位：**"AI-fast, not AI-cheesy"** —— 同等速度，碾压"懒人工具"的输出质量
- 客群：服务业老板，要快**也**不想被认成"机器人发"
- 行业：pressure washing、auto detailing、cleaning 三个 P0；painting / roofing / HVAC 未来扩展候选
- 排除行业：plumbing、lawn care、carpet cleaning、handyman、tree、junk、pest——这些行业要么 before/after 视觉不强，要么实际 GBP 采纳率 0（前面 20 商家采样数据）

---

## 1. 图片生成标准

### 1.1 选图来源（绝对禁止 AI 生成图）

- **唯一允许**：用户上传的真实照片
- **绝对禁止**：
  - AI 生成的"示意图 / 插画 / 库存图"
  - 大幅修图（>色彩 / 曝光矫正以外的任何调整）
  - 美化、滤镜、风格化
- **依据**：
  - Google 政策：["Photos must reflect reality, no significant alterations"](https://support.google.com/business/answer/7400114?hl=en)
  - Sterling Sky 数据：**真实图比库存图点击高 5.6×**（2.13 vs 0.38 平均点击）
- **失败后果**：Google 可能下架 post + 商家 GBP profile 被标记。**这是 Brago 最大的政策风险。**

### 1.2 vision 选图决策树

由 `lib/brago/vision/provider.ts` 内部逻辑实现：

```
输入：用户上传的 N 张照片（1 ≤ N ≤ 9）

if N == 1:
  vision 判断 role ∈ {before, after, process, other}
  if role == "after":   → 单图输出
  if role == "before":  → 警告"看起来是开工前的照片，建议补一张完工后的"
  if role == "process": → 单图输出 + caption 强调"in progress"叙事
  if role == "other":   → 警告"无法识别为工作照，建议换一张"

elif N >= 2:
  vision 对每张打分 + 检测是否存在 before/after 对
  if 存在可信 before/after 对（同角度 + 同主体 + 状态明显差异 + pairConfidence > 0.7）:
    → 合成输出（见 1.3）
  else:
    → 挑分数最高的 after 单图输出
```

vision provider 已返回 `proofRecommendation: { mode, beforePhotoId, afterPhotoId, pairConfidence }`，可直接消费。

### 1.3 before/after 合成布局（**不是 50/50 split**）

研究依据：GBP 缩略图 100-150px 宽。50/50 split 让 before 和 after 各占 50-75px，**低于"thumbnail 可读"阈值 120px**（[来源](https://www.thumbmagic.co/blog/thumbnail-design-principles)）。

**唯一允许的布局**：**主 after + 角落 before 内嵌**

```
┌────────────────────────────────────┐
│                                    │
│                                    │
│        AFTER（主图）                │  ← 占 100% 画布
│        全幅、原始比例 4:3           │
│        中心 70% 是 safe-zone        │
│                                    │
│                                    │
│   ┌──── overlay text bar ────┐    │
│   │  PARK SLOPE · DRIVEWAY   │    │ ← 底部叠加（见 1.4）
│   └─────────────────────────┘    │
│                                    │
│   ┌──────────┐                    │
│   │  BEFORE  │  ← 右下角内嵌      │
│   │  (small) │  20-25% canvas     │
│   └──────────┘                    │
└────────────────────────────────────┘
```

技术参数：
- 输出比例：4:3（1200×900px，Google 推荐 [来源](https://support.google.com/business/answer/6103862?hl=en)）
- safe-zone：中心 70% 矩形，关键内容（人脸、地址牌、关键 before/after 接缝）必须在此区域内
  - 原因：Maps carousel 会自动 center-crop 成正方形
- before 内嵌框：右下角，宽度 = canvas 宽度 × 22%，2px 白色描边，3px 内白角
- before 框上方贴小标 "BEFORE"，红色背景 + 白字，sans-serif bold 12pt（按 1200×900 比例）

**绝对禁止**：
- 50/50 左右对称 split
- 50/50 上下对称 split
- 滑块 / 渐变过渡
- 多区域 collage（4 格以上拼贴）

### 1.4 overlay 文字（强制）

研究依据：Sterling Sky 1,037 post 分析——**图上有文字的 post 点击是无文字的 4×**（2.03 vs 0.59）

**必须出现的 overlay 文字**：
- 内容：`[CITY] · [SERVICE]` 例如 `PARK SLOPE · DRIVEWAY` 或 `AUSTIN · CERAMIC COATING`
- 字数：3-5 个英文词（中文场景 4-8 个汉字）
- 字体：粗体 sans-serif（推荐 Inter Black / Bebas Neue / 思源黑体 Heavy）
- 字号：canvas 高度的 6-8%（在 1200×900 上即 54-72px）
- 颜色：白字 + 黑色描边 2px（保证任何背景可读）
- 位置：底部居中，距离 canvas 下边缘 10% 高度
- 缩略图可读性测试：**渲染时同步生成 150×150 缩略图，文字必须仍可读**（自动测试，render-time gate）

**不可出现在 overlay 中**：
- 电话号码（Google 政策违规）
- URL
- 商家全名（已由 1.5 水印负责）
- 价格 / 折扣（属于 Offer post 类型，本 spec 不覆盖）

### 1.5 水印逻辑（**用户的品牌，不是 Brago 的**）

**绝对禁止**：在生成图上加任何 "Brago" 字样、logo、attribution。理由：
- 用户的 post 是用户的资产
- "Brago" 水印让 post 看起来"是某 SaaS 帮我做的"，主动降低用户的专业感
- 真实案例 100% 用商家自己的水印（American Dream / Huracán Nero / Molly Maid / CertaPro 等）

**水印决策树**：

```
if user.logoUrl 存在:
  → 渲染 logo
  - 位置：右下角，距右边缘和下边缘各 5% canvas
  - 大小：高度 = canvas 高度 × 12%
  - 透明度：70%
  - 不裁切、不变形（自动保持原比例）

elif user.businessName 存在（仅文字）:
  → 渲染文字水印
  - 内容：商家名（最多 30 字符，超出截断 + ellipsis）
  - 字体：Inter Black 或 Bebas Neue，字号 = canvas 高度 × 3.5%
  - 位置：右下角，5% margin
  - 颜色：白字 + 黑色描边 1.5px
  - 透明度：80%

else（无 logo 无商家名）:
  → 不加任何水印
  - 包括不加 Brago 水印
```

**配合 caption 生成**：如果 Brago 想保留 attribution（合理诉求），**只能**在 caption 末尾极小字 `· brago.ai` 或类似。**不能**在图上。
该 attribution 是否启用，由付费版/免费版区分决定（不在本 spec 范围）。

### 1.6 必须项（hard gate，不通过则拒绝输出）

| 项 | 验证方式 | 失败后果 |
|---|---|---|
| 没用 AI 生成图 / 没大幅修图 | server-side 标签传递，禁止图生成代码路径 | 阻塞 |
| 真实照片 EXIF / 上传时间戳合法 | 上传时打 metadata | 阻塞（防伪造） |
| overlay 文字在 150×150 缩略图可读 | render-time 缩放 + OCR 验证 ≥ 80% 字符识别 | 重新渲染 |
| 中心 70% safe-zone 内有主体 | vision 分析判断 | 提示用户重选 |
| 不含可识别人脸（除非用户授权）+ 不含车牌 + 不含门牌号 | vision 已实现 `riskFlags` | 自动模糊 / 提示 |
| 输出尺寸 1200×900 px ±5% | 渲染管道校验 | 阻塞 |
| 文件大小 ≤ 5MB（Google 上限） | 输出层验证 | 自动压缩到合规 |

---

## 2. 文案生成标准

### 2.1 长度（基于截断行为）

研究依据：
- Mobile SERP 截断 ≈ 200-250 字符（出现 "Read more" 链接）
- Maps carousel 截断 ≈ 100-150 字符
- 80% 阅读发生在卡片预览（不点开）

**硬规则**：
- **标题**：**必须**有，正常 case，**绝不**全大写（Sterling Sky 数据：全大写标题 -41% 点击）
  - 长度：30-50 字符
- **正文**：
  - 前 100 字符必须自含完整 value prop（服务 + 地点 + 时间锚定中至少 2 个）
  - 总长度：100-200 字符（mobile 卡片可读 + 不被截太狠）
  - **绝不**超过 300 字符
- **末尾**：CTA 短语（"Book today" / "Call us" / "Learn more"）+ 可选 1-2 个 emoji

**反例**（American Dream 风格——200 字泛模板）→ **拒绝**。

### 2.2 内容必须项

每条 caption 必须包含：

1. **具体服务名**（如 "concrete driveway clean" 而不是 "exterior cleaning"）
2. **具体地点**（neighborhood 优先 > city > region；如 "Park Slope" 而不是 "Brooklyn"）
3. **时间锚定**（"this morning" / "yesterday" / "today's" / "before the holiday weekend"）
4. **一个具体细节**（来自用户的 "Anything stand out?" 输入；如果用户没填，vision 提供——如"30+ ft pollen-stained driveway"）

如果用户没填 #4 且 vision 无法推断 → **caption 中不可编造细节**，宁可省略 → 不允许"AI 编造客户名 / 时长 / 价格"。

### 2.3 反模板硬规则（最重要）

**绝对禁止的措辞模式**（黑名单）：
- "trusted by [city] drivers/homeowners"
- "expert [service] in [city]"
- "professional [service] you can count on"
- "your local [service]" + city
- "we offer reliable [service]"
- "high-quality [service] at affordable prices"
- "best [service] in [city]"（违反 Google policy "no superlatives without proof"）
- "guaranteed satisfaction"
- 任何 "[city] X [city] Y [city] Z" 的关键词堆砌结构

**结构反模式**（禁止）：
- 三段式生硬模板（"This post shows…" → 段 2 → 段 3 → "Services available:"）
- 末尾贴 bullet list "Services available:"（American Dream 套路）

### 2.4 反重复硬规则（防 Google spam 检测）

研究依据：Google spam 检测会标记"template farming"（多商家共用同一模板 + 仅替换地名）。

**30 天内**对同一 anon_id / user_id 生成的 caption：
- 不允许 caption 结构相似度 > 70%（n-gram diff 检测）
- 不允许标题首词重复
- 不允许相同的 emoji 组合
- 不允许同样的 CTA 措辞两次连用

实现：维护最近 30 天的 caption history（已有 `captionHistory` 表），生成前 fetch + 比对，超阈值则重新生成或微调。

### 2.5 CTA 与内容对齐

研究依据：Sterling Sky 数据
- Specials/discounts post 类型：6.04 平均点击（最高）
- CTAs/urgency：2.71
- 教育内容：1.04（最低）

**post 类型 → CTA 映射**：
| post 类型（由 vision + 用户输入判断） | 强制 CTA |
|---|---|
| 完工照（最常见）| "Call now" 或 "Book" |
| 团队 / 业务介绍 | "Learn more" |
| 季节 / 服务说明 | "Learn more" |
| 教育内容（"how to choose...") | "Learn more" |
| **绝不** | 任何 post 上用 "Buy" / "Order online" / "Get offer" / "Sign up"（除非业务真实匹配） |

CTA 文案不能与正文矛盾（不允许"教育型 caption 接 Call now"）。

### 2.6 政策合规（policy.ts 已实现，强化）

现有 `lib/brago/caption/policy.ts` 检查的项继续保留，**新增**：
- 全大写检测：不允许 caption 任何位置出现 >3 个连续大写英文词（缩写除外，需 OCR-style 白名单 GBP、CTA、USA 等）
- 商家名重复检测：caption 内商家名出现 > 1 次 → 警告
- emoji 数量：>2 个 → 警告（Sterling Sky 数据：1-2 个 emoji 比 0 个高 2× 点击，>2 反而开始 spam-y）
- 结构相似度（与 2.4 联动）

### 2.7 多语言（en + es，**不含中文**）

**重要术语区分**：
- **网站 UI 语言**（i18n / next-intl）：`en` + `zh`——给开发者 / 管理端用，跟本 spec 无关
- **caption 输出语言**（本 spec 涵盖）：**仅** `en` 和 `es`（西班牙语）

**为什么 caption 没有中文**：
- 目标市场是美国本地服务业
- Google 不在中国运营 GBP
- 中文 caption 不解决任何真实用户问题——明确**不**支持

**为什么必须有西班牙语**：
- ~6200 万西语裔美国人，是服务业核心客群（Miami / LA / Houston / NYC / Chicago / Tampa 等市场尤甚）
- **双语发文（en + es 各一条）是服务业 GBP 的真实差异化**——前面真实案例 Huracán Nero Auto Spa (Austin) 同时服务英 / 西客户
- 西语 caption **不是**英文机翻——必须用 native Spanish 写（"limpieza profunda" 比 "deep cleaning" 直译更地道）

**西班牙语 caption 硬规则**：
- 所有 2.1-2.6 的结构规则**全部适用**（长度 / 标题 / 反模板 / 反重复 / CTA / policy）
- 措辞必须为**美式西语**（不是西班牙的卡斯蒂利亚西语）——"carro" 而非 "coche"，"cuadra" 而非 "manzana"
- 黑名单同步翻译："experto / profesional / confiable / mejor en [ciudad]" 也禁
- emoji 规则同英文（1-2 个，不超过 2 个）
- 同一商家可同时生成 en + es 两条 post（不算"30 天内重复"——它们是同一内容的不同语言版本）

**实现**：
- 已有 `language: CaptionLanguage = "en" | "es"` 类型完全够用
- 不要新增 `"zh"` 选项到 caption 路径
- 用户可在 result 页选"再生成西班牙语版"（已是 Brago 计划中的解锁功能之一）

---

## 3. Brago 质量评分（用于 eval + 自我提升）

为每个 caption + 图组合计算 0-100 分。**所有 must-pass 项不通过则总分 = 0**（拒绝输出）。

### 3.1 Must-pass hard gates（11 项）

```
must_pass = [
  no_ai_generated_image,           # 图片来自真实上传
  no_significant_alteration,       # 仅色彩/曝光矫正
  no_brago_watermark_on_image,     # 水印是用户的（或无）
  has_overlay_text_3_to_5_words,   # 图上叠 3-5 字
  thumbnail_text_readable_at_150px,# 缩略图可读测试通过
  caption_has_title_proper_case,   # 有标题、正常 case
  no_all_caps_in_title,            # 标题不全大写
  caption_100_to_300_chars,        # 总长度合规
  first_100_chars_has_value_prop,  # 前 100 字含 service+地点+时间锚定 ≥ 2 个
  no_blacklisted_phrases,          # 不含黑名单措辞
  caption_not_70pct_similar_recent_30d, # 反模板
]
```

任一不通过 → 拒绝输出 + 触发重新生成（最多 3 次，3 次失败则降级到模板）。

### 3.2 加权评分项（满分 100）

| 维度 | 权重 | 检测 |
|---|---|---|
| Authenticity 真实感 | 25 | 真实照片标签 + 无模板措辞 + 有具体细节（用户输入或 vision 推断） |
| Thumbnail clarity 缩略图清晰 | 20 | safe-zone 主体占 ≥ 60% + overlay 文字 OCR 通过 + 主色高对比 |
| Caption craft 文案质量 | 15 | 前 100 字密度 + 句长 < 20 词 + 无空话词（"trusted/professional/expert"） |
| CTA-content alignment | 10 | CTA 与正文意图匹配（不允许教育型接 Call now） |
| Local specificity 本地性 | 15 | neighborhood 名 + 季节 / 日期锚定 + 服务子类精准 |
| Anti-template 反模板 | 15 | 与最近 30 天历史 n-gram 差异 ≥ 30% + 与公开模板（Brago 内部维护一份 "American Dream 反例集"）差异 ≥ 60% |

**通过线**：≥ 70/100 才算合格输出。

### 3.3 Eval 集（必须建）

至少 50 组测试用例，分行业、按真实照片 + 用户输入：
- 输入：真实照片 1-5 张 + 行业 + 地点 + (可选) 1 句细节
- 验证：Brago 输出 + American Dream 模板（人工写的反例）+ Huracán Nero SEO 风格（人工写的反例）三者按 3.1 + 3.2 评分
- **必须**：Brago 平均分 ≥ American Dream + 25 分，否则 prompt 没做对

eval 集放在 `tests/brago/quality/eval-set.json`（spec 不规定具体测试用例，由实施阶段补全）。

---

## 4. Anti-patterns（明确黑名单）

代码 review + prompt 都必须显式阻断：

### 4.1 图片相关

- ❌ 任何 AI 生成图（包括"用户没上传我们用 placeholder"）
- ❌ AI 修复 / 美化 / 超分辨率（这些都属于 "significant alteration"）
- ❌ Brago logo / 文字水印
- ❌ 50/50 split before/after
- ❌ 滑块 / 渐变 / 多格 collage
- ❌ 主体不在中心 70% safe-zone
- ❌ 用户人脸 / 车牌 / 门牌号未模糊（除明确授权）
- ❌ 第三方 logo / 品牌出镜（除非用户是该品牌授权代理）

### 4.2 文案相关

- ❌ "trusted / expert / professional / reliable / quality / best" 等空话形容词出现
- ❌ "[city] X [city] Y" 关键词堆砌
- ❌ "Services available:" + bullet list 结构
- ❌ 全大写超过 3 个连续词
- ❌ caption 中含电话号码 / URL / 邮箱
- ❌ "guaranteed" / "100%" / "the only" 等绝对化措辞
- ❌ AI 编造客户名 / 时长 / 价格 / 评价（用户没输入就不能写）
- ❌ 30 天内 n-gram 相似度 > 70% 的 caption
- ❌ 教育 / 季节型 caption 接 "Call now" CTA
- ❌ 任何 "✨🎉🔥" 之类 > 2 个 emoji
- ❌ 中文场景 caption 中机器翻译腔（"我们的专业团队致力于为您提供…"）

---

## 5. 不在本 spec 范围内的东西

明确**不**定义、留给后续 spec：
- 水印实现的具体代码改动（应该有独立 spec `2026-06-XX-watermark-customer-only.md`）
- 落地页营销文案（"AI-fast, not AI-cheesy" 叙事）
- 定价 / 套餐
- result 页 UI 改造
- 用户上传 logo 的 UX 流程
- post 发布到 GBP API 自动化（如果以后做）

---

## 6. Open questions（写在 spec 里强迫产品决策）

下列问题在实施前必须有答案：

1. **如果用户既没上传 logo 也没填商家名，图上完全无水印**——这条 post 看起来更可能被 Google 当成"匿名 spam"还是被用户当成"干净专业"？目前没有数据，**第一版默认无水印**，看上线后 5% 用户的反馈再决定要不要加默认文字水印。

2. **before/after 合成图当 "before" 不存在时怎么办**——用户只传了 after，Brago 不能伪造 before。此时退到单图输出。**用户的预期管理**：result 页要明确说"我们没看到 before 照片，所以这张是 after 单图"——不能让用户以为我们偷懒。

3. **30 天反模板检测对匿名用户怎么工作**——匿名用户没历史。**第一版**：匿名用户每天最多 1 条（已有限流），所以"30 天内不重复"自然满足。注册用户：开始累积 caption history。

4. **eval 评分什么时候纳入 CI**——caption 生成路径已经在 prod，eval 集如果立即上线 hard gate 会大幅降低输出率。**渐进策略**：先采集 1000 条真实输出 → 给评分 → 看分布 → 决定阈值 → 上 gate。

5. **政策风险触发后怎么处理**——如果某用户的图 / caption 触发了 Google policy 警告（被下架）→ Brago 是否应该自动通知 + 锁定该用户当周的输出 + 提供"为什么被下架"教学？暂定**是**，但需要后续 spec 设计这条流程。

---

## 7. 关键来源（按可信度排序）

- 🟢 Sterling Sky 1,037-post 数据集：[https://www.sterlingsky.ca/google-posts/](https://www.sterlingsky.ca/google-posts/)
- 🟢 Sterling Sky 9-week 441-keyword ranking 实验：[https://www.sterlingsky.ca/do-google-posts-impact-ranking/](https://www.sterlingsky.ca/do-google-posts-impact-ranking/)
- 🟢 Google 官方 GBP photo policy：[https://support.google.com/business/answer/6103862](https://support.google.com/business/answer/6103862)
- 🟢 Google 官方 GBP post policy：[https://support.google.com/business/answer/7213077](https://support.google.com/business/answer/7213077)
- 🟢 Google 官方 prohibited & restricted content：[https://support.google.com/business/answer/7400114](https://support.google.com/business/answer/7400114)
- 🟡 YouTube thumbnail readability principles（迁移到 GBP thumbnail）：[https://www.thumbmagic.co/blog/thumbnail-design-principles](https://www.thumbmagic.co/blog/thumbnail-design-principles)
- 🟡 Visual Depiction Effect 学术：[https://www.researchgate.net/publication/239810633](https://www.researchgate.net/publication/239810633)

任何不在本列表的"GBP 最佳实践"建议（包括各种 SEO 代理博客）**不进 spec**。

---

**最后更新**：2026-05-31
**实施 plan**：见 `docs/superpowers/plans/2026-06-XX-output-quality-implementation.md`（待写）
