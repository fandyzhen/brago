# Brago Test Validation & Fix — Design Spec

Date: 2026-05-22
Status: Approved

## Context

Brago is built on Sistine Starter. During initial brand migration we changed:
- App name: Sistine AI → Brago
- Docs name: Sistine Docs → Brago Docs
- Hero component: removed course-community modal, rewrote for Brago copy
- Billing plans: display families renamed from `starter`/`pro` → `pro`/`crew`; prices $29/$99 → $9.90/$19; credits 1000/10000 → 100/300
- Navigation: removed Demo, added Industries + Templates
- Translation keys: added `hero.supporting`, nav keys for industries/templates

The existing test suite was written against Sistine Starter and now has 9 failing tests across 5 files plus 1 lint warning.

## Goal

Bring all 65 tests green and eliminate the lint warning, making the test suite accurately reflect Brago's current behavior.

## What Is NOT Changing

- Internal `PlanKey` values (`starter_monthly`, `starter_yearly`, `pro_monthly`, `pro_yearly`) — these are identifiers, unchanged
- `pack_200` one-time pack — price and Creem ID unchanged
- Database schema, auth, payments infrastructure — untouched
- All currently-passing tests (56 tests)

## Fixes

### 1. `tests/components/hero.test.tsx`

**Problem:** Tests for Sistine course-community modal (`"Get Code"` button, dialog with `aria-labelledby`, external course link). The new Brago Hero has no modal.

**Fix:** Replace test with Brago Hero assertions:
- Badge renders `"Before/after posts in 60 seconds"`
- H1 renders `"Let your work brag."`
- Primary CTA link points to `/dashboard` with text `"Create Your First Post"`
- Secondary CTA link points to `/industries` with text `"See examples"`
- Channel chips render: `"Google Business Profile"`, `"Facebook"`, `"Nextdoor"`, `"Instagram"`

### 2. `tests/lib/billing-display.test.ts`

**Problem:** `MARKETING_SUBSCRIPTION_PLAN_FAMILIES` and `getSubscriptionPlanDisplays()` still expect Sistine values.

**Fix:** Update expected values to Brago billing config:

| Field | Old | New |
|---|---|---|
| Family IDs | `starter`, `pro` | `pro`, `crew` |
| starter_monthly priceCents | 2900 | 990 |
| starter_monthly creditsPerCycle | 1000 | 100 |
| starter_yearly priceCents | 29000 | 9900 |
| starter_yearly creditsPerGrant | 1000 | 100 |
| pro_monthly priceCents | 9900 | 1900 |
| pro_monthly creditsPerCycle | 10000 | 300 |
| pro_yearly priceCents | 99000 | 19000 |
| pro_yearly creditsPerGrant | 10000 | 300 |
| creemPriceId (all plans) | old prod IDs | `undefined` |
| displayMonthlyPrice | $29, $99 | $9.90, $19 |
| displayYearlyPrice | $290, $990 | $99, $190 |
| displayMonthlyCredits | 1,000 / 10,000 | 100 / 300 |
| displayYearlyCredits | 12,000 / 120,000 | 1,200 / 3,600 |
| displayYearlyCreditsPerGrant | 1,000 / 10,000 | 100 / 300 |

### 3. `tests/components/pricing-marketing.test.tsx`

**Problem:** Asserts plan headings `"Starter"`, `"Pro"` and prices `"$29"`, `"$99"`.

**Fix:** Update to Brago plan display names and prices:
- Plan headings: `"Pro"`, `"Crew"`, `"Post Pack"`
- Prices: `"$9.90"`, `"$19"`, `"$5"`
- Credits column: `"100 / month"`, `"300 / month"`, `"200 once"`
- Column headers in comparison table: `"Pro"`, `"Crew"`, `"Post Pack"`

### 4. `tests/lib/docs-metadata.test.ts`

**Problem:** Hardcoded `"Sistine Docs"` in 2 assertions.

**Fix:** Replace all occurrences of `"Sistine Docs"` with `"Brago Docs"`.

### 5. `tests/lib/docs-content.test.ts` (pre-existing, 2 tests)

**Problem A — "ships localized docs landing pages":** Test expects `[Quickstart](./quickstart)` in `content/docs/index.mdx` but it's not there.

**Fix A:** Add `[Quickstart](./quickstart)` link to `content/docs/index.mdx` in the Getting Started or navigation section. Mirror the same link in `index.zh.mdx` as `[快速开始](./quickstart)`.

**Problem B — "uses locale-safe relative links":** Test asserts no MDX file contains absolute `/docs/` paths. Need to verify and fix any occurrences.

**Fix B:** Scan all MDX files for `/docs/` absolute paths and replace with relative equivalents (e.g., `/docs/quickstart` → `./quickstart`).

### 6. `app/[locale]/(marketing)/industries/page.tsx` (lint warning)

**Problem:** `props` parameter declared but never used in `generateMetadata`.

**Fix:** Remove the unused `props` parameter from the function signature.

## Success Criteria

- `pnpm test` → 0 failed, 65 passed (or higher if new tests added)
- `pnpm lint` → 0 errors, 0 warnings
- `pnpm build` → no TypeScript errors
- No currently-passing tests are broken
