import "server-only";
import { openAiChat, openAiVisionModel } from "@/lib/brago/openai-compat";
import { SYSTEM_PROMPT, buildUserPrompt, parseVisionAnalysis } from "./shared";
import type { PhotoVisionAnalysis } from "./schema";
import type { VisionInput, VisionProvider } from "./types";

/**
 * OpenAI 兼容的视觉 provider（best-after-shot 选图）。
 * 用标准的多模态 image_url content parts + JSON 响应格式。
 */
export function createOpenAiVisionProvider(): VisionProvider {
  return {
    name: "openai",
    async analyzeGooglePostPhotos(
      input: VisionInput,
    ): Promise<PhotoVisionAnalysis> {
      const userParts: Array<Record<string, unknown>> = [
        { type: "text", text: buildUserPrompt(input) },
        ...input.photos.map((p) => ({
          type: "image_url",
          image_url: { url: p.url },
        })),
      ];

      const text = await openAiChat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts },
        ],
        { model: openAiVisionModel(), temperature: 0.2, jsonObject: true },
      );

      return parseVisionAnalysis(text);
    },
  };
}
