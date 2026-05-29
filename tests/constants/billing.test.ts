import {
  BRAGO_LOCAL_DISPLAY,
  PRIMARY_ANNUAL_KEY,
  PRIMARY_SUBSCRIPTION_KEY,
  isPackKey,
  isSubscriptionKey,
  oneTimePacks,
  subscriptionPlans,
} from "@/constants/billing";

describe("billing config", () => {
  it("exposes supported subscription keys", () => {
    expect(isSubscriptionKey("starter_monthly")).toBe(true);
    expect(isSubscriptionKey("starter_yearly")).toBe(true);
    expect(isSubscriptionKey("brago_local_monthly")).toBe(true);
    expect(isSubscriptionKey("brago_local_yearly")).toBe(true);
    expect(isSubscriptionKey("pack_200")).toBe(false);
  });

  it("Brago Local plans match the spec ($19 promo / 30 posts / annual installments)", () => {
    const monthly = subscriptionPlans.brago_local_monthly;
    expect(monthly.priceCents).toBe(1900);
    expect(monthly.creditsPerCycle).toBe(30);
    expect(monthly.cycle).toBe("month");

    const yearly = subscriptionPlans.brago_local_yearly;
    expect(yearly.priceCents).toBe(19000);
    expect(yearly.creditsPerCycle).toBe(360);
    expect(yearly.grantSchedule?.mode).toBe("installments");

    expect(BRAGO_LOCAL_DISPLAY.promoPriceCents).toBe(1900);
    expect(BRAGO_LOCAL_DISPLAY.normalPriceCents).toBe(3900);

    expect(PRIMARY_SUBSCRIPTION_KEY).toBe("brago_local_monthly");
    expect(PRIMARY_ANNUAL_KEY).toBe("brago_local_yearly");
  });

  it("exposes supported one-time pack keys", () => {
    expect(isPackKey("pack_200")).toBe(true);
    expect(isPackKey("pro_monthly")).toBe(false);
  });

  it("keeps yearly installment credits aligned with cycle totals", () => {
    const yearlyPlans = Object.values(subscriptionPlans).filter(
      (plan) => plan.grantSchedule?.mode === "installments"
    );

    expect(yearlyPlans.length).toBeGreaterThan(0);

    for (const plan of yearlyPlans) {
      if (plan.grantSchedule?.mode !== "installments") {
        continue;
      }

      expect(plan.grantSchedule.creditsPerGrant).toBeDefined();
      expect(plan.grantSchedule.creditsPerGrant! * plan.grantSchedule.grantsPerCycle).toBe(
        plan.creditsPerCycle
      );
    }
  });

  it("keeps one-time packs positive and purchasable", () => {
    for (const pack of Object.values(oneTimePacks)) {
      expect(pack.credits).toBeGreaterThan(0);
      expect(pack.priceCents).toBeGreaterThan(0);
      expect(pack.creemPriceId).toBeTruthy();
    }
  });
});
