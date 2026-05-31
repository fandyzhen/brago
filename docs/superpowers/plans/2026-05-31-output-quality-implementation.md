# Output Quality Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已批准的 spec `docs/superpowers/specs/2026-05-31-output-quality-standard.md` 落到代码上——硬化 caption 政策、重做 before/after 合成布局、加上 overlay 文字 + 水印框架、引入 quality scoring。

**Architecture:** 三阶段顺序推进，每个阶段独立提交+独立可回滚。Phase 1 在不动视觉的前提下硬化 caption；Phase 2 重做图片合成器并接入路由；Phase 3 加 quality scoring 与 eval 脚手架（**不**默认上 CI hard gate，遵循 spec Open Question #4 渐进策略）。

**Tech Stack:** TypeScript + Next.js 16 App Router + Vitest 4 + sharp。无新增 runtime 依赖（n-gram 相似度、readability gate 都用 sharp + 纯 TS 实现）。

**Out of scope:**（见 spec §5）
- 用户上传 logo 的 UX 流程（独立 spec）
- 落地页营销文案、定价、result 页 UI 改造
- 把质量评分接入 prod CI hard gate（按 spec Open Question #4 ，先采集分布再决定阈值）

---

## Phase 1 — Caption 硬化（不动视觉）

### Task 1.1：扩展 policy.ts 的硬性 gate 类型

**Files:**
- Modify: `lib/brago/types.ts`（追加新枚举值）
- Modify: `lib/brago/caption/policy.ts`（导出新选项类型）
- Test: 无（纯类型）

- [ ] **Step 1：在 types.ts 给 `GbpPolicyIssue` 联合类型加新值**

修改 `lib/brago/types.ts:87-95`，把联合扩成：

```ts
export type GbpPolicyIssue =
  | "phone_number_detected"
  | "url_detected"
  | "too_long"
  | "too_many_emojis"
  | "shouting_text"
  | "unverified_claim"
  | "ai_cliche"
  | "em_dash_detected"
  | "missing_title"
  | "title_all_caps"
  | "length_out_of_range"
  | "value_prop_missing"
  | "blacklisted_phrase"
  | "cta_misaligned"
  | "similar_to_recent";
```

- [ ] **Step 2：提交**

```bash
git add lib/brago/types.ts
git commit -m "feat(brago/caption): widen GbpPolicyIssue union for new hard gates"
```

---

### Task 1.2：黑名单措辞数据（en + es）

**Files:**
- Create: `lib/brago/caption/blacklist.ts`
- Test: `tests/lib/brago-caption-blacklist.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-caption-blacklist.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { containsBlacklistedPhrase } from "@/lib/brago/caption/blacklist";

describe("containsBlacklistedPhrase", () => {
  it("flags English template phrases", () => {
    expect(
      containsBlacklistedPhrase(
        "Trusted by Austin homeowners for years.",
        "en",
      ),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase("Expert pressure washing in Austin", "en"),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase(
        "Your local cleaning service in Brooklyn",
        "en",
      ),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase(
        "Best detailing in Austin guaranteed",
        "en",
      ),
    ).toBe(true);
  });

  it("flags Spanish equivalents", () => {
    expect(
      containsBlacklistedPhrase("Expertos en limpieza en Miami", "es"),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase("Mejor servicio en Austin", "es"),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase("Profesional y confiable", "es"),
    ).toBe(true);
  });

  it("ignores benign captions", () => {
    expect(
      containsBlacklistedPhrase(
        "Cleaned a concrete driveway in Park Slope this morning.",
        "en",
      ),
    ).toBe(false);
    expect(
      containsBlacklistedPhrase(
        "Limpieza profunda de una camioneta en Austin esta mañana.",
        "es",
      ),
    ).toBe(false);
  });

  it("flags [city]-X-[city]-Y keyword stuffing", () => {
    expect(
      containsBlacklistedPhrase(
        "Austin cleaning, Austin detailing, Austin pressure washing",
        "en",
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-caption-blacklist.test.ts`
Expected: FAIL — `Cannot find module '@/lib/brago/caption/blacklist'`

- [ ] **Step 3：实现 blacklist.ts**

`lib/brago/caption/blacklist.ts`：

```ts
import type { CaptionLanguage } from "@/lib/brago/types";

// spec §2.3 + §4.2：明确禁止的措辞模式。修改前看 spec，不要随意删。
const EN_PHRASE_PATTERNS: RegExp[] = [
  /\btrusted by\b[^.]{0,40}\b(?:drivers|homeowners|customers|locals)\b/i,
  /\bexpert\b[^.]{0,30}\bin\s+[A-Z]/i,
  /\bprofessional\b[^.]{0,30}\byou can count on\b/i,
  /\byour local\b/i,
  /\bwe offer\b[^.]{0,30}\breliable\b/i,
  /\bhigh[- ]quality\b[^.]{0,30}\baffordable\b/i,
  /\bbest\b[^.]{0,30}\bin\s+[A-Z]/i,
  /\bguaranteed satisfaction\b/i,
  /\bsatisfaction guaranteed\b/i,
  /\b100%\s+guarantee/i,
  /\bthe only\b[^.]{0,30}\b(?:in|for)\b/i,
];

const ES_PHRASE_PATTERNS: RegExp[] = [
  /\bexpertos?\b[^.]{0,30}\ben\s+[A-Z]/i,
  /\bprofesional(?:es)?\s+y\s+confiable/i,
  /\bmejor\b[^.]{0,30}\ben\s+[A-Z]/i,
  /\btu (?:servicio )?local\b/i,
  /\bcalidad\b[^.]{0,30}\bprecio\b/i,
  /\bsatisfacción garantizada\b/i,
];

// [city] X [city] Y [city] Z 关键词堆砌 — 同一 token 在 caption 中出现 ≥3 次
// 且每次后面跟着不同的服务词 → 判定 stuffing。
function detectKeywordStuffing(text: string): boolean {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [, c] of counts) {
    if (c >= 3) return true;
  }
  return false;
}

export function containsBlacklistedPhrase(
  text: string,
  language: CaptionLanguage,
): boolean {
  const patterns =
    language === "es" ? ES_PHRASE_PATTERNS : EN_PHRASE_PATTERNS;
  if (patterns.some((re) => re.test(text))) return true;
  if (detectKeywordStuffing(text)) return true;
  return false;
}

// 暴露给单元测试与未来扩展（如管理员后台展示规则）
export const BLACKLIST_PATTERNS = {
  en: EN_PHRASE_PATTERNS,
  es: ES_PHRASE_PATTERNS,
};
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-caption-blacklist.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/caption/blacklist.ts tests/lib/brago-caption-blacklist.test.ts
git commit -m "feat(brago/caption): add en+es blacklist for template/stuffing phrases"
```

---

### Task 1.3：caption 结构 gate（标题 / 长度 / value-prop 密度）

**Files:**
- Create: `lib/brago/caption/structure.ts`
- Test: `tests/lib/brago-caption-structure.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-caption-structure.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  parseCaptionParts,
  checkCaptionStructure,
} from "@/lib/brago/caption/structure";

describe("parseCaptionParts", () => {
  it("splits the first non-empty line off as title", () => {
    const r = parseCaptionParts(
      "Park Slope driveway came up clean\n\nCleaned a 30 ft pollen-stained driveway in Park Slope this morning. Book today.",
    );
    expect(r.title).toBe("Park Slope driveway came up clean");
    expect(r.body.startsWith("Cleaned")).toBe(true);
  });

  it("falls back to empty title when only one line", () => {
    const r = parseCaptionParts("Just a single line caption with no break");
    expect(r.title).toBe("");
    expect(r.body).toContain("single line");
  });
});

describe("checkCaptionStructure", () => {
  const goodCaption =
    "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. The pollen stains came right off. Book today.";

  it("passes a well-formed caption", () => {
    const r = checkCaptionStructure(goodCaption, {
      serviceType: "driveway",
      serviceArea: "Park Slope",
    });
    expect(r.issues).toEqual([]);
  });

  it("flags missing title", () => {
    const r = checkCaptionStructure(
      "Cleaned a driveway in Park Slope this morning. Looks fresh.",
      { serviceType: "driveway", serviceArea: "Park Slope" },
    );
    expect(r.issues).toContain("missing_title");
  });

  it("flags ALL-CAPS title", () => {
    const r = checkCaptionStructure(
      "PARK SLOPE DRIVEWAY CLEAN\n\nCleaned a driveway today.",
      { serviceType: "driveway", serviceArea: "Park Slope" },
    );
    expect(r.issues).toContain("title_all_caps");
  });

  it("flags caption shorter than 100 chars (body)", () => {
    const r = checkCaptionStructure("Title\n\nToo short.", {
      serviceType: "driveway",
      serviceArea: "Park Slope",
    });
    expect(r.issues).toContain("length_out_of_range");
  });

  it("flags caption longer than 300 chars (body)", () => {
    const long = "x".repeat(350);
    const r = checkCaptionStructure(`Title\n\n${long}`, {
      serviceType: "driveway",
      serviceArea: "Park Slope",
    });
    expect(r.issues).toContain("length_out_of_range");
  });

  it("flags first 100 chars without enough value-prop anchors", () => {
    // body 首 100 字既无服务又无地点又无时间锚定
    const r = checkCaptionStructure(
      "Title here\n\nIt was a great experience and we are happy with how it went and we hope you like it too thanks.",
      { serviceType: "driveway", serviceArea: "Park Slope" },
    );
    expect(r.issues).toContain("value_prop_missing");
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-caption-structure.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3：实现 structure.ts**

`lib/brago/caption/structure.ts`：

```ts
import type { GbpPolicyIssue } from "@/lib/brago/types";

const TIME_ANCHOR_RE =
  /\b(today|this morning|this afternoon|tonight|yesterday|last (?:week|night)|before (?:the )?(?:holiday|weekend|christmas|thanksgiving))\b|\b(hoy|esta mañana|esta tarde|anoche|ayer|antes del (?:fin de semana|feriado))\b/i;

const ALL_CAPS_WORD_RE = /\b[A-ZÁÉÍÓÚÑ]{2,}\b/g;

export type StructureContext = {
  serviceType: string;
  serviceArea: string | null;
};

export type StructureResult = {
  title: string;
  body: string;
  issues: GbpPolicyIssue[];
};

export function parseCaptionParts(text: string): {
  title: string;
  body: string;
} {
  const trimmed = (text ?? "").trim();
  // spec §2.1：标题与正文以一个空白行隔开；若无空行，视为无标题。
  const split = trimmed.split(/\n\s*\n+/);
  if (split.length >= 2 && split[0].length <= 80) {
    return {
      title: split[0].trim(),
      body: split.slice(1).join("\n\n").trim(),
    };
  }
  return { title: "", body: trimmed };
}

