import "server-only";
import {
  getHeaders,
  validateConfig,
  volcanoEngineConfig,
} from "@/lib/volcano-engine/config";
import type { PhotoVisionAnalysis } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt, parseVisionAnalysis } from "./shared";
import type { VisionInput, VisionProvider } from "./types";

function pickVisionModel(): string {
  return (
    process.env.VOLCANO_ENGINE_VISION_MODEL ||
    process.env.BRAGO_VISION_MODEL ||
    process.env.VOLCANO_ENGINE_TEXT_MODEL ||
    "doubao-1-5-vision-pro-250328"
  );
}

export function createDoubaoVisionProvider(): VisionProvider {
  return {
    name: "doubao",
    async analyzeGooglePostPhotos(
      input: VisionInput,
    ): Promise<PhotoVisionAnalysis> {
      validateConfig();
      const model = pickVisionModel();
      const userParts: Array<Record<string, unknown>> = [
        { type: "text", text: buildUserPrompt(input) },
        ...input.photos.map((p) => ({
          type: "image_url",
          image_url: { url: p.url },
        })),
      ];

      const res = await fetch(
        `${volcanoEngineConfig.apiUrl}/chat/completions`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userParts },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Doubao vision error: ${res.status} ${err}`);
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data?.choices?.[0]?.message?.content ?? "{}";
      return parseVisionAnalysis(text);
    },
  };
}
