import "server-only";

/**
 * OpenAI 兼容的 Chat Completions 客户端（海外模型接入层）。
 *
 * 用标准的 OpenAI `/chat/completions` 协议，因此除了官方 OpenAI，
 * 还能直接对接任何兼容服务（OpenRouter、Azure OpenAI、本地网关等）——
 * 只需把 OPENAI_BASE_URL 指过去即可。
 *
 * 环境变量：
 *   OPENAI_API_KEY       必填，启用海外模型的开关
 *   OPENAI_BASE_URL      可选，默认 https://api.openai.com/v1
 *   OPENAI_TEXT_MODEL    可选，文案模型，默认 gpt-4o-mini
 *   OPENAI_VISION_MODEL  可选，视觉模型，默认 gpt-4o-mini
 */

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TEXT_MODEL = "gpt-4o-mini";
const DEFAULT_VISION_MODEL = "gpt-4o-mini";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function openAiTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
}

export function openAiVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
}

function baseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type OpenAiChatOptions = {
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** 要求模型返回严格 JSON 对象（用于视觉分析） */
  jsonObject?: boolean;
};

/**
 * 调用 OpenAI 兼容的 chat completions，返回首条消息的文本内容。
 */
export async function openAiChat(
  messages: OpenAiMessage[],
  opts: OpenAiChatOptions,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.jsonObject) body.response_format = { type: "json_object" };

  const url = baseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  // OpenRouter 推荐带上来源标识（用于其排行榜，部分模型也会校验来源）。
  // 走 OpenRouter 时自动附加，无需任何额外配置。
  if (url.includes("openrouter.ai")) {
    headers["HTTP-Referer"] =
      process.env.NEXT_PUBLIC_APP_URL || "https://brago.app";
    headers["X-Title"] = "Brago";
  }

  const res = await fetch(`${url}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI chat error: ${res.status} ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
