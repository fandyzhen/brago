"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

export type GeneratingPhase = "vision" | "caption" | "error";

export function GeneratingStep(props: { phase: GeneratingPhase; error?: string | null }) {
  const t = useTranslations("freeTrial.steps.generating");
  return (
    <section className="grid place-items-center gap-4 rounded-2xl border border-border bg-card p-10">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      {props.phase === "vision" && <p className="text-sm text-muted-foreground">{t("vision")}</p>}
      {props.phase === "caption" && <p className="text-sm text-muted-foreground">{t("caption")}</p>}
      {props.phase === "error" && (
        <p className="text-sm text-red-600">{props.error ?? "Something went wrong, please retry."}</p>
      )}
    </section>
  );
}
