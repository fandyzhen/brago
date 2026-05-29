# Brago P0 Phase 5 — Caption Engine

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** 实现 spec 第 8、9、10 章的 Google-safe caption engine：50 个模板覆盖三大行业、policy checker、history-aware dedupe、English/Spanish 输出。

**Architecture:**
- `TextProvider` 抽象，默认 `doubao-text`、fallback `template-fill`（直接套模板，不调外网）。
- 模板库：`lib/brago/caption/templates.ts`（pressure_washing 18 + auto_detailing 16 + cleaning 16 = 50）。
- Policy checker：`lib/brago/caption/policy.ts`，检测 phone/url/全大写/em-dash/AI 套话。
- History dedupe：`lib/brago/caption/history.ts`，提取 opening / key phrases，写 `caption_history` 表。
- 生成流程：`generateCaption(input)`：模板选→prompt 合成→provider 调用→policy 校验→失败重写最多 2 次→保底 fallback→写 history。
- 路由：`POST /api/brago/google-posts/[postId]/generate-caption`、`POST /api/brago/google-posts/[postId]/rewrite`、`/api/brago/free-generator` 替换为真实实现。

**Tech Stack:** 火山引擎 chat、Zod、TS。

---

## 文件清单

### 服务端
- Create: `lib/brago/caption/templates.ts` — 50 个模板（pressure_washing/auto_detailing/cleaning）
- Create: `lib/brago/caption/templates-pressure.ts`
- Create: `lib/brago/caption/templates-detailing.ts`
- Create: `lib/brago/caption/templates-cleaning.ts`
- Create: `lib/brago/caption/policy.ts` — policy checker
- Create: `lib/brago/caption/history.ts` — opening / key phrase 提取 + 写表
- Create: `lib/brago/caption/text-provider.ts` — TextProvider 抽象
- Create: `lib/brago/caption/doubao-text.ts`
- Create: `lib/brago/caption/fallback-text.ts`
- Create: `lib/brago/caption/generate.ts` — 主入口
- Create: `app/api/brago/google-posts/[postId]/generate-caption/route.ts`
- Create: `app/api/brago/google-posts/[postId]/rewrite/route.ts`
- Modify: `app/api/brago/free-generator/route.ts` — 改用新的 generate
- Modify: `app/[locale]/(protected)/google-posts/[postId]/page.tsx` — Caption UI + rewrite 操作

### 测试
- Create: `tests/lib/brago-google-policy.test.ts`
- Create: `tests/lib/brago-caption-templates.test.ts`
- Create: `tests/lib/brago-caption-history.test.ts`
- Create: `tests/lib/brago-caption-generate.test.ts`

---

## Task 1: Policy Checker

**Files:**
- Create: `lib/brago/caption/policy.ts`

- [ ] **Step 1: 测试先**

`tests/lib/brago-google-policy.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

describe("checkGooglePolicy", () => {
  it("flags phone numbers", () => {
    const r = checkGooglePolicy("Call us at 512-555-1234 today!");
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("phone_number_detected");
  });

  it("flags URLs", () => {
    const r = checkGooglePolicy("Visit https://example.com for booking.");
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("url_detected");
  });

  it("flags em dashes", () => {
    const r = checkGooglePolicy("Cleaned this driveway — looks fresh again.");
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("em_dash_detected");
  });

  it("flags shouting all caps", () => {
    const r = checkGooglePolicy("BEST DEAL IN TOWN GUARANTEED");
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("shouting_text");
  });

  it("flags AI cliches", () => {
    const r = checkGooglePolicy("Whether you need a quick wash or a deep clean, we got you.");
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("ai_cliche");
  });

  it("flags too long", () => {
    const text = "a".repeat(1600);
    const r = checkGooglePolicy(text);
    expect(r.issues).toContain("too_long");
  });

  it("passes a clean caption", () => {
    const r = checkGooglePolicy("Cleaned up this driveway in South Austin today. Concrete looks fresh again.");
    expect(r.valid).toBe(true);
  });
});
```

- [ ] **Step 2: 实现**

```ts
import type { GbpPolicyIssue, PolicyCheckResult } from "@/lib/brago/types";

const PHONE_RE = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/;
const URL_RE = /(?:https?:\/\/|www\.|[\w-]+\.(?:com|net|org|co|io|us|biz|info)\b)/i;
const EM_DASH_RE = /—/;
const ALL_CAPS_RUN = /\b[A-Z]{5,}(?:\s+[A-Z]{4,}){1,}\b/; // 至少两个连续 4+ 字母的全大写词

const AI_CLICHES = [
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

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export function checkGooglePolicy(text: string): PolicyCheckResult {
  const issues: GbpPolicyIssue[] = [];
  const trimmed = (text ?? "").trim();
  if (trimmed.length > 1500) issues.push("too_long");
  if (PHONE_RE.test(trimmed)) issues.push("phone_number_detected");
  if (URL_RE.test(trimmed)) issues.push("url_detected");
  if (EM_DASH_RE.test(trimmed)) issues.push("em_dash_detected");
  if (ALL_CAPS_RUN.test(trimmed)) issues.push("shouting_text");
  if (AI_CLICHES.some(re => re.test(trimmed))) issues.push("ai_cliche");
  const emojiCount = (trimmed.match(EMOJI_RE) ?? []).length;
  if (emojiCount > 2) issues.push("too_many_emojis");
  return { valid: issues.length === 0, issues };
}

export function policyIssueLabel(issue: GbpPolicyIssue): string {
  switch (issue) {
    case "phone_number_detected": return "Phone number detected — Google's Call button handles this.";
    case "url_detected": return "URL detected — keep links out of the caption.";
    case "too_long": return "Caption is over 1500 characters.";
    case "too_many_emojis": return "Too many emojis (max 2).";
    case "shouting_text": return "Avoid ALL-CAPS marketing shouts.";
    case "unverified_claim": return "Unverified claim — only mention licenses/insurance if you've verified.";
    case "ai_cliche": return "Sounds AI-generated — make it more specific.";
    case "em_dash_detected": return "Avoid em dashes.";
  }
}
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test tests/lib/brago-google-policy.test.ts
```

预期：7 pass。

- [ ] **Step 4: Commit**

```bash
git add lib/brago/caption/policy.ts tests/lib/brago-google-policy.test.ts
git commit -m "feat(brago): GBP policy checker"
```

---

## Task 2: Caption 模板库（50 个）

**Files:**
- Create: `lib/brago/caption/templates-pressure.ts`
- Create: `lib/brago/caption/templates-detailing.ts`
- Create: `lib/brago/caption/templates-cleaning.ts`
- Create: `lib/brago/caption/templates.ts` — 汇总 + 查询

