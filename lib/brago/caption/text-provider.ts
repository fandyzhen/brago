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

import { createOpenAiTextProvider } from "./openai-text";
import { createDoubaoTextProvider } from "./doubao-text";
import { createFallbackTextProvider } from "./fallback-text";

export function getTextProvider(): TextProvider {
  // 优先海外模型（面向英文/西语市场更地道、海外部署更合规低延迟），
  // 其次火山引擎豆包，最后回退到本地模板（无需任何 AI key）。
  if (process.env.OPENAI_API_KEY) return createOpenAiTextProvider();
  if (process.env.VOLCANO_ENGINE_API_KEY) return createDoubaoTextProvider();
  return createFallbackTextProvider();
}

export function isAiTextAvailable(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY || process.env.VOLCANO_ENGINE_API_KEY,
  );
}
