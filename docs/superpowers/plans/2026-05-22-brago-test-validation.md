# Brago Test Validation & Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 65 tests green and eliminate the 1 lint warning, making the test suite accurately reflect Brago's current behavior.

**Architecture:** Update 5 test files + 1 source file (billing-display.ts price formatter) + 2 MDX content files + 1 page component lint fix. No new abstractions; all changes are corrections to existing files.

**Tech Stack:** Vitest 4, Testing Library, TypeScript, next-intl mocks, MDX

---

## File Map

| File | Action | Why |
|---|---|---|
| `lib/billing-display.ts` | Modify | `formatUsdPrice` rounds 990¢ to $10; must show $9.90 |
| `tests/lib/billing-display.test.ts` | Modify | Expected values use old Sistine plan IDs/prices/credits |
| `tests/components/pricing-marketing.test.tsx` | Modify | Asserts old plan names "Starter"/"Pro" and prices $29/$99 |
| `tests/components/hero.test.tsx` | Rewrite | Tests Sistine course-community modal that no longer exists |
| `tests/lib/docs-metadata.test.ts` | Modify | Hardcoded "Sistine Docs" → "Brago Docs" |
| `content/docs/index.mdx` | Modify | Absolute `/docs/quickstart` → relative `./quickstart` |
| `content/docs/index.zh.mdx` | Modify | Absolute `/zh/docs/quickstart` → relative `./quickstart` |
| `app/[locale]/(marketing)/industries/page.tsx` | Modify | Remove unused `props` param (lint warning) |

---

## Task 1: Fix `formatUsdPrice` to handle decimal amounts

**Files:**
- Modify: `lib/billing-display.ts:24-26`

- [ ] **Step 1: Run current test to see the price mismatch**

```bash
cd /Volumes/FZD/开发项目/Brago && pnpm test tests/lib/billing-display.test.ts 2>&1 | grep -A3 "displayMonthlyPrice"
```

Expected: test fails, showing `$10` received instead of `$9.90`

- [ ] **Step 2: Fix the formatter**

In `lib/billing-display.ts`, replace lines 24-26:

```typescript
function formatUsdPrice(priceCents: number) {
  const dollars = priceCents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}
```

- [ ] **Step 3: Verify no other tests broke**

```bash
pnpm test tests/lib/billing-display.test.ts 2>&1 | tail -5
```

