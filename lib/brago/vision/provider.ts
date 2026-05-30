import "server-only";
import type { VisionProvider } from "./types";
import { createOpenAiVisionProvider } from "./openai";
import { createDoubaoVisionProvider } from "./doubao";
import { createFallbackVisionProvider } from "./fallback";

export function getVisionProvider(): VisionProvider {
  // 优先海外模型，其次豆包，最后回退到非 AI 的启发式选图。
  if (process.env.OPENAI_API_KEY) return createOpenAiVisionProvider();
  if (process.env.VOLCANO_ENGINE_API_KEY) return createDoubaoVisionProvider();
  return createFallbackVisionProvider();
}

export function isAiVisionAvailable(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY || process.env.VOLCANO_ENGINE_API_KEY,
  );
}
