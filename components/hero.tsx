"use client";

import { motion } from "framer-motion";
import { Button } from "./button";
import { HiArrowRight } from "react-icons/hi2";
import { LocaleLink } from "@/components/locale-link";
import { useTranslations } from "next-intl";

const STEPS = [
  { label: "Upload job photos", hint: "1–10 from today's job" },
  { label: "Pick the best after shot", hint: "Brago suggests the strongest" },
  { label: "Copy to Google", hint: "Caption is Google-safe" },
];

const ease = [0.16, 1, 0.3, 1] as const;

export const Hero = () => {
  const t = useTranslations("hero");

  return (
    <section className="bg-paper-glow relative w-full overflow-hidden px-5 pt-24 pb-16 md:pt-36 md:pb-24">
      {/* Thin hazard accent at the very top — job-site signature */}
      <div className="bg-hazard absolute inset-x-0 top-0 h-1.5 opacity-90" aria-hidden />

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Branded badge */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease, duration: 0.45 }}
          className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          {t("badge")}
        </motion.div>

        {/* H1 */}
        <motion.h1
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease, duration: 0.55, delay: 0.08 }}
          className="mt-6 font-display text-[2.75rem] font-extrabold leading-[0.95] tracking-[-0.035em] text-foreground sm:text-6xl md:text-7xl lg:text-8xl"
        >
          {t("title")}
        </motion.h1>

        {/* Confident amber marker stroke */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ ease, duration: 0.5, delay: 0.35 }}
          className="mt-4 h-1.5 w-24 origin-left rounded-full bg-brand md:w-32"
          aria-hidden
        />

        {/* Subtitle */}
        <motion.p
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease, duration: 0.55, delay: 0.18 }}
          className="mt-6 max-w-2xl text-balance text-lg font-medium text-foreground/80 md:text-2xl"
        >
          {t("description")}
        </motion.p>

        {/* Supporting copy — hidden on the smallest screens to keep the fold tight */}
        <motion.p
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease, duration: 0.55, delay: 0.26 }}
          className="mt-3 hidden max-w-xl text-balance text-sm text-muted-foreground sm:block md:text-base"
        >
          {t("supporting")}
        </motion.p>

        {/* CTAs — primary is the can't-miss amber, full-width on phones */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease, duration: 0.55, delay: 0.34 }}
          className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          <Button
            as={LocaleLink}
            href="/free-google-post-generator"
            variant="accent"
            size="lg"
            className="w-full sm:w-auto"
          >
            {t("cta.primary")}
            <HiArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="simple"
            size="lg"
            as={LocaleLink}
            href="/industries/pressure-washing-marketing"
            className="group w-full sm:w-auto"
          >
            <span>{t("cta.secondary")}</span>
          </Button>
        </motion.div>

        {/* Three-step strip — chunky cards with amber numbers */}
        <motion.ol
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease, duration: 0.55, delay: 0.42 }}
          className="mt-10 grid w-full max-w-2xl list-none grid-cols-1 gap-2.5 sm:grid-cols-3"
        >
          {STEPS.map((step, idx) => (
            <li
              key={step.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm sm:flex-col sm:items-start sm:gap-2"
            >
              <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand font-display text-base font-bold text-brand-foreground">
                {idx + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight text-foreground">
                  {step.label}
                </span>
                <span className="block text-xs text-muted-foreground">{step.hint}</span>
              </span>
            </li>
          ))}
        </motion.ol>

        {/* Before/after visual mockup */}
        <motion.div
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease, duration: 0.65, delay: 0.5 }}
          className="relative mt-14 w-full max-w-md"
        >
          <div className="rounded-[28px] border border-border bg-card p-2.5 shadow-tactile">
            <div className="overflow-hidden rounded-[20px] border border-border">
              {/* Before / After split */}
              <div className="relative aspect-square">
                <div className="absolute inset-0 flex">
                  {/* Before */}
                  <div className="relative flex flex-1 items-center justify-center bg-stone-300">
                    <span className="absolute left-3 top-3 rounded-md bg-foreground/80 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-background">
                      Before
                    </span>
                    <div className="flex flex-col items-center text-stone-500">
                      <div className="mb-2 h-14 w-14 rounded-xl bg-stone-400/40" />
                      <span className="text-xs font-medium">Dull driveway</span>
                    </div>
                  </div>
                  {/* Seam */}
                  <div className="w-1 bg-brand" />
                  {/* After */}
                  <div className="relative flex flex-1 items-center justify-center bg-sky-50">
                    <span className="absolute right-3 top-3 rounded-md bg-brand px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-brand-foreground">
                      After
                    </span>
                    <div className="flex flex-col items-center text-sky-600/70">
                      <div className="mb-2 h-14 w-14 rounded-xl bg-sky-200" />
                      <span className="text-xs font-medium">Bright &amp; clean</span>
                    </div>
                  </div>
                </div>
                {/* Google-ready strip */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-foreground/90 px-4 py-2.5 backdrop-blur">
                  <div>
                    <p className="text-xs font-semibold text-background">Google-ready photo</p>
                    <p className="text-[10px] text-background/60">1080×1080 · cropped to the result</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs leading-none text-brand">★★★★★</p>
                    <p className="text-[9px] text-background/50">Business Profile</p>
                  </div>
                </div>
              </div>
              {/* Caption preview */}
              <div className="border-t border-border px-5 py-4 text-left">
                <p className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Google caption
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                  Knocked out a driveway in South Austin today — pulled years of grime off the
                  concrete. If yours could use the same, the Call button on our Google profile is
                  the easiest way to reach us.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