Expected: still 2 failing (on plan ID/values, not formatter — that's Task 2)

---

## Task 2: Update billing-display tests to Brago values

**Files:**
- Modify: `tests/lib/billing-display.test.ts`

- [ ] **Step 1: Replace the full `getSubscriptionPlanDisplays` test block**

Replace the entire contents of `tests/lib/billing-display.test.ts` `describe("getSubscriptionPlanDisplays"` block with:

```typescript
describe("getSubscriptionPlanDisplays", () => {
  it("only exposes subscription families that exist in billing config", () => {
    expect(MARKETING_SUBSCRIPTION_PLAN_FAMILIES).toEqual([
      {
        id: "pro",
        monthlyKey: "starter_monthly",
        yearlyKey: "starter_yearly",
        featured: false,
      },
      {
        id: "crew",
        monthlyKey: "pro_monthly",
        yearlyKey: "pro_yearly",
        featured: true,
      },
    ]);
  });

  it("derives marketing prices and credits from the real billing plans", () => {
    expect(getSubscriptionPlanDisplays()).toEqual([
      {
        id: "pro",
        monthlyKey: "starter_monthly",
        yearlyKey: "starter_yearly",
        featured: false,
        monthlyPlan: {
          key: "starter_monthly",
          kind: "subscription",
          priceCents: 990,
          currency: "usd",
          creditsPerCycle: 100,
          cycle: "month",
          creemPriceId: undefined,
          grantSchedule: { mode: "per_cycle" },
        },
        yearlyPlan: {
          key: "starter_yearly",
          kind: "subscription",
          priceCents: 9900,
          currency: "usd",
          creditsPerCycle: 1200,
          cycle: "year",
          creemPriceId: undefined,
          grantSchedule: {
            mode: "installments",
            grantsPerCycle: 12,
            intervalMonths: 1,
            creditsPerGrant: 100,
            initialGrants: 1,
          },
        },
        displayMonthlyPrice: "$9.90",
        displayYearlyPrice: "$99",
        displayMonthlyCredits: "100",
        displayYearlyCredits: "1,200",
        displayYearlyCreditsPerGrant: "100",
      },
      {
        id: "crew",
        monthlyKey: "pro_monthly",
        yearlyKey: "pro_yearly",
        featured: true,
        monthlyPlan: {
          key: "pro_monthly",
          kind: "subscription",
          priceCents: 1900,
          currency: "usd",
          creditsPerCycle: 300,
          cycle: "month",
          creemPriceId: undefined,
          grantSchedule: { mode: "per_cycle" },
        },
        yearlyPlan: {
          key: "pro_yearly",
          kind: "subscription",
          priceCents: 19000,
          currency: "usd",
          creditsPerCycle: 3600,
          cycle: "year",
          creemPriceId: undefined,
          grantSchedule: {
            mode: "installments",
            grantsPerCycle: 12,
            intervalMonths: 1,
            creditsPerGrant: 300,
            initialGrants: 1,
          },
        },
        displayMonthlyPrice: "$19",
        displayYearlyPrice: "$190",
        displayMonthlyCredits: "300",
        displayYearlyCredits: "3,600",
        displayYearlyCreditsPerGrant: "300",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify these 2 tests pass**

```bash
pnpm test tests/lib/billing-display.test.ts 2>&1 | tail -5
```

Expected: `Test Files 1 passed | Tests 4 passed`

---

## Task 3: Update pricing-marketing tests to Brago plan names & prices

**Files:**
- Modify: `tests/components/pricing-marketing.test.tsx:78-103`

- [ ] **Step 1: Replace the two `it(...)` blocks inside `describe("marketing pricing")`**

```typescript
describe("marketing pricing", () => {
  it("renders only the configured plans on the pricing cards", () => {
    render(<Pricing />);

    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Crew" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Post Pack" })).toBeInTheDocument();
    expect(screen.getByText("$9.90")).toBeInTheDocument();
    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("Enterprise")).not.toBeInTheDocument();
    expect(screen.queryByText("Starter")).not.toBeInTheDocument();
  });

  it("keeps the comparison table aligned with the real billing catalog", () => {
    render(<PricingTable />);

    expect(screen.getByRole("columnheader", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Crew" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Post Pack" })).toBeInTheDocument();
    expect(screen.getByText("100 / month")).toBeInTheDocument();
    expect(screen.getByText("300 / month")).toBeInTheDocument();
    expect(screen.getByText("200 once")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Free" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Enterprise" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify these 2 tests pass**

```bash
pnpm test tests/components/pricing-marketing.test.tsx 2>&1 | tail -5
```

Expected: `Test Files 1 passed | Tests 2 passed`

---

## Task 4: Rewrite hero test for Brago Hero

**Files:**
- Modify: `tests/components/hero.test.tsx`

The new Hero has no modal. It renders: badge, H1, primary CTA link (`/en/dashboard`), secondary CTA link (`/en/industries`), and four channel chips. `LocaleLink` prepends locale (`useLocale` → "en") so `/dashboard` becomes `/en/dashboard`.

- [ ] **Step 1: Replace the single `it(...)` block inside `describe("Hero")`**

```typescript
describe("Hero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Brago hero badge, heading, and channel chips", () => {
    render(<Hero />);

    expect(
      screen.getByText("⚡ Before/after posts in 60 seconds")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 1, name: "Let your work brag." })
    ).toBeInTheDocument();

    expect(screen.getByText("Google Business Profile")).toBeInTheDocument();
    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.getByText("Nextdoor")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
  });

  it("primary CTA links to /en/dashboard and secondary CTA links to /en/industries", () => {
    render(<Hero />);

    const primaryCta = screen.getByRole("link", { name: "Create Your First Post" });
    expect(primaryCta).toHaveAttribute("href", "/en/dashboard");

    const secondaryCta = screen.getByRole("link", { name: /See examples/i });
    expect(secondaryCta).toHaveAttribute("href", "/en/industries");
  });

  it("does not render a course-community modal", () => {
    render(<Hero />);

    expect(
      screen.queryByRole("dialog")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Get Code" })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify all 3 hero tests pass**

```bash
pnpm test tests/components/hero.test.tsx 2>&1 | tail -5
```

Expected: `Test Files 1 passed | Tests 3 passed`

---

## Task 5: Update docs-metadata tests to "Brago Docs"

**Files:**
- Modify: `tests/lib/docs-metadata.test.ts`

- [ ] **Step 1: Replace all `"Sistine Docs"` occurrences**

In `tests/lib/docs-metadata.test.ts`, replace every occurrence of `"Sistine Docs"` with `"Brago Docs"`. Specifically update:

- Line 13: `"Quickstart documentation from Sistine Docs."` → `"Quickstart documentation from Brago Docs."`
- Line 16: `"快速开始 的使用文档，来自 Sistine Docs。"` → `"快速开始 的使用文档，来自 Brago Docs。"`
- Line 27: `"快速开始 | Sistine Docs"` → `"快速开始 | Brago Docs"`
- Line 28: `"快速开始 的使用文档，来自 Sistine Docs。"` → `"快速开始 的使用文档，来自 Brago Docs。"`
- Line 35: `title: "快速开始 | Sistine Docs"` → `title: "快速开始 | Brago Docs"`

- [ ] **Step 2: Run to verify these tests pass**

```bash
pnpm test tests/lib/docs-metadata.test.ts 2>&1 | tail -5
```

Expected: `Test Files 1 passed | Tests 3 passed`

---

## Task 6: Fix MDX absolute links (docs-content tests)

**Files:**
- Modify: `content/docs/index.mdx:35`
- Modify: `content/docs/index.zh.mdx:35`

The docs-content tests check two things:
1. `index.mdx` contains `[Quickstart](./quickstart)` — currently has `/docs/quickstart` (absolute)
2. No MDX file contains `/docs/` absolute paths — same line is the only violator

Fixing the links in both index files resolves both test failures at once.

- [ ] **Step 1: Fix English index**

In `content/docs/index.mdx` line 35, change:
```
Head to the [Quickstart](/docs/quickstart) guide to get your project running in minutes.
```
to:
```
Head to the [Quickstart](./quickstart) guide to get your project running in minutes.
```

- [ ] **Step 2: Fix Chinese index**

In `content/docs/index.zh.mdx` line 35, change:
```
前往[快速开始](/zh/docs/quickstart)指南，几分钟内启动你的项目。
```
to:
```
前往[快速开始](./quickstart)指南，几分钟内启动你的项目。
```

- [ ] **Step 3: Run to verify both docs-content tests pass**

```bash
pnpm test tests/lib/docs-content.test.ts 2>&1 | tail -5
```

Expected: `Test Files 1 passed | Tests 4 passed`

---

## Task 7: Fix lint warning in industries/page.tsx

**Files:**
- Modify: `app/[locale]/(marketing)/industries/page.tsx`

- [ ] **Step 1: Remove unused `props` parameter from `generateMetadata`**

Change:
```typescript
export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
```
to:
```typescript
export async function generateMetadata(): Promise<Metadata> {
```

Also remove the unused `Locale` import if it becomes the only usage. Check the import line at the top of the file.

- [ ] **Step 2: Run lint to verify 0 warnings**

```bash
pnpm lint 2>&1 | tail -5
```

Expected: no output (or `✓ No ESLint warnings or errors`)

---

## Task 8: Full verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test 2>&1 | tail -8
```

Expected:
```
Test Files  5 passed (23)
      Tests 65 passed (65)
```
(or more, if Task 4 added tests)

- [ ] **Step 2: Run lint**

```bash
pnpm lint 2>&1
```

Expected: `✖ 0 problems`

- [ ] **Step 3: Type-check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: update tests and docs to match Brago brand migration

- Rewrite hero test: remove Sistine modal assertions, add Brago Hero tests
- Update billing-display tests: pro/crew families, new prices and credits
- Update pricing-marketing tests: Pro/Crew/Post Pack names and $9.90/$19 prices
- Fix formatUsdPrice to show decimals for non-round amounts (990¢ → \$9.90)
- Update docs-metadata tests: Sistine Docs → Brago Docs
- Fix MDX absolute links to relative in index.mdx and index.zh.mdx
- Remove unused props param in industries/page.tsx (lint warning)"
```
