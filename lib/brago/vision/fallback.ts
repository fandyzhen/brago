import "server-only";
import type { PhotoVisionAnalysis } from "./schema";
import type { VisionInput, VisionProvider } from "./types";

export function createFallbackVisionProvider(): VisionProvider {
  return {
    name: "fallback",
    async analyzeGooglePostPhotos(
      input: VisionInput,
    ): Promise<PhotoVisionAnalysis> {
      const photos = input.photos.map((p) => ({
        photoId: p.photoId,
        role: "other" as const,
        roleConfidence: 0,
        bestAfterScore: 0,
        scores: {
          resultVisibility: 0,
          transformationStrength: 0,
          subjectCompleteness: 0,
          trustSignal: 0,
          googleFit: 0,
        },
        cropHint: {
          xPct: 5,
          yPct: 5,
          widthPct: 90,
          heightPct: 90,
          preferredAspectRatio: "1:1" as const,
        },
        riskFlags: {
          visibleFace: false,
          visibleLicensePlate: false,
          visibleHouseNumber: false,
          tooBlurryToUse: false,
          tooDarkToUse: false,
          likelyCustomerPrivateProperty: false,
        },
        why: "Photo AI not connected. Please pick the best after shot manually.",
      }));
      return {
        photos,
        recommendedPhotoId: null,
        alternatives: input.photos.map((p) => p.photoId),
        proofRecommendation: {
          mode: "single_after",
          pairConfidence: 0,
          transformationScore: 0,
          reason: "Photo AI not connected; defaulting to single after.",
        },
      };
    },
  };
}
