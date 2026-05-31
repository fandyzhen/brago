"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HERO_CASES, type HeroCase } from "@/lib/hero/cases";

const ease = [0.16, 1, 0.3, 1] as const;

function SpotlightCard({
  hero,
  className,
  priority = false,
}: {
  hero: HeroCase;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-border bg-card p-2.5 shadow-tactile",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[20px] border border-border">
        <div className="relative aspect-[4/3]">
          <Image
            src={hero.imagePath}
            alt={hero.alt}
            fill
            priority={priority}
            sizes="(max-width: 768px) 88vw, 36rem"
            className="object-cover"
          />
          {/* Google-ready strip */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-foreground/90 px-4 py-2.5 backdrop-blur">
            <div>
              <p className="text-xs font-semibold text-background">
                Google-ready photo
              </p>
              <p className="text-[10px] text-background/60">
                1200×900 · 4:3 · main + corner before
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs leading-none text-brand">★★★★★</p>
              <p className="text-[9px] text-background/50">Business Profile</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border px-5 py-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Google caption
            </p>
            <span className="rounded-full border border-border bg-paper-glow px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground/70">
              {hero.industryLabel}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
            {hero.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            {hero.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function ThumbButton({
  hero,
  selected,
  onClick,
}: {
  hero: HeroCase;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Show ${hero.title}`}
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl border bg-card p-2 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        selected
          ? "border-brand ring-2 ring-brand/40"
          : "border-border hover:border-brand/40",
      )}
    >
      <div className="relative h-16 w-20 flex-none overflow-hidden rounded-lg border border-border">
        <Image
          src={hero.imagePath}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {hero.industryLabel}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold leading-tight text-foreground">
          {hero.overlay.city}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {hero.overlay.service}
        </p>
      </div>
    </button>
  );
}

export function HeroCaseShowcase() {
  const cases = HERO_CASES;
  const [active, setActive] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Mobile: observe which card is most-visible → update dot indicator
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = mobileIndex;
        let bestRatio = 0;
        for (const entry of entries) {
          const idx = Number(
            (entry.target as HTMLElement).dataset.index ?? "-1",
          );
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (bestRatio > 0.5 && bestIdx !== mobileIndex) {
          setMobileIndex(bestIdx);
        }
      },
      { root: track, threshold: [0.5, 0.75, 0.9] },
    );
    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [mobileIndex]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = cardRefs.current[idx];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  return (
    <motion.section
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ease, duration: 0.65, delay: 0.5 }}
      className="relative mt-14 w-full"
      aria-label="Brago real-customer case showcase"
    >
      {/* DESKTOP: spotlight (left) + thumb column (right) */}
      <div className="mx-auto hidden max-w-5xl gap-6 md:grid md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={cases[active].id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease }}
            >
              <SpotlightCard hero={cases[active]} priority={active === 0} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            More real renders
          </p>
          {cases.map((c, idx) => (
            <ThumbButton
              key={c.id}
              hero={c}
              selected={idx === active}
              onClick={() => setActive(idx)}
            />
          ))}
        </div>
      </div>

      {/* MOBILE: horizontal snap carousel + dots */}
      <div className="md:hidden">
        <div
          ref={trackRef}
          className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-label="Swipe through Brago cases"
        >
          {cases.map((c, idx) => (
            <div
              key={c.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              data-index={idx}
              className="w-[88vw] max-w-md flex-none snap-center"
            >
              <SpotlightCard hero={c} priority={idx === 0} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          {cases.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Show case ${idx + 1} of ${cases.length}`}
              aria-current={idx === mobileIndex}
              onClick={() => scrollToIndex(idx)}
              className={cn(
                "h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
                idx === mobileIndex
                  ? "w-6 bg-brand"
                  : "w-2 bg-foreground/20 hover:bg-foreground/40",
              )}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
