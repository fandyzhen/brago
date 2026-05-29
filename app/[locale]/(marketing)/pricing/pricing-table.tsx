"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BRAGO_LOCAL_DISPLAY } from "@/constants/billing";

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function PricingTable() {
  const t = useTranslations("pricing");
  const promoPrice = formatUsd(BRAGO_LOCAL_DISPLAY.promoPriceCents);
  const annualPrice = formatUsd(BRAGO_LOCAL_DISPLAY.annual.priceCents);

  const tiers = [
    { id: "free", name: t("free.name") },
    { id: "local", name: t("local.name") },
  ];

  const rows: Array<{ title: string; values: Record<string, string> }> = [
    {
      title: "Price",
      values: {
        free: "$0",
        local: `${promoPrice}/mo or ${annualPrice}/yr`,
      },
    },
    {
      title: "Google posts per month",
      values: {
        free: "3 total",
        local: "30 per month",
      },
    },
    {
      title: "Best after shot",
      values: { free: "Yes", local: "Yes" },
    },
    {
      title: "Google-safe captions",
      values: { free: "Yes", local: "Yes" },
    },
    {
      title: "English / Spanish output",
      values: { free: "Yes", local: "Yes" },
    },
    {
      title: "History-aware wording",
      values: { free: "—", local: "Yes" },
    },
    {
      title: "Weekly Google reminders",
      values: { free: "—", local: "Yes" },
    },
    {
      title: "Brago watermark on exports",
      values: { free: "—", local: "Removed" },
    },
  ];

  return (
    <div className="relative z-20 mx-auto w-full px-4 py-24">
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="max-w-xs py-3.5 pl-4 pr-3 text-left text-3xl font-extrabold text-foreground sm:pl-0" />
                  {tiers.map((tier) => (
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-center text-lg font-semibold text-foreground"
                      key={tier.id}
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.title}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-0">
                      {row.title}
                    </td>
                    {tiers.map((tier) => (
                      <td
                        key={`${row.title}-${tier.id}`}
                        className="whitespace-nowrap px-3 py-4 text-center text-sm text-muted-foreground"
                      >
                        {row.values[tier.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