模板原则：
- 每条用 `{city}` `{serviceType}` 占位
- 避开 phone/URL/全大写/em dash
- avoidList 写明该模板要避免的措辞

- [ ] **Step 1: pressure 模板（18）**

```ts
// lib/brago/caption/templates-pressure.ts
import type { GoogleCaptionTemplate } from "@/lib/brago/types";

export const PRESSURE_TEMPLATES: GoogleCaptionTemplate[] = [
  {
    id: "pw_driveway_seasonal_1",
    industry: "pressure_washing",
    serviceTypes: ["driveway"],
    seasons: ["spring", "summer", "fall", "any"],
    themes: ["grime", "concrete"],
    tone: "neighborly",
    templateText: "Knocked out a driveway in {city} today. Years of grime and dark stains came off the concrete and it looks bright again. If yours is starting to look the same, the Call button on our Google profile is the easiest way to reach us.",
    avoid: ["transformation", "amazing"],
    example: "Knocked out a driveway in South Austin today.",
  },
  {
    id: "pw_driveway_2",
    industry: "pressure_washing",
    serviceTypes: ["driveway"],
    seasons: ["any"],
    themes: ["oil_stains", "concrete"],
    tone: "casual",
    templateText: "Cleaned up a driveway over in {city}. Took our time on the oil spots and the result is a much cleaner surface. Happy to help with yours if it could use the same treatment.",
    avoid: ["transformation"],
    example: "Cleaned up a driveway over in Round Rock.",
  },
  {
    id: "pw_patio_1",
    industry: "pressure_washing",
    serviceTypes: ["patio"],
    seasons: ["spring", "summer"],
    themes: ["mold", "outdoor_living"],
    tone: "neighborly",
    templateText: "Patio in {city} got a deep clean today. Cleared off the green mildew that builds up after a wet stretch, so it's ready for grilling weather.",
    avoid: ["grill out (region-specific)"],
    example: "Patio in San Marcos got a deep clean today.",
  },
  {
    id: "pw_patio_2",
    industry: "pressure_washing",
    serviceTypes: ["patio"],
    seasons: ["any"],
    themes: ["outdoor_living"],
    tone: "casual",
    templateText: "Spent the morning bringing a tired patio in {city} back to a usable space. Pavers came out a noticeably cleaner color.",
    avoid: ["amazing"],
    example: "Spent the morning bringing a tired patio in Plano back to a usable space.",
  },
  {
    id: "pw_house_wash_1",
    industry: "pressure_washing",
    serviceTypes: ["siding", "house wash"],
    seasons: ["any"],
    themes: ["curb_appeal"],
    tone: "professional",
    templateText: "House wash done in {city}. Soft-washed the siding so we didn't push water behind the panels, and pulled off the buildup that makes a place look dingy from the street.",
    avoid: ["curb appeal (overused)"],
    example: "House wash done in Cedar Park.",
  },
  {
    id: "pw_house_wash_2",
    industry: "pressure_washing",
    serviceTypes: ["siding", "house wash"],
    seasons: ["spring", "summer"],
    themes: ["mildew"],
    tone: "neighborly",
    templateText: "Washed a house in {city} this afternoon. The north side had the usual mildew streaks from the shaded run-off, and they came clean.",
    avoid: ["transformation"],
    example: "Washed a house in Pflugerville this afternoon.",
  },
  {
    id: "pw_walkway_1",
    industry: "pressure_washing",
    serviceTypes: ["walkway"],
    seasons: ["spring", "summer", "fall"],
    themes: ["algae", "safety"],
    tone: "professional",
    templateText: "Walkway cleaning in {city}. Took the slick algae layer off so it's safer to walk on, and the brick color came back through.",
    avoid: ["like new"],
    example: "Walkway cleaning in Buda.",
  },
  {
    id: "pw_walkway_2",
    industry: "pressure_washing",
    serviceTypes: ["walkway"],
    seasons: ["any"],
    themes: ["brick"],
    tone: "casual",
    templateText: "Front walkway in {city} got the treatment today. Worked the joints carefully so we did not blow out the mortar.",
    avoid: ["transformation"],
    example: "Front walkway in Lakeway got the treatment today.",
  },
  {
    id: "pw_deck_1",
    industry: "pressure_washing",
    serviceTypes: ["deck"],
    seasons: ["spring", "summer"],
    themes: ["wood"],
    tone: "professional",
    templateText: "Deck wash in {city}. Used a lower pressure pass for the wood grain and the boards came out cleaner without raising fibers.",
    avoid: ["amazing"],
    example: "Deck wash in Manor.",
  },
  {
    id: "pw_deck_2",
    industry: "pressure_washing",
    serviceTypes: ["deck"],
    seasons: ["summer"],
    themes: ["wood", "summer"],
    tone: "neighborly",
    templateText: "Took care of a deck in {city} before the weekend. Now it is ready for cookouts and bare feet.",
    avoid: ["transformation"],
    example: "Took care of a deck in Round Rock before the weekend.",
  },
  {
    id: "pw_fence_1",
    industry: "pressure_washing",
    serviceTypes: ["fence"],
    seasons: ["any"],
    themes: ["wood"],
    tone: "casual",
    templateText: "Cleaned a wood fence run in {city}. Years of weather grime came off and the wood is ready to take a fresh seal.",
    avoid: ["transformation"],
    example: "Cleaned a wood fence run in Hutto.",
  },
  {
    id: "pw_oil_1",
    industry: "pressure_washing",
    serviceTypes: ["driveway", "oil stain"],
    seasons: ["any"],
    themes: ["oil_stains"],
    tone: "professional",
    templateText: "Worked on stubborn oil stains in a driveway in {city}. Treated the spots first, then surface cleaned across the slab so the color matches edge to edge.",
    avoid: ["transformation"],
    example: "Worked on stubborn oil stains in a driveway in Leander.",
  },
  {
    id: "pw_commercial_1",
    industry: "pressure_washing",
    serviceTypes: ["commercial", "storefront"],
    seasons: ["any"],
    themes: ["commercial"],
    tone: "professional",
    templateText: "Storefront sidewalk cleaning in {city}. We scheduled it before opening so the foot traffic stayed off the wet pavers.",
    avoid: ["amazing"],
    example: "Storefront sidewalk cleaning in Bee Cave.",
  },
  {
    id: "pw_roof_1",
    industry: "pressure_washing",
    serviceTypes: ["roof"],
    seasons: ["any"],
    themes: ["roof"],
    tone: "professional",
    templateText: "Soft wash on a roof in {city}. Used the right mix on the shingles so the dark streaks lifted without pressure damage.",
    avoid: ["transformation"],
    example: "Soft wash on a roof in Georgetown.",
  },
  {
    id: "pw_winter_1",
    industry: "pressure_washing",
    serviceTypes: ["driveway", "walkway"],
    seasons: ["winter"],
    themes: ["winter"],
    tone: "professional",
    templateText: "Got a job done in {city} before the next cold snap. Cleared off the build-up while the weather still cooperated.",
    avoid: ["amazing"],
    example: "Got a job done in McKinney before the next cold snap.",
  },
  {
    id: "pw_fall_1",
    industry: "pressure_washing",
    serviceTypes: ["driveway", "walkway"],
    seasons: ["fall"],
    themes: ["fall", "leaves"],
    tone: "neighborly",
    templateText: "Cleaned up after a long leaf-fall season in {city}. The tannin staining lifted off the concrete and brightened the whole entry.",
    avoid: ["transformation"],
    example: "Cleaned up after a long leaf-fall season in Frisco.",
  },
  {
    id: "pw_pre_paint_1",
    industry: "pressure_washing",
    serviceTypes: ["siding", "house wash"],
    seasons: ["any"],
    themes: ["pre_paint"],
    tone: "professional",
    templateText: "Pre-paint house wash in {city}. Pulled off the chalking and grime so the new coat has a clean surface to bond to.",
    avoid: ["transformation"],
    example: "Pre-paint house wash in Allen.",
  },
  {
    id: "pw_seasonal_storm_1",
    industry: "pressure_washing",
    serviceTypes: ["driveway", "patio"],
    seasons: ["spring", "fall"],
    themes: ["storm_cleanup"],
    tone: "neighborly",
    templateText: "Cleaned up after the last round of storms in {city}. The mud splash on the lower siding and pavers all came off in one pass.",
    avoid: ["amazing"],
    example: "Cleaned up after the last round of storms in Garland.",
  },
];
```

