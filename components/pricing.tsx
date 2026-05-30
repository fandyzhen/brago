"use client";

import { IconCircleCheckFilled } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { useSession } from "@/lib/auth-client";
import {
  BRAGO_LOCAL_DISPLAY,
  PRIMARY_ANNUAL_KEY,
  PRIMARY_SUBSCRIPTION_KEY,
} from "@/constants/billing";

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function Pricing() {
  const session = useSession();
  const router = useRouter();
  const t = useTranslations("pricing");
  const locale = useLocale();
  const userId = session.data?.user?.id;

  const startCheckout = useCallback(
    async (key: string) => {
      if (!userId) {
        router.push(`/${locale}/signup`);
        return;
      }
      const res = await fetch("/api/payments/creem/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, kind: "subscription" }),
      });
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    },
    [locale, router, userId],
  );

  const startFree = useCallback(() => {
    if (userId) router.push(`/${locale}/dashboard`);
    else router.push(`/${locale}/signup`);
  }, [locale, router, userId]);

  const promoPrice = formatUsd(BRAGO_LOCAL_DISPLAY.promoPriceCents);
  const normalPrice = formatUsd(BRAGO_LOCAL_DISPLAY.normalPriceCents);
  const annualPrice = formatUsd(BRAGO_LOCAL_DISPLAY.annual.priceCents);

  return (
    <div className="relative w-full">
      <div className="relative z-20 mx-auto mt-4 grid grid-cols-1 items-stretch gap-6 md:mt-12 md:grid-cols-2 max-w-3xl">
        {/* Free tier */}
        <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card px-6 py-8">
          <div>
            <h3 className="font-display text-base font-bold leading-7 text-foreground">{t("free.name")}</h3>
            <p className="mt-4">
              <motion.span
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="inline-block font-display text-4xl font-extrabold tracking-tight text-foreground"
              >
                {t("free.price")}
              </motion.span>
            </p>
            <p className="mt-3 text-sm font-medium text-muted-foreground">{t("free.tagline")}</p>
            <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
              {["feature_posts", "feature_after_shot", "feature_caption", "feature_languages", "feature_no_card"].map((k) => (
                <li key={k} className="flex gap-x-3">
                  <IconCircleCheckFilled className="h-6 w-5 flex-none text-muted-foreground" aria-hidden="true" />
                  {t(`free.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <Button
            onClick={startFree}
            className="mt-8 block w-full rounded-full px-3.5 py-2.5 text-center text-sm font-semibold"
          >
            {t("free.cta")}
          </Button>
        </div>

        {/* Brago Local */}
        <div className="relative flex h-full flex-col justify-between rounded-2xl bg-primary px-6 py-8 shadow-2xl">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-brand-foreground shadow-sm">
            {t("local.badge")}
          </span>
          <div>
            <h3 className="font-display text-base font-bold leading-7 text-primary-foreground">{t("local.name")}</h3>
            <p className="mt-4 flex items-baseline gap-2">
              <motion.span
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="inline-block font-display text-4xl font-extrabold tracking-tight text-primary-foreground"
              >
                {promoPrice}<span className="text-base font-medium">/mo</span>
              </motion.span>
              <span className="text-sm text-primary-foreground/70 line-through">{normalPrice}/mo</span>
            </p>
            <p className="mt-2 text-xs text-primary-foreground/70">{t("local.annual_label")} ({annualPrice}/yr)</p>
            <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-primary-foreground/80">
              {[
                "feature_posts",
                "feature_after_shot",
                "feature_caption",
                "feature_languages",
                "feature_history",
                "feature_reminder",
                "feature_no_watermark",
              ].map((k) => (
                <li key={k} className="flex gap-x-3">
                  <IconCircleCheckFilled className="h-6 w-5 flex-none text-primary-foreground" aria-hidden="true" />
                  {t(`local.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 grid gap-2">
            <Button
              variant="accent"
              onClick={() => startCheckout(PRIMARY_SUBSCRIPTION_KEY)}
              className="block w-full rounded-full text-sm"
            >
              {t("local.cta")} — {promoPrice}/mo
            </Button>
            <button
              onClick={() => startCheckout(PRIMARY_ANNUAL_KEY)}
              className="block w-full text-center text-xs text-primary-foreground/70 underline hover:text-primary-foreground"
            >
              Pay yearly ({annualPrice}/yr)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