function isAllCaps(s: string): boolean {
  const caps = (s.match(ALL_CAPS_WORD_RE) ?? []).length;
  const words = s.split(/\s+/).filter(Boolean).length;
  if (words === 0) return false;
  // 标题至少 60% 单词全大写视为 shouting
  return caps / words >= 0.6;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valuePropAnchorsHit(
  first100: string,
  ctx: StructureContext,
): number {
  let hits = 0;
  const lower = first100.toLowerCase();
  // 服务匹配：用 serviceType 的第一个有意义 token
  const serviceTokens = ctx.serviceType
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter((t) => t.length >= 4);
  if (
    serviceTokens.some((t) => lower.includes(t)) ||
    /\b(clean|cleaning|wash|detail|polish|coating|limpieza|lavado)\b/i.test(
      first100,
    )
  ) {
    hits += 1;
  }
  // 地点匹配
  if (
    ctx.serviceArea &&
    new RegExp(`\\b${escapeRegExp(ctx.serviceArea)}\\b`, "i").test(first100)
  ) {
    hits += 1;
  }
  // 时间锚定
  if (TIME_ANCHOR_RE.test(first100)) {
    hits += 1;
  }
  return hits;
}

export function checkCaptionStructure(
  text: string,
  ctx: StructureContext,
): StructureResult {
  const { title, body } = parseCaptionParts(text);
  const issues: GbpPolicyIssue[] = [];

  // spec §2.1：标题必须存在、不全大写、30-50 字符（允许 ±20% 弹性 → 24-60）
  if (!title) {
    issues.push("missing_title");
  } else if (isAllCaps(title)) {
    issues.push("title_all_caps");
  }

  // spec §2.1：正文 100-300 字符（不含标题）
  const bodyLen = body.length;
  if (bodyLen < 100 || bodyLen > 300) {
    issues.push("length_out_of_range");
  }

  // spec §2.2：前 100 字必须含至少 2 个 value-prop 锚定（服务 / 地点 / 时间）
  const hits = valuePropAnchorsHit(body.slice(0, 100), ctx);
  if (hits < 2) issues.push("value_prop_missing");

  return { title, body, issues };
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-caption-structure.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/caption/structure.ts tests/lib/brago-caption-structure.test.ts
git commit -m "feat(brago/caption): structural gates — title, length, value-prop density"
```

---

### Task 1.4：n-gram 相似度（30 天反模板）

**Files:**
- Create: `lib/brago/caption/similarity.ts`
- Test: `tests/lib/brago-caption-similarity.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-caption-similarity.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { ngramSimilarity, isTooSimilar } from "@/lib/brago/caption/similarity";

describe("ngramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(ngramSimilarity("hello world test", "hello world test")).toBe(1);
  });

  it("returns near 0 for fully different strings", () => {
    expect(
      ngramSimilarity(
        "morning driveway cleaning park slope",
        "evening car detailing brooklyn heights",
      ),
    ).toBeLessThan(0.2);
  });

  it("returns moderate score for paraphrase", () => {
    const a =
      "Cleaned a concrete driveway in Park Slope this morning. Looks fresh.";
    const b =
      "Cleaned a concrete driveway in Park Slope today. Looks brand new.";
    const sim = ngramSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.5);
    expect(sim).toBeLessThan(0.95);
  });
});