- [ ] **Step 2: detailing 模板（16）**

```ts
// lib/brago/caption/templates-detailing.ts
import type { GoogleCaptionTemplate } from "@/lib/brago/types";

export const DETAILING_TEMPLATES: GoogleCaptionTemplate[] = [
  { id: "ad_interior_1", industry: "auto_detailing", serviceTypes: ["interior detail"], seasons: ["any"], themes: ["interior"], tone: "professional", templateText: "Full interior detail done in {city}. Pulled embedded dirt from the carpet and treated the panels so the cabin feels cared for again.", avoid: ["showroom"], example: "Full interior detail done in Frisco." },
  { id: "ad_interior_pet_1", industry: "auto_detailing", serviceTypes: ["pet hair", "interior detail"], seasons: ["any"], themes: ["pet_hair"], tone: "neighborly", templateText: "Pet-hair removal in {city}. Worked the seats and carpets until the hair was actually out of the fibers, not just sitting on top.", avoid: ["amazing"], example: "Pet-hair removal in The Colony." },
  { id: "ad_exterior_1", industry: "auto_detailing", serviceTypes: ["exterior wash"], seasons: ["any"], themes: ["paint"], tone: "professional", templateText: "Exterior wash and decontamination in {city}. Took the bonded contamination off the paint so it feels smooth again.", avoid: ["transformation"], example: "Exterior wash and decontamination in Plano." },
  { id: "ad_paint_correction_1", industry: "auto_detailing", serviceTypes: ["paint correction"], seasons: ["any"], themes: ["paint"], tone: "premium", templateText: "Paint correction stage in {city}. Pulled out the swirl marks under direct light so the gloss reads cleaner than before.", avoid: ["transformation"], example: "Paint correction stage in Southlake." },
  { id: "ad_ceramic_1", industry: "auto_detailing", serviceTypes: ["ceramic coating"], seasons: ["any"], themes: ["ceramic"], tone: "premium", templateText: "Ceramic coating applied in {city}. Surface prep took most of the day so the coating could bond to clean paint.", avoid: ["lifetime"], example: "Ceramic coating applied in Westlake." },
  { id: "ad_wheel_1", industry: "auto_detailing", serviceTypes: ["wheel cleaning"], seasons: ["any"], themes: ["wheels"], tone: "casual", templateText: "Wheel and brake-dust cleaning in {city}. The barrels and faces came back to bare metal without acid.", avoid: ["amazing"], example: "Wheel and brake-dust cleaning in McKinney." },
  { id: "ad_engine_1", industry: "auto_detailing", serviceTypes: ["engine bay"], seasons: ["any"], themes: ["engine_bay"], tone: "professional", templateText: "Engine bay refresh in {city}. Degreased and dressed without soaking the sensitive components.", avoid: ["transformation"], example: "Engine bay refresh in Allen." },
  { id: "ad_mobile_1", industry: "auto_detailing", serviceTypes: ["mobile detail"], seasons: ["any"], themes: ["mobile"], tone: "neighborly", templateText: "Mobile detail at a driveway in {city} today. Brought water and power with us so the customer did not have to lift a finger.", avoid: ["doorstep"], example: "Mobile detail at a driveway in Carrollton." },
  { id: "ad_pre_sale_1", industry: "auto_detailing", serviceTypes: ["exterior wash", "interior detail"], seasons: ["any"], themes: ["resale"], tone: "professional", templateText: "Pre-sale detail in {city}. The owner wanted the car to photograph well for the listing, so we focused on paint and interior plastics.", avoid: ["transformation"], example: "Pre-sale detail in Lewisville." },
  { id: "ad_truck_1", industry: "auto_detailing", serviceTypes: ["interior detail", "exterior wash"], seasons: ["any"], themes: ["truck"], tone: "casual", templateText: "Work truck refresh in {city}. Lots of caked-in mud and tool dust came out of the cab and bed.", avoid: ["amazing"], example: "Work truck refresh in Wylie." },
  { id: "ad_seasonal_winter_1", industry: "auto_detailing", serviceTypes: ["exterior wash"], seasons: ["winter"], themes: ["winter", "salt"], tone: "professional", templateText: "Salt and road-grime wash in {city}. Got the underbody and wheel wells before the next cold week.", avoid: ["amazing"], example: "Salt and road-grime wash in Rockwall." },
  { id: "ad_seasonal_summer_1", industry: "auto_detailing", serviceTypes: ["interior detail"], seasons: ["summer"], themes: ["summer", "uv"], tone: "neighborly", templateText: "Cabin reset in {city} before the next heat wave. The dash and panels got UV protection and feel cooler to the touch.", avoid: ["amazing"], example: "Cabin reset in Mansfield before the next heat wave." },
  { id: "ad_polish_1", industry: "auto_detailing", serviceTypes: ["polish"], seasons: ["any"], themes: ["paint"], tone: "premium", templateText: "Single-stage polish on a daily driver in {city}. The clarity in the reflections changed noticeably.", avoid: ["transformation"], example: "Single-stage polish on a daily driver in Coppell." },
  { id: "ad_headlight_1", industry: "auto_detailing", serviceTypes: ["headlight restoration"], seasons: ["any"], themes: ["headlights"], tone: "professional", templateText: "Headlight restoration in {city}. Took the yellow haze off and sealed them so they stay clear longer.", avoid: ["amazing"], example: "Headlight restoration in Richardson." },
  { id: "ad_leather_1", industry: "auto_detailing", serviceTypes: ["interior detail", "leather"], seasons: ["any"], themes: ["leather"], tone: "premium", templateText: "Leather clean and condition in {city}. Lifted the dye transfer from the bolsters and put moisture back into the seat.", avoid: ["amazing"], example: "Leather clean and condition in Highland Park." },
  { id: "ad_quick_maint_1", industry: "auto_detailing", serviceTypes: ["exterior wash"], seasons: ["any"], themes: ["maintenance"], tone: "casual", templateText: "Maintenance wash in {city}. Hand-washed two-bucket method so the paint stays scratch-free between bigger services.", avoid: ["transformation"], example: "Maintenance wash in Irving." },
];
```

