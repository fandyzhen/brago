import {
  DEFAULT_ONE_TIME_PACK_KEY,
  getDefaultOneTimePack,
  getSubscriptionPlanDisplays,
  MARKETING_SUBSCRIPTION_PLAN_FAMILIES,
} from "@/lib/billing-display";

describe("getDefaultOneTimePack", () => {
  it("returns the configured default pack key", () => {
    expect(DEFAULT_ONE_TIME_PACK_KEY).toBe("pack_200");
  });

  it("returns the pack values from billing config", () => {
    expect(getDefaultOneTimePack()).toEqual({
      key: "pack_200",
      pack: {
        key: "pack_200",
        kind: "one_time",
        priceCents: 500,
        currency: "usd",
        credits: 200,
        creemPriceId: "prod_3SiroZeMbMQidMVFDMUzKy",
      },
      displayCredits: "200",
      displayPrice: "$5",
    });
  });
});

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
