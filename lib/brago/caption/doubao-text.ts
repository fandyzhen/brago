import "server-only";
import { createChatCompletion } from "@/lib/volcano-engine/chat";
import type {
  CaptionInput,
  CaptionResult,
  TextProvider,
} from "./text-provider";

function buildSystemPrompt(input: CaptionInput): string {
  const langName = input.language === "es" ? "Spanish" : "English";
  return [
    `You write Google Business Profile captions for a local ${input.industry.replace("_", " ")} business.`,
    `Output language: ${langName}.`,
    "STRICT RULES:",
    "- No phone numbers. No URLs. No em dashes. No ALL-CAPS shouting.",
    "- 0-2 emojis maximum (prefer 0).",
    "- 60-700 characters preferred, hard maximum 1500.",
    "- Sound like a real local owner. Do NOT use: 'transform', 'looking to', 'whether you need', 'say goodbye to', 'we take pride in', 'another satisfying job', 'brought back to life'.",
    "- If suggesting contact, refer to the Call button on the Google profile.",
    "- Do NOT include hashtags.",
    "- Do not assert licensure or insurance unless the brand voice explicitly verifies it below.",
    "Respond with the caption text only, no quotes, no labels.",
  ].join("\n");
}

function buildUserPrompt(input: CaptionInput): string {
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
    "EXAMPLES (style only, do not copy text):",
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
    "Write ONE caption only.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function createDoubaoTextProvider(): TextProvider {
  return {
    name: "doubao",
    async generateGoogleCaption(input: CaptionInput): Promise<CaptionResult> {
      const res = await createChatCompletion(
        [
          { role: "system", content: buildSystemPrompt(input) },
          { role: "user", content: buildUserPrompt(input) },
        ],
        { temperature: 0.7, max_tokens: 600 },
      );
      const caption = (res.choices?.[0]?.message?.content ?? "").trim();
      if (!caption) throw new Error("Empty caption from Doubao");
      return {
        caption,
        language: input.language,
        source: "ai",
      };
    },
  };
}
