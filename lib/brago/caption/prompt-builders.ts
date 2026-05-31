import "server-only";
import type { CaptionInput } from "./text-provider";

/**
 * Caption 文案的 system / user prompt 构建。
 * Spec：docs/superpowers/specs/2026-05-31-output-quality-standard.md §2
 */

const EN_BLACKLIST_EXAMPLES = [
  '"trusted by [city] homeowners"',
  '"expert [service] in [city]"',
  '"your local [service]"',
  '"best in [city]"',
  '"high-quality at affordable prices"',
  '"guaranteed satisfaction"',
];

const ES_BLACKLIST_EXAMPLES = [
  '"expertos en [ciudad]"',
  '"mejor en [ciudad]"',
  '"profesional y confiable"',
  '"satisfacción garantizada"',
];

export function buildSystemPrompt(input: CaptionInput): string {
  const langName = input.language === "es" ? "US Spanish" : "English";
  const blacklist =
    input.language === "es" ? ES_BLACKLIST_EXAMPLES : EN_BLACKLIST_EXAMPLES;

  return [
    `You write Google Business Profile captions for a local ${input.industry.replace("_", " ")} business.`,
    `Output language: ${langName}.`,
    input.language === "es"
      ? "Use US Spanish (e.g. 'carro' not 'coche', 'cuadra' not 'manzana'). Do NOT machine-translate from English."
      : "",
    "",
    "STRUCTURE (strict):",
    "- Line 1: a short title in normal Case (30-50 chars). Never ALL CAPS.",
    "- Then a blank line.",
    "- Then the body: 100-300 chars, ending with a short CTA.",
    "- The first 100 chars of the body MUST include at least two of: the specific service, the neighborhood/city, a time anchor ('this morning', 'today', 'before the holiday').",
    "",
    "STYLE RULES:",
    "- No phone numbers. No URLs. No em dashes. No hashtags.",
    "- 0-2 emojis maximum (prefer 0).",
    "- Sound like a real local owner, not a marketing agency.",
    `- Never use these template phrases: ${blacklist.join(", ")}.`,
    "- Do not stuff the city name more than twice.",
    "- Avoid AI clichés: 'transform', 'looking to', 'whether you need', 'say goodbye to', 'we take pride in', 'another satisfying job', 'brought back to life'.",
    "- Do not assert licensure / insurance unless the brand voice explicitly verifies it below.",
    "- Do not invent customer names, prices, durations, or reviews.",
    "",
    "CTA RULES:",
    "- Completed-job posts → 'Call now', 'Call today', or 'Book'.",
    "- Education / team-intro / seasonal-info posts → 'Learn more'.",
    "- Never use 'Buy now', 'Order online', 'Get offer', or 'Sign up'.",
    "",
    "Respond with the caption text only — title on line 1, blank line, then body. No quotes, no labels, no markdown.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUserPrompt(input: CaptionInput): string {
  const claims = input.brandVoice.verifiedClaims ?? {};
  const claimsLine: string[] = [];
  if (claims.licensed) claimsLine.push("Verified: licensed");
  if (claims.insured) claimsLine.push("Verified: insured");
  if (claims.familyOwned) claimsLine.push("Verified: family-owned");
  if (claims.yearsInBusiness)
    claimsLine.push(`Verified: ${claims.yearsInBusiness}+ years in business`);

  return [
    `Service: ${input.serviceType}`,
    input.serviceArea ? `Area: ${input.serviceArea}` : "",
    `Speaker: ${input.brandVoice.speaker}`,
    `Tone: ${input.brandVoice.tone.join(", ") || "neighborly"}`,
    `Avoid: ${input.brandVoice.avoid.join(", ") || "fake_guarantees"}`,
    ...claimsLine,
    "",
    "Value-prop reminder: first 100 chars of the body must cover ≥2 of {service, area, time-anchor}.",
    "",
    "EXAMPLES (style only — do not copy text):",
    ...input.templateExamples.map((e, i) => `Example ${i + 1}: ${e}`),
    "",
    input.avoidOpenings.length
      ? `Avoid copying these recent openings: ${input.avoidOpenings.join("; ")}`
      : "",
    input.avoidPhrases.length
      ? `Avoid overusing these phrases: ${input.avoidPhrases.join("; ")}`
      : "",
    input.customInstruction
      ? `Style instruction: ${input.customInstruction}`
      : "",
    "",
    "Write ONE caption only — title + blank line + body.",
  ]
    .filter(Boolean)
    .join("\n");
}