- [ ] **Step 3: cleaning 模板（16）**

```ts
// lib/brago/caption/templates-cleaning.ts
import type { GoogleCaptionTemplate } from "@/lib/brago/types";

export const CLEANING_TEMPLATES: GoogleCaptionTemplate[] = [
  { id: "cl_carpet_1", industry: "cleaning", serviceTypes: ["carpet cleaning"], seasons: ["any"], themes: ["carpet"], tone: "professional", templateText: "Carpet cleaning in {city}. Pulled out the deep traffic-lane soil with a hot water extraction pass.", avoid: ["transformation"], example: "Carpet cleaning in Tomball." },
  { id: "cl_carpet_pet_1", industry: "cleaning", serviceTypes: ["carpet cleaning", "pet stain"], seasons: ["any"], themes: ["carpet", "pet"], tone: "neighborly", templateText: "Pet-stain treatment in {city}. Treated the spots at the pad and the smell along with them.", avoid: ["amazing"], example: "Pet-stain treatment in Spring." },
  { id: "cl_moveout_1", industry: "cleaning", serviceTypes: ["move-out cleaning"], seasons: ["any"], themes: ["move_out"], tone: "professional", templateText: "Move-out cleaning in {city}. Detailed the kitchen and bathrooms so the inspection goes smoothly.", avoid: ["transformation"], example: "Move-out cleaning in Sugar Land." },
  { id: "cl_movein_1", industry: "cleaning", serviceTypes: ["move-in cleaning"], seasons: ["any"], themes: ["move_in"], tone: "neighborly", templateText: "Move-in clean in {city}. Wiped down cabinets and reset the spaces before the family unpacks.", avoid: ["amazing"], example: "Move-in clean in Katy." },
  { id: "cl_window_1", industry: "cleaning", serviceTypes: ["window cleaning"], seasons: ["any"], themes: ["windows"], tone: "professional", templateText: "Window cleaning in {city}. Squeegeed both sides so the light comes through clear without streaks.", avoid: ["amazing"], example: "Window cleaning in Pearland." },
  { id: "cl_window_high_1", industry: "cleaning", serviceTypes: ["window cleaning", "exterior windows"], seasons: ["any"], themes: ["windows", "exterior"], tone: "professional", templateText: "Exterior window cleaning in {city}. Used the pure-water pole for the upper panes so there were no ladder marks on the siding.", avoid: ["transformation"], example: "Exterior window cleaning in Cypress." },
  { id: "cl_commercial_1", industry: "cleaning", serviceTypes: ["commercial cleaning"], seasons: ["any"], themes: ["commercial"], tone: "professional", templateText: "Commercial cleaning in {city}. Reset the break room and bathrooms before the morning shift.", avoid: ["amazing"], example: "Commercial cleaning in Humble." },
  { id: "cl_office_1", industry: "cleaning", serviceTypes: ["office cleaning"], seasons: ["any"], themes: ["office"], tone: "professional", templateText: "Office cleaning in {city}. Detailed the high-touch surfaces and reset the kitchen.", avoid: ["transformation"], example: "Office cleaning in Round Rock." },
  { id: "cl_airbnb_1", industry: "cleaning", serviceTypes: ["short term rental"], seasons: ["any"], themes: ["str", "turnover"], tone: "professional", templateText: "Turnover clean in {city}. Linens fresh, kitchen reset, bathrooms polished for the next guest check-in.", avoid: ["amazing"], example: "Turnover clean in San Antonio." },
  { id: "cl_deep_1", industry: "cleaning", serviceTypes: ["deep clean"], seasons: ["any"], themes: ["deep"], tone: "neighborly", templateText: "Deep clean in {city}. Got the baseboards and behind the appliances that don't usually make it into a regular service.", avoid: ["transformation"], example: "Deep clean in Conroe." },
  { id: "cl_post_construction_1", industry: "cleaning", serviceTypes: ["post construction"], seasons: ["any"], themes: ["post_construction"], tone: "professional", templateText: "Post-construction clean in {city}. Pulled drywall dust off every surface so the owners could walk in fresh.", avoid: ["amazing"], example: "Post-construction clean in Friendswood." },
  { id: "cl_recurring_1", industry: "cleaning", serviceTypes: ["recurring cleaning"], seasons: ["any"], themes: ["recurring"], tone: "casual", templateText: "Recurring clean for a family in {city}. Same team each visit so they get consistent results.", avoid: ["amazing"], example: "Recurring clean for a family in Magnolia." },
  { id: "cl_upholstery_1", industry: "cleaning", serviceTypes: ["upholstery cleaning"], seasons: ["any"], themes: ["upholstery"], tone: "professional", templateText: "Upholstery cleaning in {city}. Worked a sectional that had years of daily use and lifted the embedded soil.", avoid: ["transformation"], example: "Upholstery cleaning in League City." },
  { id: "cl_tile_grout_1", industry: "cleaning", serviceTypes: ["tile and grout"], seasons: ["any"], themes: ["tile"], tone: "professional", templateText: "Tile and grout cleaning in {city}. Brought the grout lines back to their original color in the kitchen.", avoid: ["amazing"], example: "Tile and grout cleaning in Kingwood." },
  { id: "cl_winter_1", industry: "cleaning", serviceTypes: ["deep clean", "window cleaning"], seasons: ["winter"], themes: ["winter"], tone: "neighborly", templateText: "Pre-holiday reset in {city}. Cleared the windows and high dust so the house photographs well for family visits.", avoid: ["amazing"], example: "Pre-holiday reset in Friendswood." },
  { id: "cl_spring_1", industry: "cleaning", serviceTypes: ["deep clean"], seasons: ["spring"], themes: ["spring"], tone: "neighborly", templateText: "Spring deep clean in {city}. Reset the rooms that did not get touched over the winter.", avoid: ["amazing"], example: "Spring deep clean in Frisco." },
];
```

