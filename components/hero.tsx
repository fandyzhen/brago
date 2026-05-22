"use client";

import { motion } from "framer-motion";
import { Button } from "./button";
import { Badge } from "./badge";
import { HiArrowRight } from "react-icons/hi2";
import { LocaleLink } from "@/components/locale-link";
import { useTranslations } from "next-intl";

const CHANNELS = [
  { label: "Google Business Profile", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Facebook", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { label: "Nextdoor", color: "bg-green-50 text-green-700 border-green-200" },
  { label: "Instagram", color: "bg-pink-50 text-pink-700 border-pink-200" },
];

export const Hero = () => {
  const t = useTranslations("hero");

  return (
    <div className="flex flex-col items-center pt-24 md:pt-40 pb-16 relative overflow-hidden w-full">
      {/* Badge */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.4 }}
        className="flex justify-center"
      >
        <Badge>{t("badge")}</Badge>
      </motion.div>

      {/* H1 */}
      <motion.h1
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.5, delay: 0.1 }}
        className="text-5xl md:text-7xl lg:text-8xl font-bold max-w-4xl mx-auto text-center mt-6 tracking-tight text-foreground relative z-10"
      >
        {t("title")}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.5, delay: 0.2 }}
        className="text-center mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto relative z-10"
      >
        {t("description")}
      </motion.p>

      {/* Supporting copy */}
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.5, delay: 0.3 }}
        className="text-center mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto relative z-10"
      >
        {t("supporting")}
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.5, delay: 0.4 }}
        className="flex items-center gap-4 justify-center mt-8 relative z-10"
      >
        <Button as={LocaleLink} href="/dashboard">
          {t("cta.primary")}
        </Button>
        <Button
          variant="simple"
          as={LocaleLink}
          href="/industries"
          className="flex space-x-2 items-center group"
        >
          <span>{t("cta.secondary")}</span>
          <HiArrowRight className="text-muted-foreground group-hover:translate-x-1 stroke-[1px] h-3 w-3 transition-transform duration-200" />
        </Button>
      </motion.div>

      {/* Channel chips */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.5, delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-2 mt-8 relative z-10"
      >
        {CHANNELS.map((ch) => (
          <span
            key={ch.label}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${ch.color}`}
          >
            {ch.label}
          </span>
        ))}
      </motion.div>

      {/* Before/after visual mockup */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeOut", duration: 0.6, delay: 0.6 }}
        className="w-full max-w-3xl mt-16 relative z-10"
      >
        <div className="p-3 border border-border bg-secondary rounded-[28px]">
          <div className="bg-background border border-border rounded-[20px] overflow-hidden">
            {/* Mock before/after post preview */}
            <div className="aspect-square max-w-sm mx-auto relative bg-muted flex items-center justify-center">
              <div className="absolute inset-0 flex">
                {/* Before side */}
                <div className="flex-1 bg-stone-200 relative flex items-center justify-center">
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/70 text-white text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full uppercase">
                      Before
                    </span>
                  </div>
                  <div className="text-stone-400 text-xs text-center px-4">
                    <div className="w-16 h-16 bg-stone-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-stone-500">Driveway before</p>
                  </div>
                </div>
                {/* Divider */}
                <div className="w-px bg-border" />
                {/* After side */}
                <div className="flex-1 bg-slate-100 relative flex items-center justify-center">
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/70 text-white text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full uppercase">
                      After
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs text-center px-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500">Driveway after</p>
                  </div>
                </div>
              </div>
              {/* Bottom info strip */}
              <div className="absolute bottom-0 inset-x-0 bg-foreground/90 px-4 py-2 flex items-center justify-between">
                <div>
                  <p className="text-background text-xs font-semibold">Concrete restored, not replaced.</p>
                  <p className="text-background/60 text-[10px]">Serving Austin, TX · Licensed · Insured</p>
                </div>
                <div className="text-right">
                  <p className="text-background/70 text-[10px]">★★★★★ 247</p>
                  <p className="text-background/50 text-[9px]">(512) 555-0184</p>
                </div>
              </div>
            </div>
            {/* Caption preview below */}
            <div className="px-6 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground font-mono">Caption preview</p>
              <p className="mt-1 text-sm text-foreground leading-relaxed">
                Just finished a full driveway pressure wash in Austin. Before/after says it all. Licensed &amp; insured — serving North Austin and surrounding areas. Message for a free quote. 🧹
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
