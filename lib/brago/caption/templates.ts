import type { GoogleCaptionTemplate, Industry } from "@/lib/brago/types";
import { PRESSURE_TEMPLATES } from "./templates-pressure";
import { DETAILING_TEMPLATES } from "./templates-detailing";
import { CLEANING_TEMPLATES } from "./templates-cleaning";

export const ALL_TEMPLATES: GoogleCaptionTemplate[] = [
  ...PRESSURE_TEMPLATES,
  ...DETAILING_TEMPLATES,
  ...CLEANING_TEMPLATES,
];

export type TemplateSeason =
  | "spring"
  | "summer"
  | "fall"
  | "winter"
  | "any";

export type TemplateQuery = {
  industry: Industry;
  serviceType: string;
  season?: TemplateSeason;
  limit?: number;
};

function serviceTypeMatches(
  template: GoogleCaptionTemplate,
  serviceType: string,
): boolean {
  const stLower = serviceType.toLowerCase();
  return template.serviceTypes.some((s) => {
    const t = s.toLowerCase();
    return stLower.includes(t) || t.includes(stLower);
  });
}

export function findTemplates(q: TemplateQuery): GoogleCaptionTemplate[] {
  const matches = ALL_TEMPLATES.filter((t) => {
    if (t.industry !== q.industry) return false;
    if (!serviceTypeMatches(t, q.serviceType)) return false;
    if (
      q.season &&
      q.season !== "any" &&
      !t.seasons.includes(q.season) &&
      !t.seasons.includes("any")
    ) {
      return false;
    }
    return true;
  });
  if (matches.length > 0) return matches.slice(0, q.limit ?? 5);
  // Industry-only fallback.
  return ALL_TEMPLATES.filter((t) => t.industry === q.industry).slice(
    0,
    q.limit ?? 5,
  );
}

export function currentSeasonFor(date = new Date()): TemplateSeason {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}
