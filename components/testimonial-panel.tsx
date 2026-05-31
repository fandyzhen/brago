"use client";

import { cn } from "@/lib/utils";
import { FeaturedTestimonials } from "@/components/featured-testimonials";
import { useTranslations } from "next-intl";

/**
 * Shared right-side panel used by /signup, /login and /contact.
 *
 * Renders the featured-testimonial avatar row (with hover tooltips) plus
 * a short headline + description. Source of copy: `contact.testimonial.*`
 * in messages/en.json so both pages stay in sync.
 */
export function TestimonialPanel() {
  const t = useTranslations("contact.testimonial");
  return (
    <div className="max-w-sm mx-auto">
      <FeaturedTestimonials />
      <p
        className={cn(
          "font-semibold text-xl text-center text-muted-foreground",
        )}
      >
        {t("title")}
      </p>
      <p
        className={cn(
          "font-normal text-base text-center text-muted-foreground mt-8",
        )}
      >
        {t("description")}
      </p>
    </div>
  );
}
