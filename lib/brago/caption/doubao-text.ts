import "server-only";
import { createChatCompletion } from "@/lib/volcano-engine/chat";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-builders";
import type {
  CaptionInput,
  CaptionResult,
  TextProvider,
} from "./text-provider";

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