- [ ] **Step 4: templates.ts 汇总 + 查询**

```ts
// lib/brago/caption/templates.ts
import type { GoogleCaptionTemplate, Industry } from "@/lib/brago/types";
import { PRESSURE_TEMPLATES } from "./templates-pressure";
import { DETAILING_TEMPLATES } from "./templates-detailing";
import { CLEANING_TEMPLATES } from "./templates-cleaning";

export const ALL_TEMPLATES: GoogleCaptionTemplate[] = [
  ...PRESSURE_TEMPLATES,
  ...DETAILING_TEMPLATES,
  ...CLEANING_TEMPLATES,
];

export type TemplateQuery = {
  industry: Industry;
  serviceType: string;
  season?: "spring" | "summer" | "fall" | "winter" | "any";
  limit?: number;
};

export function findTemplates(q: TemplateQuery): GoogleCaptionTemplate[] {
  const stLower = q.serviceType.toLowerCase();
  const matches = ALL_TEMPLATES.filter(t => {
    if (t.industry !== q.industry) return false;
    if (!t.serviceTypes.some(s => stLower.includes(s.toLowerCase()) || s.toLowerCase().includes(stLower))) return false;
    if (q.season && q.season !== "any" && !t.seasons.includes(q.season) && !t.seasons.includes("any")) return false;
    return true;
  });
  if (matches.length > 0) return matches.slice(0, q.limit ?? 5);
  // industry-only fallback
  return ALL_TEMPLATES.filter(t => t.industry === q.industry).slice(0, q.limit ?? 5);
}

export function currentSeasonFor(date = new Date()): "spring" | "summer" | "fall" | "winter" {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}
```

- [ ] **Step 5: 测试**

`tests/lib/brago-caption-templates.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { ALL_TEMPLATES, findTemplates, currentSeasonFor } from "@/lib/brago/caption/templates";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

describe("caption templates", () => {
  it("has at least 50 templates", () => {
    expect(ALL_TEMPLATES.length).toBeGreaterThanOrEqual(50);
  });

  it("every template passes the policy check", () => {
    for (const t of ALL_TEMPLATES) {
      const text = t.templateText.replace(/\{city\}/g, "Austin").replace(/\{serviceType\}/g, "driveway");
      const r = checkGooglePolicy(text);
      expect(r.valid, `template ${t.id} failed: ${JSON.stringify(r.issues)}`).toBe(true);
    }
  });

  it("findTemplates returns industry matches when service unknown", () => {
    const r = findTemplates({ industry: "pressure_washing", serviceType: "weird-service" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every(t => t.industry === "pressure_washing")).toBe(true);
  });

  it("currentSeasonFor returns one of four", () => {
    expect(["spring", "summer", "fall", "winter"]).toContain(currentSeasonFor());
  });
});
```

- [ ] **Step 6: 跑测试**

```bash
pnpm test tests/lib/brago-caption-templates.test.ts
```

预期：4 pass。注意 50 个模板可能因为某些短语意外触发 policy（如 AI cliche / em dash），跑测试时如有失败需要改模板（不是改 policy）。

- [ ] **Step 7: Commit**

```bash
git add lib/brago/caption/ tests/lib/brago-caption-templates.test.ts
git commit -m "feat(brago): 50 Google-safe caption templates"
```

---

## Task 3: History helpers (opening / key phrases / write)

**Files:**
- Create: `lib/brago/caption/history.ts`

- [ ] **Step 1: 实现**

```ts
import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { captionHistory } from "@/lib/db/schema";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";

export function extractOpeningPhrase(text: string): string {
  const trimmed = text.trim().replace(/^[^\w]+/, "");
  const firstSentence = trimmed.split(/[.!?]/)[0] ?? "";
  // 取前 6 个词
  return firstSentence.split(/\s+/).slice(0, 6).join(" ").toLowerCase();
}

const STOP_WORDS = new Set(["the","a","an","and","or","but","of","in","on","at","for","to","is","was","were","with","this","that","we","i","you","your","our","my","it","its","they","them","their","got","go","gone"]);

export function extractKeyPhrases(text: string, max = 5): string[] {
  const words = text.toLowerCase().replace(/[^a-z\s']/g, " ").split(/\s+/).filter(Boolean);
  const counts = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (STOP_WORDS.has(a) || STOP_WORDS.has(b)) continue;
    if (a.length < 3 || b.length < 3) continue;
    const phrase = `${a} ${b}`;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, max).map(([phrase]) => phrase);
}

export async function recordCaptionHistory(input: {
  userId: string;
  googlePostId?: string | null;
  captionText: string;
  language: CaptionLanguage;
  industry: Industry;
  serviceType: string;
}) {
  const id = randomUUID();
  const opening = extractOpeningPhrase(input.captionText);
  const keys = extractKeyPhrases(input.captionText);
  await db.insert(captionHistory).values({
    id,
    userId: input.userId,
    googlePostId: input.googlePostId ?? null,
    captionText: input.captionText,
    language: input.language,
    industry: input.industry,
    serviceType: input.serviceType,
    openingPhrase: opening,
    keyPhrasesJson: JSON.stringify(keys),
  });
  return id;
}

export async function getRecentHistory(userId: string, serviceType: string, limit = 10) {
  return db
    .select()
    .from(captionHistory)
    .where(and(eq(captionHistory.userId, userId), eq(captionHistory.serviceType, serviceType)))
    .orderBy(desc(captionHistory.createdAt))
    .limit(limit);
}
```

- [ ] **Step 2: 测试**

`tests/lib/brago-caption-history.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { extractOpeningPhrase, extractKeyPhrases } from "@/lib/brago/caption/history";

describe("opening phrase", () => {
  it("returns lowercased first ~6 words", () => {
    expect(extractOpeningPhrase("Cleaned up this driveway in South Austin today.")).toBe("cleaned up this driveway in south");
  });
  it("handles leading punctuation", () => {
    expect(extractOpeningPhrase(`"Took on a job today."`)).toBe("took on a job today");
  });
});

describe("key phrases", () => {
  it("filters stop words and picks bigrams", () => {
    const k = extractKeyPhrases("Cleaned the driveway concrete looked bright the concrete was clean concrete bright concrete bright");
    expect(k.length).toBeGreaterThan(0);
    expect(k.every(p => /^\S+ \S+$/.test(p))).toBe(true);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add lib/brago/caption/history.ts tests/lib/brago-caption-history.test.ts
git commit -m "feat(brago): caption history extraction"
```

---

## Task 4: Text Provider 抽象 + fallback + doubao

