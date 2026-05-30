"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/button";

const SERVICE_TYPES = [
  { value: "driveway", label: "Driveway cleaning" },
  { value: "patio", label: "Patio cleaning" },
  { value: "siding", label: "House wash / siding" },
  { value: "walkway", label: "Walkway cleaning" },
  { value: "deck", label: "Deck wash" },
];

export type BrandInput = {
  serviceType: string;
  city: string;
  brandName: string;
  phone?: string;
};

export function BrandStep(props: {
  initial: Partial<BrandInput>;
  onSubmit: (b: BrandInput) => void;
  onBack: () => void;
}) {
  const t = useTranslations("freeTrial.steps.brand");
  const [serviceType, setServiceType] = useState(props.initial.serviceType ?? "driveway");
  const [city, setCity] = useState(props.initial.city ?? "");
  const [brandName, setBrandName] = useState(props.initial.brandName ?? "");
  const [phone, setPhone] = useState(props.initial.phone ?? "");

  const canNext = city.trim().length > 0 && brandName.trim().length > 0;

  return (
    <section className="grid gap-5">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("serviceTypeLabel")}</span>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-3"
        >
          {SERVICE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("cityLabel")}</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("cityPlaceholder")}
          className="rounded-xl border border-border bg-background px-4 py-3"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("brandNameLabel")}</span>
        <input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder={t("brandNamePlaceholder")}
          className="rounded-xl border border-border bg-background px-4 py-3"
        />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("phoneLabel")}</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          className="rounded-xl border border-border bg-background px-4 py-3"
        />
      </label>

      <div className="flex justify-between gap-3">
        <button type="button" onClick={props.onBack} className="text-sm text-muted-foreground underline">Back</button>
        <Button
          variant="accent"
          disabled={!canNext}
          onClick={() => props.onSubmit({ serviceType, city, brandName, phone: phone || undefined })}
        >
          {t("next")}
        </Button>
      </div>
    </section>
  );
}
