import "server-only";
import {
  getHeaders,
  validateConfig,
  volcanoEngineConfig,
} from "@/lib/volcano-engine/config";
import {
  photoVisionAnalysisSchema,
  type PhotoVisionAnalysis,
} from "./schema";
import type { VisionInput, VisionProvider } from "./types";

const SYSTEM_PROMPT = `You help a local home-services business owner pick the best photo for their Google Business Profile.

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

function buildUserPrompt(input: VisionInput): string {
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
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userParts },
      ];

      const res = await fetch(
        `${volcanoEngineConfig.apiUrl}/chat/completions`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            model,
            messages,
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
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof text === "string" ? text : JSON.stringify(text));
      } catch {
        throw new Error(
          `Doubao vision returned non-JSON: ${String(text).slice(0, 200)}`,
        );
      }
      const result = photoVisionAnalysisSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(
          `Doubao vision response failed schema validation: ${result.error.message}`,
        );
      }

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
    },
  };
}