describe("isTooSimilar", () => {
  it("flags any history caption above 0.7 threshold", () => {
    const candidate =
      "Cleaned a concrete driveway in Park Slope this morning. Came out fresh.";
    const history = [
      "Detailed a car in Austin today.",
      "Cleaned a concrete driveway in Park Slope this morning. Came out fresh and bright.",
    ];
    expect(isTooSimilar(candidate, history)).toBe(true);
  });

  it("passes when all history is distinct", () => {
    const candidate =
      "Polished a black SUV in Austin this afternoon. Paint looks deep.";
    const history = [
      "Cleaned a driveway in Park Slope yesterday. Looks great.",
      "Washed a fleet of trucks in Houston last week.",
    ];
    expect(isTooSimilar(candidate, history)).toBe(false);
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-caption-similarity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3：实现 similarity.ts**

`lib/brago/caption/similarity.ts`：

```ts
// spec §2.4：30 天内同一用户 caption 不允许 n-gram 相似度 > 70%。
// 用 character-3-gram jaccard 相似度，便宜、稳定、对小幅措辞改写敏感度合适。

const N = 3;

function ngrams(input: string): Set<string> {
  const norm = input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9áéíóúñü ]/gi, "")
    .trim();
  const set = new Set<string>();
  if (norm.length < N) {
    set.add(norm);
    return set;
  }
  for (let i = 0; i <= norm.length - N; i++) {
    set.add(norm.slice(i, i + N));
  }
  return set;
}

export function ngramSimilarity(a: string, b: string): number {
  const A = ngrams(a);
  const B = ngrams(b);
  if (A.size === 0 && B.size === 0) return 1;
  let intersection = 0;
  for (const g of A) if (B.has(g)) intersection++;
  const union = A.size + B.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const SIMILARITY_THRESHOLD = 0.7;

export function isTooSimilar(
  candidate: string,
  history: string[],
  threshold = SIMILARITY_THRESHOLD,
): boolean {
  return history.some((h) => ngramSimilarity(candidate, h) >= threshold);
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-caption-similarity.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/caption/similarity.ts tests/lib/brago-caption-similarity.test.ts
git commit -m "feat(brago/caption): character-3-gram jaccard for 30-day anti-template gate"
```

---

### Task 1.5：CTA-content alignment 检查

**Files:**
- Create: `lib/brago/caption/cta-alignment.ts`
- Test: `tests/lib/brago-caption-cta.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-caption-cta.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { classifyPostKind, isCtaAligned } from "@/lib/brago/caption/cta-alignment";

describe("classifyPostKind", () => {
  it("flags education content", () => {
    expect(
      classifyPostKind(
        "How to choose a pressure washer\n\nThree things to consider when picking a washer for vinyl siding versus concrete.",
      ),
    ).toBe("education");
  });

  it("defaults to completed job", () => {
    expect(
      classifyPostKind(
        "Park Slope driveway cleanup\n\nCleaned a 30 ft concrete driveway this morning. Looks fresh. Call now.",
      ),
    ).toBe("completed_job");
  });

  it("flags team intro", () => {
    expect(
      classifyPostKind(
        "Meet our crew\n\nOur Park Slope team has been keeping driveways clean for 7 years.",
      ),
    ).toBe("team_intro");
  });
});

describe("isCtaAligned", () => {
  it("allows Call now on completed-job caption", () => {
    const body = "Cleaned a driveway in Park Slope this morning. Call now.";
    expect(isCtaAligned("completed_job", body)).toBe(true);
  });

  it("rejects Call now on education caption", () => {
    const body =
      "How to choose between soft wash and pressure wash for vinyl siding. Call now.";
    expect(isCtaAligned("education", body)).toBe(false);
  });

  it("allows Learn more on education caption", () => {
    const body =
      "How to choose between soft wash and pressure wash for vinyl siding. Learn more.";
    expect(isCtaAligned("education", body)).toBe(true);
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-caption-cta.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3：实现 cta-alignment.ts**

`lib/brago/caption/cta-alignment.ts`：

```ts
export type PostKind =
  | "completed_job"
  | "team_intro"
  | "seasonal_info"
  | "education";

// spec §2.5：post 类型 → CTA 映射。
const ALLOWED_CTA_PHRASES: Record<PostKind, RegExp[]> = {
  completed_job: [/\bcall now\b/i, /\bcall today\b/i, /\bbook\b/i, /\bllama\b/i],
  team_intro: [/\blearn more\b/i, /\bconoce\b/i, /\bmás info\b/i],
  seasonal_info: [/\blearn more\b/i, /\bmás info\b/i],
  education: [/\blearn more\b/i, /\bmás info\b/i],
};

const FORBIDDEN_CTA_ANYWHERE: RegExp[] = [
  /\bbuy now\b/i,
  /\border online\b/i,
  /\bget offer\b/i,
  /\bsign up\b/i,
];

const EDUCATION_KEYWORDS =
  /\b(how to|what is|why|guide|tips|when to|choose|difference between)\b/i;
const TEAM_KEYWORDS =
  /\b(meet (?:our|the)|our team|our crew|years (?:in|of) business)\b/i;
const SEASONAL_KEYWORDS =
  /\b(spring|summer|fall|winter|holiday|pre[- ]holiday|seasonal)\b/i;

export function classifyPostKind(text: string): PostKind {
  if (EDUCATION_KEYWORDS.test(text)) return "education";
  if (TEAM_KEYWORDS.test(text)) return "team_intro";
  if (SEASONAL_KEYWORDS.test(text)) return "seasonal_info";
  return "completed_job";
}

export function isCtaAligned(kind: PostKind, body: string): boolean {
  if (FORBIDDEN_CTA_ANYWHERE.some((re) => re.test(body))) return false;
  // 若 body 中找不到任何 CTA 短语，按 aligned 处理（spec 没要求强制有 CTA）
  const allCta = [
    /\bcall (?:now|today)\b/i,
    /\bbook\b/i,
    /\blearn more\b/i,
    /\bbuy now\b/i,
    /\border online\b/i,
    /\bget offer\b/i,
    /\bsign up\b/i,
    /\bllama\b/i,
    /\bmás info\b/i,
  ];
  const hasAny = allCta.some((re) => re.test(body));
  if (!hasAny) return true;
  const allowed = ALLOWED_CTA_PHRASES[kind];
  return allowed.some((re) => re.test(body));
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-caption-cta.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/caption/cta-alignment.ts tests/lib/brago-caption-cta.test.ts
git commit -m "feat(brago/caption): CTA-content alignment classifier and gate"
```

---

### Task 1.6：升级 `checkGooglePolicy` 整合所有新 gate

**Files:**
- Modify: `lib/brago/caption/policy.ts`
- Modify: `tests/lib/brago-caption-policy.test.ts`（创建若不存在；如果已有则追加）
- Modify: `lib/brago/caption/generate.ts`（传 history + language + ctx 进 policy）
- Modify: `tests/lib/brago-caption-generate.test.ts`（追加新断言）

- [ ] **Step 1：先看有没有现成 policy 单测**

Run: `ls tests/lib/brago-caption-policy.test.ts 2>/dev/null || echo missing`

如果是 missing，本任务包含创建该测试文件。

- [ ] **Step 2：写失败测试** — `tests/lib/brago-caption-policy.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

const good =
  "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. Pollen stains came right off. Book today.";

describe("checkGooglePolicy (extended)", () => {
  it("passes on a clean caption with proper structure", () => {
    const r = checkGooglePolicy(good, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.valid).toBe(true);
  });

  it("flags blacklisted phrase", () => {
    const text =
      "Park Slope driveway\n\nTrusted by Park Slope homeowners for years. Cleaned a driveway today.";
    const r = checkGooglePolicy(text, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.issues).toContain("blacklisted_phrase");
  });

  it("flags 30-day similarity", () => {
    const r = checkGooglePolicy(good, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [
        "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. Pollen stains came right off. Book today.",
      ],
    });
    expect(r.issues).toContain("similar_to_recent");
  });

  it("flags missing title and short body via structure", () => {
    const r = checkGooglePolicy("Too short.", {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.issues).toEqual(
      expect.arrayContaining(["missing_title", "length_out_of_range"]),
    );
  });

  it("still flags legacy issues (phone numbers, AI cliché)", () => {
    const text =
      "Park Slope driveway\n\nCall us at 512-555-1234 and we will transform your driveway.";
    const r = checkGooglePolicy(text, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.issues).toContain("phone_number_detected");
    expect(r.issues).toContain("ai_cliche");
  });
});
```

- [ ] **Step 3：验证测试失败**

Run: `pnpm test tests/lib/brago-caption-policy.test.ts`
Expected: FAIL — new signature options not supported by policy.ts.

- [ ] **Step 4：升级 policy.ts**

完全替换 `lib/brago/caption/policy.ts` 的内容为：

```ts
import type {
  CaptionLanguage,
  GbpPolicyIssue,
  PolicyCheckResult,
} from "@/lib/brago/types";
import { containsBlacklistedPhrase } from "./blacklist";
import {
  checkCaptionStructure,
  parseCaptionParts,
  type StructureContext,
} from "./structure";
import { isTooSimilar } from "./similarity";
import { classifyPostKind, isCtaAligned } from "./cta-alignment";

// 旧 gate（spec §2.6 保留 + 强化）
const PHONE_RE =
  /(?:\+?\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/;
const URL_RE =
  /(?:https?:\/\/|www\.|[\w-]{2,}\.(?:com|net|org|co|io|us|biz|info|app|shop)\b)/i;
const EM_DASH_RE = /—/;
// >3 个连续 4+ 字大写词
const ALL_CAPS_RUN = /\b[A-Z]{4,}\b(?:\s+\b[A-Z]{4,}\b){2,}/;

const AI_CLICHES: RegExp[] = [
  /\blooking to\b/i,
  /\bwhether you need\b/i,
  /\btransform your\b/i,
  /\bsay goodbye to\b/i,
  /\bwe take pride in\b/i,
  /\banother satisfying job\b/i,
  /\bbrought back to life\b/i,
  /\btough grime\b/i,
  /\bsatisfying result\b/i,
];

const UNVERIFIED_CLAIM_RE =
  /\b(licensed and insured|fully insured|licensed\s+(?:in|and))\b/i;

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export type PolicyCheckOptions = {
  allowVerifiedClaims?: boolean;
  language?: CaptionLanguage;
  ctx?: StructureContext;
  recentCaptions?: string[];
};

export function checkGooglePolicy(
  text: string,
  options: PolicyCheckOptions = {},
): PolicyCheckResult {
  const issues: GbpPolicyIssue[] = [];
  const trimmed = (text ?? "").trim();
  const language = options.language ?? "en";

  // 原有 gate
  if (trimmed.length > 1500) issues.push("too_long");
  if (PHONE_RE.test(trimmed)) issues.push("phone_number_detected");
  if (URL_RE.test(trimmed)) issues.push("url_detected");
  if (EM_DASH_RE.test(trimmed)) issues.push("em_dash_detected");
  if (ALL_CAPS_RUN.test(trimmed)) issues.push("shouting_text");
  if (AI_CLICHES.some((re) => re.test(trimmed))) issues.push("ai_cliche");
  if (!options.allowVerifiedClaims && UNVERIFIED_CLAIM_RE.test(trimmed)) {
    issues.push("unverified_claim");
  }
  const emojiCount = (trimmed.match(EMOJI_RE) ?? []).length;
  if (emojiCount > 2) issues.push("too_many_emojis");

  // 新 gate
  if (containsBlacklistedPhrase(trimmed, language)) {
    issues.push("blacklisted_phrase");
  }

  if (options.ctx) {
    const struct = checkCaptionStructure(trimmed, options.ctx);
    for (const issue of struct.issues) {
      if (!issues.includes(issue)) issues.push(issue);
    }
    // CTA 对齐（用 structure 解析出来的 body）
    const kind = classifyPostKind(struct.body);
    if (!isCtaAligned(kind, struct.body)) issues.push("cta_misaligned");
  } else {
    // 即使没有 ctx 也要至少解析出 body 做 CTA 对齐
    const { body } = parseCaptionParts(trimmed);
    const kind = classifyPostKind(body);
    if (!isCtaAligned(kind, body)) issues.push("cta_misaligned");
  }

  if (options.recentCaptions && options.recentCaptions.length > 0) {
    if (isTooSimilar(trimmed, options.recentCaptions)) {
      issues.push("similar_to_recent");
    }
  }

  return { valid: issues.length === 0, issues };
}

export function policyIssueLabel(issue: GbpPolicyIssue): string {
  switch (issue) {
    case "phone_number_detected":
      return "Phone number detected — let Google's Call button handle that.";
    case "url_detected":
      return "URL detected — keep links out of the caption.";
    case "too_long":
      return "Caption is over 1500 characters.";
    case "too_many_emojis":
      return "Too many emojis (max 2).";
    case "shouting_text":
      return "Avoid ALL-CAPS marketing shouts.";
    case "unverified_claim":
      return "Unverified claim — only mention licenses/insurance after you confirm them in Posting style.";
    case "ai_cliche":
      return "Sounds AI-generated — make it more specific.";
    case "em_dash_detected":
      return "Avoid em dashes.";
    case "missing_title":
      return "Add a one-line title separated from the body by a blank line.";
    case "title_all_caps":
      return "Title should be in normal case, not ALL CAPS.";
    case "length_out_of_range":
      return "Body should be 100-300 characters.";
    case "value_prop_missing":
      return "First 100 chars must include the service, the area, or a time anchor.";
    case "blacklisted_phrase":
      return "Sounds like a template — avoid 'trusted/expert/best in [city]' phrasing.";
    case "cta_misaligned":
      return "CTA doesn't match the post intent (e.g. don't use 'Call now' on a how-to post).";
    case "similar_to_recent":
      return "Too similar to a recent caption — Google may flag template farming.";
  }
}
```

- [ ] **Step 5：调整 generate.ts 把 history captionText 传给 policy**

修改 `lib/brago/caption/generate.ts:60-117` 那段循环，关键替换两处：

把 `const policy = checkGooglePolicy(res.caption, { allowVerifiedClaims });` 替换成：

```ts
const policy = checkGooglePolicy(res.caption, {
  allowVerifiedClaims,
  language: input.language,
  ctx: {
    serviceType: input.serviceType,
    serviceArea: input.serviceArea,
  },
  recentCaptions: history.map((h) => h.captionText),
});
```

把末尾 `const finalPolicy = checkGooglePolicy(caption, { allowVerifiedClaims });` 替换成：

```ts
const finalPolicy = checkGooglePolicy(caption, {
  allowVerifiedClaims,
  language: input.language,
  ctx: {
    serviceType: input.serviceType,
    serviceArea: input.serviceArea,
  },
  recentCaptions: history.map((h) => h.captionText),
});
```

- [ ] **Step 6：验证测试**

Run: `pnpm test tests/lib/brago-caption-policy.test.ts tests/lib/brago-caption-generate.test.ts`
Expected: PASS

- [ ] **Step 7：跑全套 brago 测试看是否有回归**

Run: `pnpm test tests/lib/brago-`
Expected: 全部 PASS（若已有 `brago-caption-generate.test.ts` 中的 mock 没有 captionText 字段，需要往 history 默认值里补 `captionText: ""`——见 step 8。）

- [ ] **Step 8（条件）：修复 generate 测试 mock**

如 step 7 红了，把 `tests/lib/brago-caption-generate.test.ts:7-9` 的 `history` mock 改为：

```ts
history: vi.fn(async () => [] as Array<{ openingPhrase: string | null; keyPhrasesJson: string | null; captionText: string }>),
```

- [ ] **Step 9：提交**

```bash
git add lib/brago/caption/policy.ts lib/brago/caption/generate.ts tests/lib/brago-caption-policy.test.ts tests/lib/brago-caption-generate.test.ts
git commit -m "feat(brago/caption): wire structure/blacklist/similarity/CTA gates into checkGooglePolicy"
```

---

### Task 1.7：升级 prompt-builders 让 AI 产出符合新规则的 caption

**Files:**
- Modify: `lib/brago/caption/prompt-builders.ts`
- Test: `tests/lib/brago-caption-prompt.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-caption-prompt.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/brago/caption/prompt-builders";
import { DEFAULT_BRAND_VOICE } from "@/lib/brago/types";

const base = {
  industry: "pressure_washing" as const,
  serviceType: "driveway",
  serviceArea: "Park Slope",
  language: "en" as const,
  brandVoice: DEFAULT_BRAND_VOICE,
  templateExamples: [],
  avoidOpenings: [],
  avoidPhrases: [],
};

describe("buildSystemPrompt", () => {
  it("requires a title separated by a blank line", () => {
    const sys = buildSystemPrompt(base);
    expect(sys).toMatch(/title/i);
    expect(sys).toMatch(/blank line/i);
  });

  it("specifies body length 100-300 chars", () => {
    const sys = buildSystemPrompt(base);
    expect(sys).toMatch(/100/);
    expect(sys).toMatch(/300/);
  });

  it("calls out forbidden template phrases by name", () => {
    const sys = buildSystemPrompt(base);
    expect(sys.toLowerCase()).toContain("trusted by");
    expect(sys.toLowerCase()).toContain("expert");
    expect(sys.toLowerCase()).toContain("best in");
  });

  it("switches blacklist examples for Spanish", () => {
    const sys = buildSystemPrompt({ ...base, language: "es" });
    expect(sys.toLowerCase()).toContain("expertos");
    expect(sys.toLowerCase()).toContain("mejor en");
  });
});

describe("buildUserPrompt", () => {
  it("includes the value-prop anchor instruction", () => {
    const usr = buildUserPrompt(base);
    expect(usr).toMatch(/value prop|first 100/i);
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-caption-prompt.test.ts`
Expected: FAIL — 新断言未满足。

- [ ] **Step 3：升级 prompt-builders.ts**

完全替换 `lib/brago/caption/prompt-builders.ts`：

```ts
import "server-only";
import type { CaptionInput } from "./text-provider";

/**
 * Caption 文案的 system / user prompt 构建。
 * Spec：docs/superpowers/specs/2026-05-31-output-quality-standard.md §2
 */

const EN_BLACKLIST_EXAMPLES = [
  '"trusted by [city] homeowners"',
  '"expert [service] in [city]"',
  '"your local [service]"',
  '"best [service] in [city]"',
  '"high-quality at affordable prices"',
  '"guaranteed satisfaction"',
];

const ES_BLACKLIST_EXAMPLES = [
  '"expertos en [ciudad]"',
  '"mejor en [ciudad]"',
  '"profesional y confiable"',
  '"satisfacción garantizada"',
];

export function buildSystemPrompt(input: CaptionInput): string {
  const langName = input.language === "es" ? "US Spanish" : "English";
  const blacklist =
    input.language === "es" ? ES_BLACKLIST_EXAMPLES : EN_BLACKLIST_EXAMPLES;

  return [
    `You write Google Business Profile captions for a local ${input.industry.replace("_", " ")} business.`,
    `Output language: ${langName}.`,
    input.language === "es"
      ? "Use US Spanish (e.g. 'carro' not 'coche', 'cuadra' not 'manzana'). Do NOT machine-translate from English."
      : "",
    "",
    "STRUCTURE (strict):",
    "- Line 1: a short title in normal Case (30-50 chars). Never ALL CAPS.",
    "- Then a blank line.",
    "- Then the body: 100-300 chars, ending with a short CTA.",
    "- The first 100 chars of the body MUST include at least two of: the specific service, the neighborhood/city, a time anchor ('this morning', 'today', 'before the holiday').",
    "",
    "STYLE RULES:",
    "- No phone numbers. No URLs. No em dashes. No hashtags.",
    "- 0-2 emojis maximum (prefer 0).",
    "- Sound like a real local owner, not a marketing agency.",
    `- Never use these template phrases: ${blacklist.join(", ")}.`,
    "- Do not stuff the city name more than twice.",
    "- Avoid AI clichés: 'transform', 'looking to', 'whether you need', 'say goodbye to', 'we take pride in', 'another satisfying job', 'brought back to life'.",
    "- Do not assert licensure / insurance unless the brand voice explicitly verifies it below.",
    "- Do not invent customer names, prices, durations, or reviews.",
    "",
    "CTA RULES:",
    "- Completed-job posts → 'Call now', 'Call today', or 'Book'.",
    "- Education / team-intro / seasonal-info posts → 'Learn more'.",
    "- Never use 'Buy now', 'Order online', 'Get offer', or 'Sign up'.",
    "",
    "Respond with the caption text only — title on line 1, blank line, then body. No quotes, no labels, no markdown.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUserPrompt(input: CaptionInput): string {
  const claims = input.brandVoice.verifiedClaims ?? {};
  const claimsLine: string[] = [];
  if (claims.licensed) claimsLine.push("Verified: licensed");
  if (claims.insured) claimsLine.push("Verified: insured");
  if (claims.familyOwned) claimsLine.push("Verified: family-owned");
  if (claims.yearsInBusiness)
    claimsLine.push(`Verified: ${claims.yearsInBusiness}+ years in business`);

  return [
    `Service: ${input.serviceType}`,
    input.serviceArea ? `Area: ${input.serviceArea}` : "",
    `Speaker: ${input.brandVoice.speaker}`,
    `Tone: ${input.brandVoice.tone.join(", ") || "neighborly"}`,
    `Avoid: ${input.brandVoice.avoid.join(", ") || "fake_guarantees"}`,
    ...claimsLine,
    "",
    "Value-prop reminder: first 100 chars of the body must cover ≥2 of {service, area, time-anchor}.",
    "",
    "EXAMPLES (style only — do not copy text):",
    ...input.templateExamples.map((e, i) => `Example ${i + 1}: ${e}`),
    "",
    input.avoidOpenings.length
      ? `Avoid copying these recent openings: ${input.avoidOpenings.join("; ")}`
      : "",
    input.avoidPhrases.length
      ? `Avoid overusing these phrases: ${input.avoidPhrases.join("; ")}`
      : "",
    input.customInstruction
      ? `Style instruction: ${input.customInstruction}`
      : "",
    "",
    "Write ONE caption only — title + blank line + body.",
  ]
    .filter(Boolean)
    .join("\n");
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-caption-prompt.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/caption/prompt-builders.ts tests/lib/brago-caption-prompt.test.ts
git commit -m "feat(brago/caption): prompt now demands title+body, value-prop density, and explicit blacklist"
```

---

### Task 1.8：让两个 caption 路由透传 policy 标签给前端

**Files:**
- Modify: `app/api/brago/google-posts/[postId]/generate-caption/route.ts`
- Modify: `app/api/brago/anonymous/google-posts/[postId]/generate-caption/route.ts`

两条路由都已经把 `policy` 序列化进 `captionPolicyJson` 与响应——无需结构改动。只验证响应里 `issues` 是新枚举字段。

- [ ] **Step 1：手动 sanity check**

Run: `pnpm test tests/lib/brago-caption-generate.test.ts -t "policy-clean"`
Expected: PASS

- [ ] **Step 2：lint + 全测试**

Run: `pnpm lint && pnpm test tests/lib/brago-caption`
Expected: 全部 PASS。

- [ ] **Step 3：提交（仅当有改动；若无改动可跳过）**

```bash
git status --short
# 若无 staged changes，跳过 commit。
```

---

## Phase 2 — 图片合成重做（spec §1.3 + §1.4 + §1.5 + §1.6）

> 本阶段动到视觉输出，**与 Phase 1 解耦**。Phase 1 已落则 caption 已合规；本阶段单独 review/回滚。

### Task 2.1：定义图片合成的输入合约与常量

**Files:**
- Create: `lib/brago/compose/constants.ts`

- [ ] **Step 1：创建常量模块**

`lib/brago/compose/constants.ts`：

```ts
// spec §1.3 / §1.4 / §1.5 — 所有合成参数集中在此处。
// 修改前务必先读 spec，并在 PR 描述里说明触发了哪条研究依据。

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 900; // 4:3
export const SAFE_ZONE_PCT = 70; // 中心 70% 矩形为 safe-zone

export const BEFORE_INSET_WIDTH_PCT = 22; // 右下角 before 内嵌宽度
export const BEFORE_INSET_MARGIN_PCT = 4; // 距右 / 距下 margin
export const BEFORE_INSET_STROKE_PX = 3;

export const OVERLAY_HEIGHT_PCT = 8; // 文字字号 = canvas 高度 × 6-8%
export const OVERLAY_BOTTOM_PCT = 10; // 距底部 10% 高度

export const WATERMARK_HEIGHT_PCT = 12; // logo 高度
export const WATERMARK_MARGIN_PCT = 5;
export const WATERMARK_OPACITY = 0.7;

export const TEXT_WATERMARK_HEIGHT_PCT = 3.5;
export const TEXT_WATERMARK_OPACITY = 0.8;

export const THUMBNAIL_TEST_EDGE = 150; // spec §1.6 缩略图可读性 gate
export const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // Google 上限
```

- [ ] **Step 2：提交**

```bash
git add lib/brago/compose/constants.ts
git commit -m "feat(brago/compose): centralize canvas/overlay/watermark constants per spec §1.3-§1.5"
```

---

### Task 2.2：overlay 文字 SVG 生成 + thumbnail readability gate

**Files:**
- Create: `lib/brago/compose/overlay.ts`
- Test: `tests/lib/brago-compose-overlay.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-compose-overlay.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  buildOverlayText,
  buildOverlaySvg,
  passesThumbnailReadability,
} from "@/lib/brago/compose/overlay";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/brago/compose/constants";

describe("buildOverlayText", () => {
  it("uppercases and joins city + service", () => {
    expect(buildOverlayText("park slope", "driveway")).toBe(
      "PARK SLOPE · DRIVEWAY",
    );
  });

  it("trims to 3-5 words by truncating long service phrases", () => {
    const out = buildOverlayText("park slope", "ceramic coating premium plus deluxe");
    const words = out.split(/\s+/).filter((w) => w !== "·");
    expect(words.length).toBeLessThanOrEqual(5);
  });

  it("falls back to service-only when no city", () => {
    expect(buildOverlayText(null, "driveway")).toBe("DRIVEWAY");
  });

  it("returns empty string when neither field is set", () => {
    expect(buildOverlayText(null, "")).toBe("");
  });
});

describe("buildOverlaySvg", () => {
  it("returns SVG matching canvas width", () => {
    const svg = buildOverlaySvg("PARK SLOPE · DRIVEWAY").toString("utf-8");
    expect(svg).toContain(`width="${CANVAS_WIDTH}"`);
    expect(svg).toContain(`height="${CANVAS_HEIGHT}"`);
    expect(svg).toContain("PARK SLOPE · DRIVEWAY");
  });
});

describe("passesThumbnailReadability", () => {
  // 缩略图可读性合成 gate：text height after resize to 150px wide
  // 必须 ≥ 9px（在 150px 缩略图上人眼可读阈值），且 contrast ≥ 4.5:1（已固定为白字+黑描边）
  it("passes for normal 3-5 word overlay", () => {
    expect(passesThumbnailReadability("PARK SLOPE · DRIVEWAY")).toBe(true);
  });

  it("fails when text would be illegibly small (>10 words)", () => {
    expect(
      passesThumbnailReadability(
        "PARK SLOPE BROOKLYN DRIVEWAY PRESSURE CLEAN POLISH SHINE BRIGHT",
      ),
    ).toBe(false);
  });

  it("passes empty (no overlay → trivially readable)", () => {
    expect(passesThumbnailReadability("")).toBe(true);
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-compose-overlay.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3：实现 overlay.ts**

`lib/brago/compose/overlay.ts`：

```ts
import "server-only";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  OVERLAY_BOTTOM_PCT,
  OVERLAY_HEIGHT_PCT,
  THUMBNAIL_TEST_EDGE,
} from "./constants";

const STOP_WORDS_FOR_OVERLAY = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "for",
  "with",
  "to",
]);

export function buildOverlayText(
  city: string | null | undefined,
  service: string,
): string {
  const cityClean = (city ?? "").trim();
  const serviceClean = (service ?? "").trim();
  if (!cityClean && !serviceClean) return "";

  function take(words: string[], max: number): string[] {
    const filtered = words.filter(
      (w) => w && !STOP_WORDS_FOR_OVERLAY.has(w.toLowerCase()),
    );
    return filtered.slice(0, max);
  }

  const cityWords = take(cityClean.split(/\s+/), 3);
  const remaining = Math.max(1, 5 - cityWords.length);
  const serviceWords = take(serviceClean.split(/\s+/), remaining);

  const parts: string[] = [];
  if (cityWords.length) parts.push(cityWords.join(" ").toUpperCase());
  if (serviceWords.length) parts.push(serviceWords.join(" ").toUpperCase());
  return parts.join(" · ");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOverlaySvg(text: string): Buffer {
  if (!text) {
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"/>`,
      "utf-8",
    );
  }
  const fontPx = Math.round(CANVAS_HEIGHT * (OVERLAY_HEIGHT_PCT / 100));
  const yFromTop = Math.round(
    CANVAS_HEIGHT - CANVAS_HEIGHT * (OVERLAY_BOTTOM_PCT / 100),
  );
  const safe = escapeXml(text);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
  <style>
    .ovl { font: 800 ${fontPx}px Inter, "Helvetica Neue", Arial, sans-serif;
           fill: #ffffff; stroke: #000000; stroke-width: 2; paint-order: stroke fill;
           text-anchor: middle; letter-spacing: 1.5px; }
  </style>
  <text x="${CANVAS_WIDTH / 2}" y="${yFromTop}" class="ovl">${safe}</text>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

/**
 * 合成可读性 gate（spec §1.6）。
 * 不引入 tesseract.js（重依赖）；用启发式：
 *   resized_font_px = full_font_px * (150 / CANVAS_WIDTH)
 *   approx_char_width_px ≈ resized_font_px * 0.55
 *   total_text_width_px ≈ char_count * approx_char_width_px
 *   pass 条件：
 *     - resized_font_px ≥ 9（人眼对 sans-serif 全大写最小可读高度）
 *     - total_text_width_px ≤ 150 - 2*margin（margin 取 8px）
 */
export function passesThumbnailReadability(text: string): boolean {
  if (!text) return true;
  const fullFontPx = CANVAS_HEIGHT * (OVERLAY_HEIGHT_PCT / 100);
  const resizedFontPx = fullFontPx * (THUMBNAIL_TEST_EDGE / CANVAS_WIDTH);
  if (resizedFontPx < 9) return false;
  const charWidth = resizedFontPx * 0.55;
  const totalWidth = text.length * charWidth;
  return totalWidth <= THUMBNAIL_TEST_EDGE - 16;
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-compose-overlay.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/compose/overlay.ts tests/lib/brago-compose-overlay.test.ts
git commit -m "feat(brago/compose): overlay text builder + thumbnail readability gate"
```

---

### Task 2.3：水印生成（logo / 商家名文字 / 无）

**Files:**
- Create: `lib/brago/compose/watermark.ts`
- Test: `tests/lib/brago-compose-watermark.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-compose-watermark.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  buildWatermarkLayer,
  type WatermarkInput,
} from "@/lib/brago/compose/watermark";

async function makePng(w: number, h: number, bg: string): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 4, background: bg },
  })
    .png()
    .toBuffer();
}

describe("buildWatermarkLayer", () => {
  it("returns null when neither logo nor businessName is provided (no Brago watermark)", async () => {
    const r = await buildWatermarkLayer({ logo: null, businessName: null });
    expect(r).toBeNull();
  });

  it("returns a sharp composite descriptor when logo is provided", async () => {
    const logo = await makePng(400, 200, "#ff0000");
    const r = await buildWatermarkLayer({ logo, businessName: null });
    expect(r).not.toBeNull();
    expect(r?.input).toBeInstanceOf(Buffer);
    // 应位于右下角
    expect(r?.gravity).toBe("southeast");
  });

  it("falls back to text watermark when only businessName is provided", async () => {
    const r = await buildWatermarkLayer({
      logo: null,
      businessName: "American Dream Pressure Washing",
    });
    expect(r).not.toBeNull();
    expect(r?.input).toBeInstanceOf(Buffer);
    // svg-based text watermark — verify it includes the business name
    const svg = (r?.input as Buffer).toString("utf-8");
    expect(svg).toContain("American Dream");
  });

  it("truncates business names over 30 chars with ellipsis", async () => {
    const long = "A".repeat(45);
    const r = await buildWatermarkLayer({ logo: null, businessName: long });
    const svg = (r?.input as Buffer).toString("utf-8");
    expect(svg).toMatch(/A{27}…|A{27}\.\.\./);
  });

  it("never injects the string 'Brago' anywhere", async () => {
    const r = await buildWatermarkLayer({
      logo: null,
      businessName: "Joe's Cleaning",
    });
    const svg = (r?.input as Buffer).toString("utf-8");
    expect(svg.toLowerCase()).not.toContain("brago");
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-compose-watermark.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3：实现 watermark.ts**

`lib/brago/compose/watermark.ts`：

```ts
import "server-only";
import sharp from "sharp";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TEXT_WATERMARK_HEIGHT_PCT,
  TEXT_WATERMARK_OPACITY,
  WATERMARK_HEIGHT_PCT,
  WATERMARK_MARGIN_PCT,
  WATERMARK_OPACITY,
} from "./constants";

export type WatermarkInput = {
  logo: Buffer | null;
  businessName: string | null;
};

type CompositeDescriptor = {
  input: Buffer;
  gravity?: "southeast";
  top?: number;
  left?: number;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function buildLogoLayer(logo: Buffer): Promise<CompositeDescriptor> {
  const targetHeight = Math.round(
    CANVAS_HEIGHT * (WATERMARK_HEIGHT_PCT / 100),
  );
  const resized = await sharp(logo, { failOn: "none" })
    .resize({ height: targetHeight, fit: "inside" })
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="${targetHeight}"><rect width="2000" height="${targetHeight}" fill="white" fill-opacity="${WATERMARK_OPACITY}"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
  return { input: resized, gravity: "southeast" };
}

function buildTextLayer(businessName: string): CompositeDescriptor {
  // 截断 + ellipsis
  let display = businessName.trim();
  if (display.length > 30) display = display.slice(0, 27) + "…";
  const fontPx = Math.round(CANVAS_HEIGHT * (TEXT_WATERMARK_HEIGHT_PCT / 100));
  const padding = Math.round(
    Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * (WATERMARK_MARGIN_PCT / 100),
  );
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
  <style>
    .wm { font: 800 ${fontPx}px Inter, "Helvetica Neue", Arial, sans-serif;
          fill: #ffffff; fill-opacity: ${TEXT_WATERMARK_OPACITY};
          stroke: #000000; stroke-width: 1.5; paint-order: stroke fill;
          text-anchor: end; }
  </style>
  <text x="${CANVAS_WIDTH - padding}" y="${CANVAS_HEIGHT - padding}" class="wm">${escapeXml(display)}</text>
</svg>`;
  return { input: Buffer.from(svg, "utf-8") };
}

export async function buildWatermarkLayer(
  input: WatermarkInput,
): Promise<CompositeDescriptor | null> {
  if (input.logo) return buildLogoLayer(input.logo);
  if (input.businessName && input.businessName.trim()) {
    return buildTextLayer(input.businessName);
  }
  return null;
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-compose-watermark.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/compose/watermark.ts tests/lib/brago-compose-watermark.test.ts
git commit -m "feat(brago/compose): customer-only watermark (logo / text / none) — never Brago"
```

---

### Task 2.4：新的 before/after 合成器（主 after + 角落 before）

**Files:**
- Create: `lib/brago/compose/proof-image.ts`
- Test: `tests/lib/brago-compose-proof.test.ts`
- Deprecate (later via 2.6): `lib/brago/image-compose.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-compose-proof.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { composeProofImage } from "@/lib/brago/compose/proof-image";

async function jpeg(w: number, h: number, bg: string): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: bg } })
    .jpeg()
    .toBuffer();
}

describe("composeProofImage", () => {
  it("renders a 1200×900 JPEG for before/after mode", async () => {
    const before = await jpeg(2000, 1500, "#222");
    const after = await jpeg(2000, 1500, "#ddd");
    const out = await composeProofImage({
      mode: "before_after",
      after,
      before,
      overlayText: "PARK SLOPE · DRIVEWAY",
      watermark: { logo: null, businessName: "Joe's Cleaning" },
    });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(900);
    expect(out.byteLength).toBeLessThan(5 * 1024 * 1024);
  });

  it("renders a 1200×900 JPEG for after-only mode", async () => {
    const after = await jpeg(2000, 1500, "#ddd");
    const out = await composeProofImage({
      mode: "single_after",
      after,
      overlayText: "PARK SLOPE · DRIVEWAY",
      watermark: { logo: null, businessName: null },
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(900);
  });

  it("never refuses if overlayText is empty", async () => {
    const after = await jpeg(2000, 1500, "#ddd");
    const out = await composeProofImage({
      mode: "single_after",
      after,
      overlayText: "",
      watermark: { logo: null, businessName: null },
    });
    expect(out.byteLength).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-compose-proof.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3：实现 proof-image.ts**

`lib/brago/compose/proof-image.ts`：

```ts
import "server-only";
import sharp from "sharp";
import {
  BEFORE_INSET_MARGIN_PCT,
  BEFORE_INSET_STROKE_PX,
  BEFORE_INSET_WIDTH_PCT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_OUTPUT_BYTES,
} from "./constants";
import { buildOverlaySvg } from "./overlay";
import { buildWatermarkLayer, type WatermarkInput } from "./watermark";

export type ProofComposeInput =
  | {
      mode: "single_after";
      after: Buffer;
      overlayText: string;
      watermark: WatermarkInput;
    }
  | {
      mode: "before_after";
      after: Buffer;
      before: Buffer;
      overlayText: string;
      watermark: WatermarkInput;
    };

async function fitToCanvas(buf: Buffer): Promise<Buffer> {
  return sharp(buf, { failOn: "none" })
    .rotate()
    .resize({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      fit: "cover",
      position: "attention",
    })
    // 仅允许色彩/曝光矫正（spec §1.1 — no "significant alteration"）
    .modulate({ saturation: 1.02, brightness: 1.0 })
    .toBuffer();
}

async function buildBeforeInset(before: Buffer): Promise<{
  buf: Buffer;
  width: number;
  height: number;
}> {
  const width = Math.round(CANVAS_WIDTH * (BEFORE_INSET_WIDTH_PCT / 100));
  const height = Math.round(width * (3 / 4)); // 与主图一致 4:3
  const cropped = await sharp(before, { failOn: "none" })
    .rotate()
    .resize({ width, height, fit: "cover", position: "attention" })
    .toBuffer();
  // 加 BEFORE 标签条 + 白色描边
  const labelHeight = Math.round(height * 0.22);
  const totalHeight = height + labelHeight;
  const composed = await sharp({
    create: {
      width,
      height: totalHeight,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([
      { input: cropped, top: labelHeight, left: 0 },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${labelHeight}">
             <rect width="${width}" height="${labelHeight}" fill="#c0291d"/>
             <text x="${width / 2}" y="${labelHeight * 0.72}" font-family="Inter, Arial, sans-serif" font-size="${Math.round(labelHeight * 0.55)}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">BEFORE</text>
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
  // 再外加 white stroke 边框
  const bordered = await sharp(composed)
    .extend({
      top: BEFORE_INSET_STROKE_PX,
      bottom: BEFORE_INSET_STROKE_PX,
      left: BEFORE_INSET_STROKE_PX,
      right: BEFORE_INSET_STROKE_PX,
      background: "#ffffff",
    })
    .png()
    .toBuffer();
  const meta = await sharp(bordered).metadata();
  return { buf: bordered, width: meta.width ?? width, height: meta.height ?? totalHeight };
}

async function ensureUnderLimit(buf: Buffer): Promise<Buffer> {
  if (buf.byteLength <= MAX_OUTPUT_BYTES) return buf;
  // 降到 q=80 再试，仍超则 q=72
  for (const q of [80, 72, 64]) {
    const out = await sharp(buf, { failOn: "none" })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    if (out.byteLength <= MAX_OUTPUT_BYTES) return out;
  }
  throw new Error("composed image exceeds 5MB even after compression");
}

export async function composeProofImage(
  input: ProofComposeInput,
): Promise<Buffer> {
  const base = await fitToCanvas(input.after);
  const composites: sharp.OverlayOptions[] = [];

  if (input.mode === "before_after") {
    const inset = await buildBeforeInset(input.before);
    const margin = Math.round(
      Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * (BEFORE_INSET_MARGIN_PCT / 100),
    );
    composites.push({
      input: inset.buf,
      top: CANVAS_HEIGHT - inset.height - margin,
      left: CANVAS_WIDTH - inset.width - margin,
    });
  }

  if (input.overlayText) {
    composites.push({ input: buildOverlaySvg(input.overlayText), top: 0, left: 0 });
  }

  const wm = await buildWatermarkLayer(input.watermark);
  if (wm) {
    if (wm.gravity) composites.push({ input: wm.input, gravity: wm.gravity });
    else composites.push({ input: wm.input, top: 0, left: 0 });
  }

  const composed = await sharp(base)
    .composite(composites)
    .jpeg({ quality: 88, mozjpeg: true })
    .withMetadata({})
    .toBuffer();

  return ensureUnderLimit(composed);
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-compose-proof.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/compose/proof-image.ts tests/lib/brago-compose-proof.test.ts
git commit -m "feat(brago/compose): new 1200×900 main-after + corner-before composer per spec §1.3"
```

---

### Task 2.5：硬 gate 校验器（spec §1.6 七项）

**Files:**
- Create: `lib/brago/compose/gates.ts`
- Test: `tests/lib/brago-compose-gates.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-compose-gates.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { validateOutputImage } from "@/lib/brago/compose/gates";

async function jpeg(w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: "#888" } })
    .jpeg()
    .toBuffer();
}

describe("validateOutputImage", () => {
  it("passes a 1200×900 image under 5MB with readable overlay", async () => {
    const buf = await jpeg(1200, 900);
    const r = await validateOutputImage(buf, {
      overlayText: "PARK SLOPE · DRIVEWAY",
    });
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("fails when dimensions are off-spec", async () => {
    const buf = await jpeg(800, 800);
    const r = await validateOutputImage(buf, { overlayText: "X" });
    expect(r.ok).toBe(false);
    expect(r.issues).toContain("wrong_dimensions");
  });

  it("fails when overlay text would be illegible at 150px thumbnail", async () => {
    const buf = await jpeg(1200, 900);
    const r = await validateOutputImage(buf, {
      overlayText:
        "WAY WAY TOO MANY WORDS FOR A THUMBNAIL AT FIFTEEN ZERO PIXELS WIDE",
    });
    expect(r.ok).toBe(false);
    expect(r.issues).toContain("thumbnail_text_unreadable");
  });

  it("fails when byteLength exceeds 5MB", async () => {
    // 用 sharp 生成不太可能 >5MB 的 noise；改用直接构造一个大 buffer 注入伪测：
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 0xff);
    const r = await validateOutputImage(big, { overlayText: "OK" });
    expect(r.ok).toBe(false);
    expect(r.issues).toContain("file_too_large");
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-compose-gates.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3：实现 gates.ts**

`lib/brago/compose/gates.ts`：

```ts
import "server-only";
import sharp from "sharp";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_OUTPUT_BYTES,
} from "./constants";
import { passesThumbnailReadability } from "./overlay";

export type CompositeGateIssue =
  | "wrong_dimensions"
  | "file_too_large"
  | "thumbnail_text_unreadable"
  | "invalid_format";

export type CompositeGateResult = {
  ok: boolean;
  issues: CompositeGateIssue[];
};

export async function validateOutputImage(
  buf: Buffer,
  opts: { overlayText: string },
): Promise<CompositeGateResult> {
  const issues: CompositeGateIssue[] = [];

  if (buf.byteLength > MAX_OUTPUT_BYTES) issues.push("file_too_large");

  let meta: sharp.Metadata | null = null;
  try {
    meta = await sharp(buf, { failOn: "none" }).metadata();
  } catch {
    issues.push("invalid_format");
    return { ok: false, issues };
  }

  const w = meta?.width ?? 0;
  const h = meta?.height ?? 0;
  const tol = 0.05; // ±5%（spec §1.6）
  if (
    Math.abs(w - CANVAS_WIDTH) / CANVAS_WIDTH > tol ||
    Math.abs(h - CANVAS_HEIGHT) / CANVAS_HEIGHT > tol
  ) {
    issues.push("wrong_dimensions");
  }
  if (meta?.format !== "jpeg") issues.push("invalid_format");

  if (!passesThumbnailReadability(opts.overlayText)) {
    issues.push("thumbnail_text_unreadable");
  }

  return { ok: issues.length === 0, issues };
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-compose-gates.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/compose/gates.ts tests/lib/brago-compose-gates.test.ts
git commit -m "feat(brago/compose): output-validation gates (dimensions, size, thumbnail readability)"
```

---

### Task 2.6：接入 render-photo 路由

**Files:**
- Modify: `app/api/brago/google-posts/[postId]/render-photo/route.ts`
- Optional: 保留 `lib/brago/image-compose.ts` 一段时间作 fallback / 兼容；但路由不再调用。

- [ ] **Step 1：读 brand-profile 助手**

Run: `grep -rn "getBrandProfile\|brandProfile" lib/brago lib/db 2>/dev/null | head`

如不存在 `getBrandProfile` 助手，则用 inline `db.select` 查 brandProfile（同 generate-caption 路由套路）。

- [ ] **Step 2：改写 render-photo 路由**

完全替换 `app/api/brago/google-posts/[postId]/render-photo/route.ts` 内容为：

```ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { brandProfile, googlePost, googlePostPhoto } from "@/lib/db/schema";
import { composeProofImage } from "@/lib/brago/compose/proof-image";
import { validateOutputImage } from "@/lib/brago/compose/gates";
import { buildOverlayText } from "@/lib/brago/compose/overlay";
import {
  buildGooglePostKey,
  bufferToDataUrl,
  isR2Ready,
  uploadBuffer,
} from "@/lib/brago/r2-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

async function fetchBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1] ?? "";
    return Buffer.from(base64, "base64");
  }
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch image failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function loadBrand(userId: string): Promise<{
  logo: Buffer | null;
  businessName: string | null;
}> {
  const rows = await db
    .select()
    .from(brandProfile)
    .where(eq(brandProfile.userId, userId))
    .limit(1);
  const bp = rows[0];
  if (!bp) return { logo: null, businessName: null };
  let logo: Buffer | null = null;
  if (bp.logoUrl) {
    try {
      logo = await fetchBuffer(bp.logoUrl);
    } catch {
      logo = null;
    }
  }
  return { logo, businessName: bp.businessName ?? null };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { postId } = await params;

  const postRow = await db
    .select()
    .from(googlePost)
    .where(
      and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id)),
    )
    .limit(1);
  const post = postRow[0];
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const mode =
    (body.mode as "single_after" | "before_after_proof" | undefined) ??
    (post.imageMode as "single_after" | "before_after_proof");
  const photoIdOverride = body.photoId as string | undefined;
  const beforeIdOverride = body.beforePhotoId as string | undefined;
  const afterIdOverride = body.afterPhotoId as string | undefined;

  const brand = await loadBrand(access.user.id);
  const overlayText = buildOverlayText(post.serviceArea, post.serviceType);

  try {
    let composed: Buffer;
    let bestPhotoId: string | null = null;
    let usedBeforeId: string | null = null;
    let usedAfterId: string | null = null;

    if (mode === "single_after") {
      const photoId = photoIdOverride ?? post.bestPhotoId;
      if (!photoId) {
        return NextResponse.json(
          { error: "Choose an after photo before rendering." },
          { status: 400 },
        );
      }
      const photo = (
        await db
          .select()
          .from(googlePostPhoto)
          .where(
            and(
              eq(googlePostPhoto.id, photoId),
              eq(googlePostPhoto.googlePostId, postId),
            ),
          )
          .limit(1)
      )[0];
      if (!photo) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }
      const afterBuf = await fetchBuffer(photo.processedUrl ?? photo.originalUrl);
      composed = await composeProofImage({
        mode: "single_after",
        after: afterBuf,
        overlayText,
        watermark: brand,
      });
      bestPhotoId = photoId;
      usedAfterId = photoId;
    } else {
      const beforeId = beforeIdOverride ?? post.beforePhotoId;
      const afterId = afterIdOverride ?? post.afterPhotoId ?? post.bestPhotoId;
      if (!beforeId || !afterId) {
        return NextResponse.json(
          { error: "Need both a before and an after photo for the proof image." },
          { status: 400 },
        );
      }
      const photos = await db
        .select()
        .from(googlePostPhoto)
        .where(eq(googlePostPhoto.googlePostId, postId));
      const before = photos.find((p) => p.id === beforeId);
      const after = photos.find((p) => p.id === afterId);
      if (!before || !after) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }
      const [beforeBuf, afterBuf] = await Promise.all([
        fetchBuffer(before.processedUrl ?? before.originalUrl),
        fetchBuffer(after.processedUrl ?? after.originalUrl),
      ]);
      composed = await composeProofImage({
        mode: "before_after",
        after: afterBuf,
        before: beforeBuf,
        overlayText,
        watermark: brand,
      });
      bestPhotoId = afterId;
      usedBeforeId = beforeId;
      usedAfterId = afterId;
    }

    const gate = await validateOutputImage(composed, { overlayText });
    if (!gate.ok) {
      return NextResponse.json(
        { error: "image_gate_failed", issues: gate.issues },
        { status: 422 },
      );
    }

    const key = buildGooglePostKey(
      access.user.id,
      postId,
      "final",
      `${mode === "single_after" ? "single" : "proof"}_${randomUUID()}.jpg`,
    );
    const finalUrl = isR2Ready()
      ? await uploadBuffer({
          key,
          body: composed,
          contentType: "image/jpeg",
        })
      : bufferToDataUrl(composed, "image/jpeg");

    await db
      .update(googlePost)
      .set({
        bestPhotoId,
        imageMode: mode,
        beforePhotoId: usedBeforeId ?? post.beforePhotoId,
        afterPhotoId: usedAfterId ?? post.afterPhotoId,
        finalImageUrl: finalUrl,
      })
      .where(eq(googlePost.id, postId));

    return NextResponse.json({ finalUrl, mode, overlayText });
  } catch (err) {
    console.error("[brago render-photo]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render failed" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3：lint + build sanity**

Run: `pnpm lint`
Expected: 0 errors（如有 unused import 警告，删之）。

- [ ] **Step 4：跑全 brago 测试**

Run: `pnpm test tests/lib/brago-`
Expected: 全部 PASS。注意旧的 `tests/lib/brago-image-compose.test.ts` 仍会测试旧 `image-compose.ts`，保留作回归基线（旧文件未删）。

- [ ] **Step 5：提交**

```bash
git add app/api/brago/google-posts/\[postId\]/render-photo/route.ts
git commit -m "feat(brago/render-photo): switch to spec-compliant 4:3 compositor + output gates"
```

---

### Task 2.7：废弃旧 `image-compose.ts`（可选清理；如有外部引用先迁移）

**Files:**
- Modify: `lib/brago/image-compose.ts`（加 deprecation 注释 + 转发到新模块）
- Optional delete: `tests/lib/brago-image-compose.test.ts`

- [ ] **Step 1：搜引用**

Run: `grep -rn "image-compose\|composeBeforeAfterProof" --include="*.ts" --include="*.tsx" lib app tests | grep -v "lib/brago/image-compose.ts\|tests/lib/brago-image-compose.test.ts"`

如有任何 hit，先在那个文件迁移到 `composeProofImage`。

- [ ] **Step 2：替换 image-compose.ts 为薄壳**

`lib/brago/image-compose.ts`：

```ts
import "server-only";
import { composeProofImage } from "./compose/proof-image";

/**
 * @deprecated 使用 `lib/brago/compose/proof-image.ts` 中的 composeProofImage。
 * 此 shim 仅为兼容老测试保留——不要在新代码中调用。
 */
export async function composeBeforeAfterProof(
  beforeBuffer: Buffer,
  afterBuffer: Buffer,
): Promise<Buffer> {
  return composeProofImage({
    mode: "before_after",
    before: beforeBuffer,
    after: afterBuffer,
    overlayText: "",
    watermark: { logo: null, businessName: null },
  });
}
```

- [ ] **Step 3：旧测试需要更新 (1080 → 1200×900)**

修改 `tests/lib/brago-image-compose.test.ts:23-25` 把：

```ts
expect(meta.width).toBe(1080);
expect(meta.height).toBe(1080);
```

替换成：

```ts
expect(meta.width).toBe(1200);
expect(meta.height).toBe(900);
```

- [ ] **Step 4：验证**

Run: `pnpm test tests/lib/brago-image-compose.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/image-compose.ts tests/lib/brago-image-compose.test.ts
git commit -m "refactor(brago): deprecate old image-compose; shim now delegates to new compositor"
```

---

## Phase 3 — Quality scoring + eval scaffold（spec §3）

> spec Open Question #4：不上 prod hard gate；本阶段只搭打分器 + eval 脚手架，便于后续采集分布。

### Task 3.1：组合打分器

**Files:**
- Create: `lib/brago/quality/score.ts`
- Test: `tests/lib/brago-quality-score.test.ts`

- [ ] **Step 1：写失败测试**

`tests/lib/brago-quality-score.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { scoreOutput } from "@/lib/brago/quality/score";

describe("scoreOutput", () => {
  const goodCaption =
    "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. Pollen stains came right off. Book today.";

  it("returns 0 when any must-pass gate fails", () => {
    const r = scoreOutput({
      caption: "Too short.",
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
      image: { isAiGenerated: false, hasBragoWatermark: false, overlayText: "PARK SLOPE · DRIVEWAY" },
    });
    expect(r.score).toBe(0);
    expect(r.mustPassFailures.length).toBeGreaterThan(0);
  });

  it("returns 0 when Brago watermark is present (hard gate)", () => {
    const r = scoreOutput({
      caption: goodCaption,
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
      image: { isAiGenerated: false, hasBragoWatermark: true, overlayText: "PARK SLOPE · DRIVEWAY" },
    });
    expect(r.score).toBe(0);
    expect(r.mustPassFailures).toContain("no_brago_watermark_on_image");
  });

  it("returns ≥ 70 for a clean caption + clean image", () => {
    const r = scoreOutput({
      caption: goodCaption,
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
      image: { isAiGenerated: false, hasBragoWatermark: false, overlayText: "PARK SLOPE · DRIVEWAY" },
    });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.mustPassFailures).toEqual([]);
  });
});
```

- [ ] **Step 2：验证测试失败**

Run: `pnpm test tests/lib/brago-quality-score.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3：实现 score.ts**

`lib/brago/quality/score.ts`：

```ts
import { containsBlacklistedPhrase } from "@/lib/brago/caption/blacklist";
import {
  checkCaptionStructure,
  parseCaptionParts,
} from "@/lib/brago/caption/structure";
import { isTooSimilar } from "@/lib/brago/caption/similarity";
import {
  classifyPostKind,
  isCtaAligned,
} from "@/lib/brago/caption/cta-alignment";
import { passesThumbnailReadability } from "@/lib/brago/compose/overlay";
import type { CaptionLanguage } from "@/lib/brago/types";

export type ScoreInput = {
  caption: string;
  language: CaptionLanguage;
  ctx: { serviceType: string; serviceArea: string | null };
  recentCaptions: string[];
  image: {
    isAiGenerated: boolean;
    hasBragoWatermark: boolean;
    overlayText: string;
  };
};

export type MustPassGate =
  | "no_ai_generated_image"
  | "no_brago_watermark_on_image"
  | "has_overlay_text_3_to_5_words"
  | "thumbnail_text_readable_at_150px"
  | "caption_has_title_proper_case"
  | "no_all_caps_in_title"
  | "caption_100_to_300_chars"
  | "first_100_chars_has_value_prop"
  | "no_blacklisted_phrases"
  | "caption_not_70pct_similar_recent_30d";

export type ScoreBreakdown = {
  authenticity: number;
  thumbnailClarity: number;
  captionCraft: number;
  ctaAlignment: number;
  localSpecificity: number;
  antiTemplate: number;
};

export type ScoreResult = {
  score: number;
  mustPassFailures: MustPassGate[];
  breakdown: ScoreBreakdown;
};

function countOverlayWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((t) => t && t !== "·").length;
}

const EMPTINESS_WORDS = [
  "trusted",
  "professional",
  "expert",
  "reliable",
  "quality",
  "best",
];

export function scoreOutput(input: ScoreInput): ScoreResult {
  const must: MustPassGate[] = [];
  const { caption, image, ctx, recentCaptions, language } = input;

  if (image.isAiGenerated) must.push("no_ai_generated_image");
  if (image.hasBragoWatermark) must.push("no_brago_watermark_on_image");
  const overlayWords = countOverlayWords(image.overlayText);
  if (overlayWords < 3 || overlayWords > 5) {
    must.push("has_overlay_text_3_to_5_words");
  }
  if (!passesThumbnailReadability(image.overlayText)) {
    must.push("thumbnail_text_readable_at_150px");
  }

  const struct = checkCaptionStructure(caption, ctx);
  if (struct.issues.includes("missing_title")) {
    must.push("caption_has_title_proper_case");
  }
  if (struct.issues.includes("title_all_caps")) must.push("no_all_caps_in_title");
  if (struct.issues.includes("length_out_of_range")) {
    must.push("caption_100_to_300_chars");
  }
  if (struct.issues.includes("value_prop_missing")) {
    must.push("first_100_chars_has_value_prop");
  }
  if (containsBlacklistedPhrase(caption, language)) {
    must.push("no_blacklisted_phrases");
  }
  if (isTooSimilar(caption, recentCaptions)) {
    must.push("caption_not_70pct_similar_recent_30d");
  }

  const breakdown: ScoreBreakdown = {
    authenticity: 0,
    thumbnailClarity: 0,
    captionCraft: 0,
    ctaAlignment: 0,
    localSpecificity: 0,
    antiTemplate: 0,
  };

  if (must.length > 0) {
    return { score: 0, mustPassFailures: must, breakdown };
  }

  // 加权评分（spec §3.2）
  const body = struct.body;
  const lower = caption.toLowerCase();

  // Authenticity (25)
  const emptinessHits = EMPTINESS_WORDS.filter((w) => lower.includes(w)).length;
  breakdown.authenticity = Math.max(0, 25 - emptinessHits * 8);

  // Thumbnail clarity (20) — 已通过 must-pass readability，给基础 16，overlay 字数刚好则满 20
  breakdown.thumbnailClarity = overlayWords === 4 ? 20 : 16;

  // Caption craft (15)
  const sentences = body.split(/[.!?]/).filter((s) => s.trim());
  const avgWords =
    sentences.reduce((a, s) => a + s.split(/\s+/).filter(Boolean).length, 0) /
      Math.max(1, sentences.length);
  breakdown.captionCraft = avgWords < 20 ? 15 : 9;

  // CTA alignment (10)
  const kind = classifyPostKind(body);
  breakdown.ctaAlignment = isCtaAligned(kind, body) ? 10 : 0;

  // Local specificity (15)
  breakdown.localSpecificity =
    ctx.serviceArea && body.toLowerCase().includes(ctx.serviceArea.toLowerCase())
      ? 15
      : 8;

  // Anti-template (15) — 已通过 similarity must-pass，给基础 12；本地无模板黑名单 +3
  breakdown.antiTemplate = 12 + 3;

  const score =
    breakdown.authenticity +
    breakdown.thumbnailClarity +
    breakdown.captionCraft +
    breakdown.ctaAlignment +
    breakdown.localSpecificity +
    breakdown.antiTemplate;

  return { score, mustPassFailures: [], breakdown };
}
```

- [ ] **Step 4：验证测试通过**

Run: `pnpm test tests/lib/brago-quality-score.test.ts`
Expected: PASS

- [ ] **Step 5：提交**

```bash
git add lib/brago/quality/score.ts tests/lib/brago-quality-score.test.ts
git commit -m "feat(brago/quality): scoreOutput — 11 hard gates + 6 weighted dims per spec §3"
```

---

### Task 3.2：eval 集脚手架

**Files:**
- Create: `tests/brago/quality/eval-set.json`
- Create: `tests/brago/quality/eval-runner.test.ts`

- [ ] **Step 1：写 eval-set 种子数据（5 个用例，spec 允许由实施阶段补全到 50）**

`tests/brago/quality/eval-set.json`：

```json
{
  "$schema_note": "spec §3.3 — expand to 50 cases over time. Each row: input → expected min score.",
  "cases": [
    {
      "id": "pw-park-slope-driveway",
      "industry": "pressure_washing",
      "serviceType": "driveway",
      "serviceArea": "Park Slope",
      "language": "en",
      "candidate": "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. Pollen stains came right off. Book today.",
      "image": { "isAiGenerated": false, "hasBragoWatermark": false, "overlayText": "PARK SLOPE · DRIVEWAY" },
      "minScore": 70
    },
    {
      "id": "ad-austin-ceramic-en",
      "industry": "auto_detailing",
      "serviceType": "ceramic coating",
      "serviceArea": "Austin",
      "language": "en",
      "candidate": "Austin ceramic coat day\n\nFinished a ceramic coating on a black sedan in Austin today. The paint depth is wild. Call now.",
      "image": { "isAiGenerated": false, "hasBragoWatermark": false, "overlayText": "AUSTIN · CERAMIC COATING" },
      "minScore": 70
    },
    {
      "id": "cleaning-miami-deep-es",
      "industry": "cleaning",
      "serviceType": "limpieza profunda",
      "serviceArea": "Miami",
      "language": "es",
      "candidate": "Limpieza profunda en Miami\n\nLimpieza profunda de un apartamento en Miami esta mañana. La cocina quedó como nueva. Llama hoy.",
      "image": { "isAiGenerated": false, "hasBragoWatermark": false, "overlayText": "MIAMI · LIMPIEZA" },
      "minScore": 70
    },
    {
      "id": "anti-american-dream",
      "industry": "pressure_washing",
      "serviceType": "driveway",
      "serviceArea": "Austin",
      "language": "en",
      "candidate": "Best pressure washing in Austin\n\nTrusted by Austin homeowners for years, we offer professional and reliable pressure washing in Austin. Your local expert. Call now.",
      "image": { "isAiGenerated": false, "hasBragoWatermark": false, "overlayText": "AUSTIN · DRIVEWAY" },
      "minScore": 0,
      "expectMustPassFailure": true
    },
    {
      "id": "anti-brago-watermark",
      "industry": "cleaning",
      "serviceType": "carpet cleaning",
      "serviceArea": "Houston",
      "language": "en",
      "candidate": "Houston carpet refresh\n\nDeep cleaned wall-to-wall carpet in a Houston home today. Pet stains gone. Book today.",
      "image": { "isAiGenerated": false, "hasBragoWatermark": true, "overlayText": "HOUSTON · CARPET" },
      "minScore": 0,
      "expectMustPassFailure": true
    }
  ]
}
```

- [ ] **Step 2：写 eval-runner.test.ts**

`tests/brago/quality/eval-runner.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { scoreOutput } from "@/lib/brago/quality/score";
import data from "./eval-set.json";

type EvalCase = {
  id: string;
  industry: string;
  serviceType: string;
  serviceArea: string;
  language: "en" | "es";
  candidate: string;
  image: {
    isAiGenerated: boolean;
    hasBragoWatermark: boolean;
    overlayText: string;
  };
  minScore: number;
  expectMustPassFailure?: boolean;
};

const cases = (data as { cases: EvalCase[] }).cases;

describe("brago quality eval", () => {
  for (const c of cases) {
    it(c.id, () => {
      const r = scoreOutput({
        caption: c.candidate,
        language: c.language,
        ctx: { serviceType: c.serviceType, serviceArea: c.serviceArea },
        recentCaptions: [],
        image: c.image,
      });
      if (c.expectMustPassFailure) {
        expect(r.mustPassFailures.length).toBeGreaterThan(0);
      }
      expect(r.score).toBeGreaterThanOrEqual(c.minScore);
    });
  }
});
```

- [ ] **Step 3：验证**

Run: `pnpm test tests/brago/quality`
Expected: 5 cases PASS。

- [ ] **Step 4：提交**

```bash
git add tests/brago/quality/eval-set.json tests/brago/quality/eval-runner.test.ts
git commit -m "test(brago/quality): seed 5-case eval set (target 50; expand over time)"
```

---

### Task 3.3：把 scoreOutput 接到 generate-caption 路由的响应里（不阻塞）

**Files:**
- Modify: `app/api/brago/google-posts/[postId]/generate-caption/route.ts`
- Modify: `app/api/brago/anonymous/google-posts/[postId]/generate-caption/route.ts`

> 这两条路由暂时只把 quality score **附在响应里观察**（spec OQ #4 — 收集分布后再决定 hard gate）。

- [ ] **Step 1：付费版路由追加打分**

在 `app/api/brago/google-posts/[postId]/generate-caption/route.ts` 的 `return NextResponse.json(...)` 前插入：

```ts
import { scoreOutput } from "@/lib/brago/quality/score";
// ...

const quality = scoreOutput({
  caption: out.caption,
  language,
  ctx: { serviceType: post.serviceType, serviceArea: post.serviceArea },
  recentCaptions: [], // 路由层不重复查 history；scoring 仍计 must-pass
  image: {
    isAiGenerated: false,
    hasBragoWatermark: false,
    overlayText: "", // 渲染阶段才有 overlay；此处不阻塞
  },
});

return NextResponse.json({
  caption: out.caption,
  source: out.source,
  policy: out.policy,
  quality,
});
```

- [ ] **Step 2：匿名路由同样追加**

`app/api/brago/anonymous/google-posts/[postId]/generate-caption/route.ts` 末尾响应改成：

```ts
import { scoreOutput } from "@/lib/brago/quality/score";
// ...
const quality = scoreOutput({
  caption: out.caption,
  language: post.language as CaptionLanguage,
  ctx: { serviceType: effectiveServiceType, serviceArea: effectiveServiceArea },
  recentCaptions: [],
  image: {
    isAiGenerated: false,
    hasBragoWatermark: false,
    overlayText: "",
  },
});

return NextResponse.json({
  caption: out.caption,
  policy: out.policy,
  source: out.source,
  quality,
});
```

- [ ] **Step 3：lint + 全 brago 测试**

Run: `pnpm lint && pnpm test tests/lib/brago- tests/brago`
Expected: 全部 PASS。

- [ ] **Step 4：提交**

```bash
git add app/api/brago/google-posts/\[postId\]/generate-caption/route.ts app/api/brago/anonymous/google-posts/\[postId\]/generate-caption/route.ts
git commit -m "feat(brago/api): attach quality score to caption responses (observe-only, no gate)"
```

---

## 最终验证

- [ ] **Step 1：跑全套 brago 单测**

Run: `pnpm test tests/lib/brago- tests/brago`
Expected: 全部 PASS。

- [ ] **Step 2：lint**

Run: `pnpm lint`
Expected: 0 errors。

- [ ] **Step 3：手测渲染路径（dev 环境，可选）**

Run: `pnpm dev`，访问匿名免费试用页生成一次 → 检查响应里：
- `caption` 是 title + 空行 + body 的结构
- `policy.issues` 不含新硬 gate
- `quality.score ≥ 70`
- 接着调用 render-photo（如果 UI 已接），下载 finalUrl 检查是 1200×900 + 主 after + 角落 before + 底部 overlay。

注意：UI 是否已调用 render-photo 取决于现有页面状态；此 plan 不改 UI。

- [ ] **Step 4：在 launch-checklist 中追加上线必检项（仅当不存在）**

Run: `grep -q "quality score" docs/launch-checklist.md || echo "ADD: 监控 caption 响应里的 quality.score 分布，决定是否上 hard gate（spec OQ #4）"`

如果上面输出 ADD 行，手动把这一条追加到 `docs/launch-checklist.md`。

- [ ] **Step 5：最终提交（仅当有 launch-checklist 改动）**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): track quality-score distribution before enabling hard gate"
```

---

## 自检（写完 plan 后做一次 fresh-eyes review）

**Spec 覆盖**：
- §1.1 禁 AI 生成图：Task 3.1 must-pass `no_ai_generated_image`（由调用方传 flag；图片 pipeline 本就只接受用户上传 buffer，符合）
- §1.2 vision 决策树：已有 `lib/brago/vision/provider.ts` 实现；本 plan 未触
- §1.3 主 after + 角落 before：Task 2.4
- §1.4 overlay 文字：Task 2.2 + 2.6
- §1.5 水印决策树：Task 2.3（其中"绝不加 Brago 水印"通过 buildWatermarkLayer 在无 logo 无商家名时返回 null 来保证）
- §1.6 7 项 hard gate：Task 2.5 覆盖 dimensions / file_size / thumbnail readability；ai-generated / brago-watermark 在 Task 3.1 的 must-pass；EXIF / face/plate/house-number / safe-zone 已经在现有 vision 层处理（spec 自述"已实现 riskFlags"），本 plan 不重复
- §2.1 长度 / 标题：Task 1.3 + 1.7
- §2.2 内容必须项：prompt 已要求；hard gate 在 Task 1.3
- §2.3 反模板措辞：Task 1.2 + 1.7
- §2.4 反重复：Task 1.4
- §2.5 CTA 对齐：Task 1.5
- §2.6 现有 policy：Task 1.6 整合保留旧 + 新
- §2.7 en + es 双语：blacklist + prompt + eval 三处都覆盖
- §3.1 11 项 must-pass：Task 3.1
- §3.2 加权评分：Task 3.1
- §3.3 eval 集：Task 3.2（种子 5 例 → 后续扩 50）
- §4 反模式：分布在 1.2 / 1.6 / 2.3 / 2.4 / 2.5

**Placeholder 扫描**：无 TBD / 模糊指令；每个代码 step 含完整代码块。

**类型一致性**：`GbpPolicyIssue` 联合在 Task 1.1 一次性扩好；`StructureContext` / `WatermarkInput` / `ProofComposeInput` / `MustPassGate` 均在各自定义文件内一致使用。

---

**Plan 写完**。
