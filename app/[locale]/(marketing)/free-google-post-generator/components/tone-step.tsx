"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/button";

export type ToneInput = { tone: "friendly" | "professional" | "local_pride"; language: "en" | "es" };

export function ToneStep(props: {
  initial: Partial<ToneInput>;
  onSubmit: (t: ToneInput) => void;
  onBack: () => void;
}) {
  const t = useTranslations("freeTrial.steps.tone");
  const [tone, setTone] = useState<ToneInput["tone"]>(props.initial.tone ?? "friendly");
  const [language, setLanguage] = useState<ToneInput["language"]>(props.initial.language ?? "en");

  const tones: ToneInput["tone"][] = ["friendly", "professional", "local_pride"];

  return (
    <section className="grid gap-5">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>

      <div className="grid gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("toneLabel")}</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tones.map((tn) => (
            <button
              type="button"
              key={tn}
              onClick={() => setTone(tn)}
              className={`rounded-xl border px-4 py-3 text-left text-sm ${tone === tn ? "border-brand bg-brand/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}
            >
              {t(`toneOptions.${tn}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("languageLabel")}</span>
        <div className="flex gap-2">
          {(["en", "es"] as const).map((lang) => (
            <button
              type="button"
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm ${language === lang ? "border-brand bg-brand/10" : "border-border bg-background text-muted-foreground"}`}
            >
              {lang === "en" ? "English" : "Español"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <button type="button" onClick={props.onBack} className="text-sm text-muted-foreground underline">Back</button>
        <Button variant="accent" onClick={() => props.onSubmit({ tone, language })}>
          {t("generate")}
        </Button>
      </div>
    </section>
  );
}