**Files:**
- Create: `lib/brago/caption/text-provider.ts`
- Create: `lib/brago/caption/fallback-text.ts`
- Create: `lib/brago/caption/doubao-text.ts`

- [ ] **Step 1: text-provider.ts**

```ts
import "server-only";
import type { BrandVoiceProfile, CaptionLanguage, Industry } from "@/lib/brago/types";

export type CaptionInput = {
  industry: Industry;
  serviceType: string;
  serviceArea: string | null;
  language: CaptionLanguage;
  brandVoice: BrandVoiceProfile;
  templateExamples: string[]; // 3-5 个去重 references
  avoidOpenings: string[];
  avoidPhrases: string[];
  customInstruction?: string; // 用户点 "Shorter" / "Less salesy" / "Rewrite" 时
};

export type CaptionResult = {
  caption: string;
  language: CaptionLanguage;
  source: "ai" | "fallback-template";
};

export type TextProvider = {
  name: string;
  generateGoogleCaption(input: CaptionInput): Promise<CaptionResult>;
};

import { createFallbackTextProvider } from "./fallback-text";
import { createDoubaoTextProvider } from "./doubao-text";

export function getTextProvider(): TextProvider {
  if (process.env.VOLCANO_ENGINE_API_KEY) return createDoubaoTextProvider();
  return createFallbackTextProvider();
}

export function isAiTextAvailable(): boolean {
  return Boolean(process.env.VOLCANO_ENGINE_API_KEY);
}
```

- [ ] **Step 2: fallback-text.ts**

```ts
import "server-only";
import type { CaptionInput, CaptionResult, TextProvider } from "./text-provider";

export function createFallbackTextProvider(): TextProvider {
  return {
    name: "fallback-template",
    async generateGoogleCaption(input: CaptionInput): Promise<CaptionResult> {
      const example = input.templateExamples[0] ?? "Took care of a {serviceType} in {area} today.";
      const city = input.serviceArea ?? "your neighborhood";
      let caption = example
        .replace(/\{city\}/g, city)
        .replace(/\{serviceType\}/g, input.serviceType)
        .replace(/\{area\}/g, city);
      // 简单本地化
      if (input.language === "es") {
        caption = caption
          .replace(/\bToday\b/gi, "Hoy")
          .replace(/\bCleaned up\b/gi, "Limpiamos")
          .replace(/\bcleaning\b/gi, "limpieza")
          .replace(/\bdriveway\b/gi, "entrada de auto")
          .replace(/\bpatio\b/gi, "patio")
          .replace(/\bwindow\b/gi, "ventana");
      }
      return { caption, language: input.language, source: "fallback-template" };
    },
  };
}
```

- [ ] **Step 3: doubao-text.ts**

```ts
import "server-only";
import { createChatCompletion } from "@/lib/volcano-engine/chat";
import type { CaptionInput, CaptionResult, TextProvider } from "./text-provider";

function buildSystemPrompt(input: CaptionInput): string {
  const langName = input.language === "es" ? "Spanish" : "English";
  return [
    `You write Google Business Profile captions for a local ${input.industry.replace("_", " ")} business.`,
    `Output language: ${langName}.`,
    "STRICT RULES:",
    "- No phone numbers. No URLs. No em dashes. No ALL-CAPS shouting.",
    "- 0-2 emojis max (prefer 0).",
    "- 60-700 characters preferred, max 1500.",
    "- Sound like a real local owner. No 'transform', 'looking to', 'whether you need', 'say goodbye to', 'we take pride in', 'another satisfying job', 'brought back to life'.",
    "- If suggesting contact, refer to the Call button on the Google profile.",
    "- Do NOT include hashtags.",
  ].join("\n");
}

function buildUserPrompt(input: CaptionInput): string {
  return [
    `Service: ${input.serviceType}`,
    input.serviceArea ? `Area: ${input.serviceArea}` : "",
    `Speaker: ${input.brandVoice.speaker}`,
    `Tone: ${input.brandVoice.tone.join(", ") || "neighborly"}`,
    `Avoid: ${input.brandVoice.avoid.join(", ") || "fake_guarantees"}`,
    input.brandVoice.verifiedClaims.licensed ? "Verified: licensed" : "",
    input.brandVoice.verifiedClaims.insured ? "Verified: insured" : "",
    input.brandVoice.verifiedClaims.familyOwned ? "Verified: family-owned" : "",
    "",
    "EXAMPLES (do not copy exactly, just match style):",
    ...input.templateExamples.map((e, i) => `Example ${i + 1}: ${e}`),
    "",
    input.avoidOpenings.length ? `Avoid copying these recent openings: ${input.avoidOpenings.join("; ")}` : "",
    input.avoidPhrases.length ? `Avoid overusing these phrases: ${input.avoidPhrases.join("; ")}` : "",
    input.customInstruction ? `Style instruction: ${input.customInstruction}` : "",
    "",
    "Write ONE caption only. No surrounding quotes. No labels.",
  ].filter(Boolean).join("\n");
}

export function createDoubaoTextProvider(): TextProvider {
  return {
    name: "doubao",
    async generateGoogleCaption(input: CaptionInput): Promise<CaptionResult> {
      const res = await createChatCompletion(
        [
          { role: "system", content: buildSystemPrompt(input) },
          { role: "user", content: buildUserPrompt(input) },
        ],
        { temperature: 0.7, max_tokens: 600 },
      );
      const caption = (res.choices?.[0]?.message?.content ?? "").trim();
      if (!caption) throw new Error("Empty caption from doubao");
      return { caption, language: input.language, source: "ai" };
    },
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/brago/caption/text-provider.ts lib/brago/caption/fallback-text.ts lib/brago/caption/doubao-text.ts
git commit -m "feat(brago): text provider abstraction"
```

---

## Task 5: 主入口 `generate.ts`

**Files:**
- Create: `lib/brago/caption/generate.ts`

- [ ] **Step 1:**

