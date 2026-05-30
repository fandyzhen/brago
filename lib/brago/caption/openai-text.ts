import "server-only";
import { openAiChat, openAiTextModel } from "@/lib/brago/openai-compat";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-builders";
import type { CaptionInput, CaptionResult, TextProvider } from "./text-provider";

/**
 * OpenAI 兼容的文案 provider（推荐用于面向英文/西语市场的部署）。
 * 复用与豆包相同的提示词，仅切换底层模型。
 */
export function createOpenAiTextProvider(): TextProvider {
  return {
    name: "openai",
    async generateGoogleCaption(input: CaptionInput): Promise<CaptionResult> {
      const caption = await openAiChat(
        [
          { role: "system", content: buildSystemPrompt(input) },
          { role: "user", content: buildUserPrompt(input) },
        ],
        { model: openAiTextModel(), temperature: 0.7, maxTokens: 600 },
      );
      if (!caption) throw new Error("Empty caption from OpenAI");
      return {
        caption,
        language: input.language,
        source: "ai",
      };
    },
  };
}
