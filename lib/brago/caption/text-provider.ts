import "server-only";
import type { BrandVoiceProfile, CaptionLanguage, Industry } from "@/lib/brago/types";

export type CaptionInput = {
  industry: Industry;
  serviceType: string;
  serviceArea: string | null;
  language: CaptionLanguage;
  brandVoice: BrandVoiceProfile;
  templateExamples: string[];
  avoidOpenings: string[];
  avoidPhrases: string[];
  customInstruction?: string;
};

export type CaptionResult = {
  caption: string;
  language: CaptionLanguage;
  source: "ai" | "fallback-template";
};

export type TextProvider = {
  name: string;
  generateGoogleCaption(input: CaptionInput): Promise<CaptionResult>;
};

import { createDoubaoTextProvider } from "./doubao-text";
import { createFallbackTextProvider } from "./fallback-text";

export function getTextProvider(): TextProvider {
  if (process.env.VOLCANO_ENGINE_API_KEY) return createDoubaoTextProvider();
  return createFallbackTextProvider();
}

export function isAiTextAvailable(): boolean {
  return Boolean(process.env.VOLCANO_ENGINE_API_KEY);
}