```ts
import "server-only";
import { getBrandVoice } from "@/lib/brago/brand-voice";
import { getRecentHistory, recordCaptionHistory } from "./history";
import { findTemplates, currentSeasonFor } from "./templates";
import { checkGooglePolicy } from "./policy";
import { getTextProvider } from "./text-provider";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";

export type GenerateCaptionInput = {
  userId: string;
  googlePostId?: string | null;
  industry: Industry;
  serviceType: string;
  serviceArea: string | null;
  language: CaptionLanguage;
  customInstruction?: string;
};

export async function generateCaption(input: GenerateCaptionInput) {
  const [voice, history] = await Promise.all([
    getBrandVoice(input.userId),
    getRecentHistory(input.userId, input.serviceType, 10),
  ]);

  const templates = findTemplates({
    industry: input.industry,
    serviceType: input.serviceType,
    season: currentSeasonFor(),
    limit: 5,
  });

  const avoidOpenings = history.map(h => h.openingPhrase ?? "").filter(Boolean);
  const avoidPhrases = history.flatMap(h => {
    try { return JSON.parse(h.keyPhrasesJson ?? "[]") as string[]; } catch { return []; }
  }).slice(0, 12);

  const provider = getTextProvider();
  let caption = "";
  let lastIssues: string[] = [];
  let usedSource: "ai" | "fallback-template" = "ai";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await provider.generateGoogleCaption({
        industry: input.industry,
        serviceType: input.serviceType,
        serviceArea: input.serviceArea,
        language: input.language,
        brandVoice: voice,
        templateExamples: templates.map(t => t.templateText.replace(/\{city\}/g, input.serviceArea ?? "your neighborhood")),
        avoidOpenings,
        avoidPhrases,
        customInstruction: attempt > 0
          ? `Previous attempt violated: ${lastIssues.join(", ")}. Fix those issues.`
          : input.customInstruction,
      });
      const policy = checkGooglePolicy(res.caption);
      if (policy.valid) {
        caption = res.caption;
        usedSource = res.source;
        break;
      }
      lastIssues = policy.issues;
    } catch (err) {
      console.error("[caption] provider error attempt=" + attempt, err);
      lastIssues = ["provider_error"];
      break;
    }
  }

  if (!caption) {
    // Fallback: 直接用模板
    const tmpl = templates[0]?.templateText ?? "Took care of a {serviceType} in {city} today.";
    caption = tmpl
      .replace(/\{city\}/g, input.serviceArea ?? "your neighborhood")
      .replace(/\{serviceType\}/g, input.serviceType);
    usedSource = "fallback-template";
  }

  // record history (best-effort)
  try {
    await recordCaptionHistory({
      userId: input.userId,
      googlePostId: input.googlePostId,
      captionText: caption,
      language: input.language,
      industry: input.industry,
      serviceType: input.serviceType,
    });
  } catch (err) {
    console.error("[caption] failed to record history", err);
  }

  const finalPolicy = checkGooglePolicy(caption);
  return {
    caption,
    source: usedSource,
    policy: finalPolicy,
    usedTemplateIds: templates.map(t => t.id),
  };
}
```

- [ ] **Step 2: 测试 generate（mock provider）**

`tests/lib/brago-caption-generate.test.ts`：测得到一个 stub provider 会跑通流程。注意 mock 链较长，可只写一个 happy path。

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/brago/brand-voice", () => ({
  getBrandVoice: vi.fn(async () => ({
    speaker: "local_owner", tone: ["friendly"], avoid: [], customerLanguage: "en",
    serviceAreas: [], verifiedClaims: {}, ctaStyle: "call_now_button",
  })),
}));
vi.mock("@/lib/brago/caption/history", () => ({
  recordCaptionHistory: vi.fn(async () => "h1"),
  getRecentHistory: vi.fn(async () => []),
}));
vi.mock("@/lib/brago/caption/text-provider", () => ({
  getTextProvider: () => ({
    name: "stub",
    generateGoogleCaption: vi.fn(async () => ({ caption: "Cleaned up a driveway in Austin today. Looking good.", language: "en", source: "ai" })),
  }),
  isAiTextAvailable: () => false,
}));

import { generateCaption } from "@/lib/brago/caption/generate";

