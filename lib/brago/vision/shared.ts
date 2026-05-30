import "server-only";
import { photoVisionAnalysisSchema, type PhotoVisionAnalysis } from "./schema";
import type { VisionInput } from "./types";

/**
 * 视觉选图（best-after-shot）的共享提示词与响应解析。
 *
 * 抽成共享模块，让豆包与 OpenAI 两个 provider 复用同一套提示词和
 * 校验/后处理逻辑，避免不同供应商之间的判图标准漂移。
 */

export const SYSTEM_PROMPT = `You help a local home-services business owner pick the best photo for their Google Business Profile.

You will receive multiple photos from one finished job. For each photo, identify the role (before / after / process / detail / team / other) and score it on:
- resultVisibility (0-10): how clearly the finished result is visible
- transformationStrength (0-10): how dramatic the before->after change appears
- subjectCompleteness (0-10): is the subject fully framed?
- trustSignal (0-10): does it look like a real working business?
- googleFit (0-10): would it look right as a Google Business Profile photo?

Flag visible faces, license plates, house numbers, blur, low light, and customer private property risks.

Recommend ONE photo as recommendedPhotoId (the strongest after shot).

Set proofRecommendation.mode = "before_after_proof" ONLY when:
 - You have a clear before+after pair from a similar vantage point, AND
 - pairConfidence >= 0.75 AND transformationScore >= 7 AND
 - no major privacy or risk concerns

Otherwise set mode = "single_after".

cropHint should frame the visible RESULT (or the strongest portion of the transformation) and prefer a 1:1 aspect ratio.

Output JSON only that matches this TypeScript type exactly (no markdown fences, no commentary):
{
  photos: Array<{
    photoId: string,
    role: "before" | "after" | "process" | "detail" | "team" | "other",
    roleConfidence: number, // 0..1
    bestAfterScore: number, // 0..10
    scores: { resultVisibility: number, transformationStrength: number, subjectCompleteness: number, trustSignal: number, googleFit: number },
    cropHint: { xPct: number, yPct: number, widthPct: number, heightPct: number, preferredAspectRatio: "1:1" | "4:3" },
    riskFlags: { visibleFace: boolean, visibleLicensePlate: boolean, visibleHouseNumber: boolean, tooBlurryToUse: boolean, tooDarkToUse: boolean, likelyCustomerPrivateProperty: boolean },
    why: string
  }>,
  recommendedPhotoId: string | null,
  alternatives: string[],
  proofRecommendation: {
    mode: "single_after" | "before_after_proof",
    beforePhotoId?: string,
    afterPhotoId?: string,
    pairConfidence: number,
    transformationScore: number,
    reason: string
  }
}`;

export function buildUserPrompt(input: VisionInput): string {
  return [
    `Industry: ${input.industry}`,
    `Service: ${input.serviceType}`,
    input.serviceArea ? `Area: ${input.serviceArea}` : "",
    "",
    "Photo IDs in same order as images below:",
    ...input.photos.map((p) => `- ${p.photoId}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 解析模型返回的视觉分析 JSON：JSON.parse → schema 校验 → proof 模式后处理。
 * 任何一步失败都抛出明确错误，调用方据此回退到非 AI 流程。
 */
export function parseVisionAnalysis(text: string): PhotoVisionAnalysis {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      typeof text === "string" ? text : JSON.stringify(text),
    );
  } catch {
    throw new Error(`Vision returned non-JSON: ${String(text).slice(0, 200)}`);
  }

  const result = photoVisionAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Vision response failed schema validation: ${result.error.message}`,
    );
  }

  // 防御性后处理：proof 置信度/转换分不达标时降级为 single_after
  const proof = result.data.proofRecommendation;
  if (
    proof.mode === "before_after_proof" &&
    (proof.pairConfidence < 0.75 ||
      proof.transformationScore < 7 ||
      !proof.beforePhotoId ||
      !proof.afterPhotoId)
  ) {
    result.data.proofRecommendation = {
      ...proof,
      mode: "single_after",
      reason:
        "Pair confidence or transformation score too low; defaulting to single after.",
    };
  }

  return result.data;
}
