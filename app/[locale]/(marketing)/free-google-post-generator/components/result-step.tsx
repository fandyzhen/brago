"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { UploadedPhoto } from "./upload-step";

export type ResultPayload = {
  bestPhotoId: string | null;
  whyThisPhoto?: string | null;
  caption: string;
  policyOk: boolean;
};

export function ResultStep(props: {
  photos: UploadedPhoto[];
  result: ResultPayload;
  onUnlock: () => void;
}) {
  const t = useTranslations("freeTrial.steps.result");
  const bestPhoto = props.photos.find((p) => p.id === props.result.bestPhotoId) ?? props.photos[0];

  return (
    <section className="grid gap-5">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>

      {bestPhoto && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bestPhoto.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">Brago</span>
            {props.result.policyOk && <span className="text-xs">{t("policyOk")}</span>}
          </div>
          {props.result.whyThisPhoto && (
            <div className="border-t border-border bg-background p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{t("whyThisPhoto")}</span> {props.result.whyThisPhoto}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("captionLabel")}</div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{props.result.caption}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[t("lockedCopy"), t("lockedDownload"), t("lockedSpanish"), t("lockedRegen")].map((label) => (
          <button
            key={label}
            type="button"
            onClick={props.onUnlock}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-card"
          >
            <Lock className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={props.onUnlock}
        className="rounded-2xl bg-brand text-brand-foreground px-6 py-4 text-base font-bold shadow-tactile transition-all hover:-translate-y-0.5"
      >
        {t("unlockCta")}
        <span className="ml-2 text-sm font-normal opacity-80">— {t("unlockSubtext")}</span>
      </button>
    </section>
  );
}
