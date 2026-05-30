"use client";

import { useTranslations } from "next-intl";
import { Quote, Sparkles, Building2, Leaf, Car, Wrench, Brush } from "lucide-react";

type Testimonial = {
  industry: string;
  initials: string;
  quote: string;
  author: string;
  business: string;
};

const INDUSTRY_ICONS = [Brush, Leaf, Car, Wrench, Building2] as const;

export function ContactTestimonials() {
  const t = useTranslations("contact");

  const testimonials = t.raw("testimonials.items") as Testimonial[];
  const industries = t.raw("testimonials.industries") as string[];

  return (
    <div className="relative w-full max-w-md px-2">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {t("testimonials.eyebrow")}
        </div>
        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground">
          {t("testimonial.title")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("testimonial.description")}
        </p>
      </div>

      <div className="space-y-4">
        {testimonials.map((item, index) => (
          <article
            key={`${item.author}-${index}`}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur transition-colors hover:border-foreground/20"
          >
            <Quote
              className="absolute right-4 top-4 h-8 w-8 text-foreground/5"
              aria-hidden="true"
            />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {item.initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {item.author}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.business}
                </div>
              </div>
              <span className="ml-auto rounded-full bg-foreground/5 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground/70">
                {item.industry}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-foreground/90">
              &ldquo;{item.quote}&rdquo;
            </p>
          </article>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("testimonials.industriesLabel")}
        </div>
        <div className="flex flex-wrap gap-2">
          {industries.map((label, i) => {
            const Icon = INDUSTRY_ICONS[i % INDUSTRY_ICONS.length];
            return (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-foreground/80"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
