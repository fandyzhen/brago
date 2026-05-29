import "server-only";
import type { VisionProvider } from "./types";
import { createDoubaoVisionProvider } from "./doubao";
import { createFallbackVisionProvider } from "./fallback";

export function getVisionProvider(): VisionProvider {
  if (process.env.VOLCANO_ENGINE_API_KEY) {
    return createDoubaoVisionProvider();
  }
  return createFallbackVisionProvider();
}

export function isAiVisionAvailable(): boolean {
  return Boolean(process.env.VOLCANO_ENGINE_API_KEY);
}