describe("generateCaption", () => {
  it("returns a caption + policy", async () => {
    const out = await generateCaption({
      userId: "u1",
      industry: "pressure_washing",
      serviceType: "driveway",
      serviceArea: "Austin",
      language: "en",
    });
    expect(out.caption).toContain("driveway");
    expect(out.policy.valid).toBe(true);
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add lib/brago/caption/generate.ts tests/lib/brago-caption-generate.test.ts
git commit -m "feat(brago): generateCaption main entry"
```

---

## Task 6: `/api/brago/google-posts/[postId]/generate-caption`

**Files:**
- Create: `app/api/brago/google-posts/[postId]/generate-caption/route.ts`

- [ ] **Step 1:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import { generateCaption } from "@/lib/brago/caption/generate";
import { canUserAfford, deductCredits } from "@/lib/credits";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";

export const runtime = "nodejs";

const CAPTION_CREDIT_COST = Number(process.env.BRAGO_CAPTION_CREDIT_COST ?? "1");

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;

  const postRow = await db.select().from(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id))).limit(1);
  const post = postRow[0];
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const language: CaptionLanguage = body.language ?? post.language ?? "en";

  // 扣积分（仅在 AI 可用且 cost>0 时；fallback 模板不扣）
  const useAi = Boolean(process.env.VOLCANO_ENGINE_API_KEY);
  if (useAi && CAPTION_CREDIT_COST > 0) {
    if (!(await canUserAfford(access.user.id, CAPTION_CREDIT_COST))) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
  }

  const out = await generateCaption({
    userId: access.user.id,
    googlePostId: postId,
    industry: post.industry as Industry,
    serviceType: post.serviceType,
    serviceArea: post.serviceArea,
    language,
    customInstruction: body.customInstruction,
  });

  if (useAi && out.source === "ai" && CAPTION_CREDIT_COST > 0) {
    await deductCredits(access.user.id, CAPTION_CREDIT_COST, "brago_caption_ai");
  }

  await db.update(googlePost).set({
    caption: out.caption,
    language,
    captionPolicyJson: JSON.stringify(out.policy),
    status: "ready",
  }).where(eq(googlePost.id, postId));

  return NextResponse.json({
    caption: out.caption,
    source: out.source,
    policy: out.policy,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/generate-caption/route.ts"
git commit -m "feat(api): generate-caption (AI w/ credit, fallback free)"
```

---

## Task 7: `/api/brago/google-posts/[postId]/rewrite`

**Files:**
- Create: `app/api/brago/google-posts/[postId]/rewrite/route.ts`

- [ ] **Step 1:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import { generateCaption } from "@/lib/brago/caption/generate";
import { canUserAfford, deductCredits } from "@/lib/credits";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";

export const runtime = "nodejs";

const REWRITE_CREDIT_COST = Number(process.env.BRAGO_REWRITE_CREDIT_COST ?? "1");

const STYLE_TO_INSTRUCTION: Record<string, string> = {
  shorter: "Make it shorter and punchier (under 300 characters).",
  more_local: "Lean harder into the neighborhood / city specifics.",
  less_salesy: "Sound less salesy. Plain, neighborly.",
  rewrite: "Rewrite from scratch in a different angle.",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { postId } = await params;

  const postRow = await db.select().from(googlePost).where(and(eq(googlePost.id, postId), eq(googlePost.userId, access.user.id))).limit(1);
  const post = postRow[0];
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const language: CaptionLanguage = body.language ?? post.language ?? "en";
  const style = (body.style as string) || "rewrite";
  const instruction = STYLE_TO_INSTRUCTION[style] ?? STYLE_TO_INSTRUCTION.rewrite;

  const useAi = Boolean(process.env.VOLCANO_ENGINE_API_KEY);
  if (useAi && REWRITE_CREDIT_COST > 0) {
    if (!(await canUserAfford(access.user.id, REWRITE_CREDIT_COST))) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
  }

  const out = await generateCaption({
    userId: access.user.id,
    googlePostId: postId,
    industry: post.industry as Industry,
    serviceType: post.serviceType,
    serviceArea: post.serviceArea,
    language,
    customInstruction: instruction,
  });

  if (useAi && out.source === "ai" && REWRITE_CREDIT_COST > 0) {
    await deductCredits(access.user.id, REWRITE_CREDIT_COST, "brago_caption_rewrite");
  }

  await db.update(googlePost).set({
    caption: out.caption,
    language,
    captionPolicyJson: JSON.stringify(out.policy),
    status: "ready",
  }).where(eq(googlePost.id, postId));

  return NextResponse.json({ caption: out.caption, source: out.source, policy: out.policy });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/brago/google-posts/[postId]/rewrite/route.ts"
git commit -m "feat(api): rewrite caption"
```

---

## Task 8: 把 `/api/brago/free-generator` 换成 generate engine

**Files:**
- Modify: `app/api/brago/free-generator/route.ts`

- [ ] **Step 1: 改写为调用模板 + 简单 rate limit**

```ts
import { NextRequest, NextResponse } from "next/server";
import { findTemplates, currentSeasonFor } from "@/lib/brago/caption/templates";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const city = (form.get("city") as string | null)?.trim() || "your neighborhood";
  const serviceType = (form.get("serviceType") as string | null) || "driveway";

  const templates = findTemplates({
    industry: "pressure_washing",
    serviceType,
    season: currentSeasonFor(),
    limit: 1,
  });
  const tmpl = templates[0]?.templateText ?? "Took care of a {serviceType} in {city} today.";
  const caption = tmpl.replace(/\{city\}/g, city).replace(/\{serviceType\}/g, serviceType);
  const policy = checkGooglePolicy(caption);
  return NextResponse.json({
    caption,
    policy,
    source: "fallback-template",
  });
}
```

注：free 页不调 AI（避免被滥用）；P1 再加 captcha + AI。

- [ ] **Step 2: 跑测试**

之前 Phase 1 写的测试 `tests/api/brago-free-generator.test.ts` 仍要 pass。可能需要更新断言（caption 来自模板，更稳定）。

- [ ] **Step 3: Commit**

```bash
git add app/api/brago/free-generator/route.ts tests/api/brago-free-generator.test.ts
git commit -m "feat(api): free-generator uses template engine"
```

---

## Task 9: 输出页 UI — 接入 caption 生成与重写

**Files:**
- Modify: `app/[locale]/(protected)/google-posts/[postId]/page.tsx`

- [ ] **Step 1: 在 UI 加 caption 部分**

在现有 vision UI 下加：

```tsx
const [generating, setGenerating] = useState(false);
const [rewriteStyle, setRewriteStyle] = useState<string | null>(null);

const generateCaption = async (opts: { language?: "en" | "es"; style?: string } = {}) => {
  setGenerating(true);
  try {
    const res = await fetch(`/api/brago/google-posts/${postId}/generate-caption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: opts.language ?? post?.language, customInstruction: opts.style }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Caption failed");
    await refetch();
  } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  finally { setGenerating(false); }
};

const rewrite = async (style: string) => {
  setRewriteStyle(style);
  try {
    const res = await fetch(`/api/brago/google-posts/${postId}/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Rewrite failed");
    await refetch();
  } finally { setRewriteStyle(null); }
};

const copyCaption = () => {
  if (post?.caption) navigator.clipboard.writeText(post.caption);
};
```

JSX 部分（caption section）：

```tsx
<section className="mt-6 rounded-xl border p-4">
  <h2 className="text-sm font-medium mb-2">Caption</h2>
  {post.caption ? (
    <>
      <p className="whitespace-pre-wrap text-sm mb-2">{post.caption}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={copyCaption} className="rounded-md bg-foreground text-background px-3 py-1.5 text-xs">Copy Google post</button>
        <button onClick={() => rewrite("rewrite")} disabled={!!rewriteStyle} className="rounded-md border px-3 py-1.5 text-xs">Rewrite</button>
        <button onClick={() => rewrite("shorter")} disabled={!!rewriteStyle} className="rounded-md border px-3 py-1.5 text-xs">Shorter</button>
        <button onClick={() => rewrite("more_local")} disabled={!!rewriteStyle} className="rounded-md border px-3 py-1.5 text-xs">More local</button>
        <button onClick={() => rewrite("less_salesy")} disabled={!!rewriteStyle} className="rounded-md border px-3 py-1.5 text-xs">Less salesy</button>
        <button onClick={() => generateCaption({ language: post.language === "en" ? "es" : "en" })} disabled={generating} className="rounded-md border px-3 py-1.5 text-xs">
          {post.language === "en" ? "Switch to Spanish" : "Switch to English"}
        </button>
      </div>
    </>
  ) : (
    <button onClick={() => generateCaption()} disabled={generating} className="rounded-md bg-foreground text-background px-3 py-2 text-sm disabled:opacity-50">
      {generating ? "Writing…" : "Write Google caption"}
    </button>
  )}
</section>
```

- [ ] **Step 2: lint**

```bash
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(protected)/google-posts/[postId]/page.tsx"
git commit -m "feat(output): caption generation + rewrite UI"
```

---

## Task 10: Phase 5 收尾

- [ ] **Step 1: 完整跑通**

```bash
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 2: launch-checklist**

追加：caption credit cost env (`BRAGO_CAPTION_CREDIT_COST`, `BRAGO_REWRITE_CREDIT_COST`) 默认 1，可调；free-generator P1 加 captcha。

- [ ] **Step 3: Commit**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): mark Phase 5 (caption engine) complete" --allow-empty
```

## Definition of Done

- 50 个模板全部通过 policy check（测试断言）。
- `/api/brago/google-posts/[postId]/generate-caption` 出 caption；AI 用时扣 1 积分，fallback 不扣。
- `/api/brago/google-posts/[postId]/rewrite` 支持 shorter/more_local/less_salesy/rewrite。
- 输出页 UI 可显示 caption、Copy、Rewrite、语言切换。
- `caption_history` 表自动写入，下一次同 service type 生成时会注入 avoidOpenings。
- `pnpm lint && pnpm test && pnpm build` 全绿。
