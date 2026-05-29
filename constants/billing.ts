export type BillingKind = "subscription" | "one_time";

export type PlanKey =
  | "brago_local_monthly"
  | "brago_local_yearly"
  // 兼容历史 key（保留以便存量订阅 webhook 仍能匹配）
  | "starter_monthly"
  | "starter_yearly"
  | "pro_monthly"
  | "pro_yearly";

export type PackKey = "pack_200";

export type GrantScheduleConfig =
  | {
      mode: "per_cycle";
    }
  | {
      mode: "installments";
      grantsPerCycle: number;
      intervalMonths: number;
      creditsPerGrant?: number;
      initialGrants?: number;
    };

type SubscriptionPlan = {
  key: PlanKey;
  kind: "subscription";
  priceCents: number;
  currency: "usd";
  creditsPerCycle: number;
  cycle: "month" | "year";
  // To be filled when Creem IDs are available
  creemPriceId?: string;
  grantSchedule?: GrantScheduleConfig;
};

type OneTimePack = {
  key: PackKey;
  kind: "one_time";
  priceCents: number;
  currency: "usd";
  credits: number;
  creemPriceId?: string;
};

export const subscriptionPlans: Record<PlanKey, SubscriptionPlan> = {
  // Brago Local monthly — $19/mo promo (normally $39), 30 Google-ready posts
  brago_local_monthly: {
    key: "brago_local_monthly",
    kind: "subscription",
    priceCents: 1900,
    currency: "usd",
    creditsPerCycle: 30,
    cycle: "month",
    creemPriceId: undefined, // TODO: fill from Creem dashboard
    grantSchedule: { mode: "per_cycle" },
  },
  // Brago Local yearly — $190/yr, 360 posts spread monthly (30 / month)
  brago_local_yearly: {
    key: "brago_local_yearly",
    kind: "subscription",
    priceCents: 19000,
    currency: "usd",
    creditsPerCycle: 360,
    cycle: "year",
    creemPriceId: undefined, // TODO: fill from Creem dashboard
    grantSchedule: {
      mode: "installments",
      grantsPerCycle: 12,
      intervalMonths: 1,
      creditsPerGrant: 30,
      initialGrants: 1,
    },
  },
  // Pro plan — $9.90/mo, 100 posts
  starter_monthly: {
    key: "starter_monthly",
    kind: "subscription",
    priceCents: 990,
    currency: "usd",
    creditsPerCycle: 100,
    cycle: "month",
    creemPriceId: undefined, // TODO: set Brago Creem product ID
    grantSchedule: { mode: "per_cycle" },
  },
  // Pro yearly — $99/yr, 1200 posts (100/mo)
  starter_yearly: {
    key: "starter_yearly",
    kind: "subscription",
    priceCents: 9900,
    currency: "usd",
    creditsPerCycle: 1200,
    cycle: "year",
    creemPriceId: undefined, // TODO: set Brago Creem product ID
    grantSchedule: {
      mode: "installments",
      grantsPerCycle: 12,
      intervalMonths: 1,
      creditsPerGrant: 100,
      initialGrants: 1,
    },
  },
  // Crew plan — $19/mo, 300 posts
  pro_monthly: {
    key: "pro_monthly",
    kind: "subscription",
    priceCents: 1900,
    currency: "usd",
    creditsPerCycle: 300,
    cycle: "month",
    creemPriceId: undefined, // TODO: set Brago Creem product ID
    grantSchedule: { mode: "per_cycle" },
  },
  // Crew yearly — $190/yr, 3600 posts (300/mo)
  pro_yearly: {
    key: "pro_yearly",
    kind: "subscription",
    priceCents: 19000,
    currency: "usd",
    creditsPerCycle: 3600,
    cycle: "year",
    creemPriceId: undefined, // TODO: set Brago Creem product ID
    grantSchedule: {
      mode: "installments",
      grantsPerCycle: 12,
      intervalMonths: 1,
      creditsPerGrant: 300,
      initialGrants: 1,
    },
  },
};

export const oneTimePacks: Record<PackKey, OneTimePack> = {
  pack_200: {
    key: "pack_200",
    kind: "one_time",
    priceCents: 500,
    currency: "usd",
    credits: 200,
    creemPriceId: "prod_3SiroZeMbMQidMVFDMUzKy",
  },
};

export function isSubscriptionKey(key: string): key is PlanKey {
  return (key as PlanKey) in subscriptionPlans;
}

export function isPackKey(key: string): key is PackKey {
  return (key as PackKey) in oneTimePacks;
}

// Brago Local marketing display constants (used by pricing page + checkout buttons)
export const BRAGO_LOCAL_DISPLAY = {
  promoPriceCents: 1900,
  normalPriceCents: 3900,
  monthlyCreditsLabel: "30 Google-ready posts / month",
  promoBadge: "Launch price for early customers",
  annual: {
    priceCents: 19000,
    altPriceCents: 19900,
  },
} as const;

// 公开端展示用的主推订阅 key（控制 pricing 页和 dashboard 升级 CTA 指向哪一档）
export const PRIMARY_SUBSCRIPTION_KEY: PlanKey = "brago_local_monthly";
export const PRIMARY_ANNUAL_KEY: PlanKey = "brago_local_yearly";
