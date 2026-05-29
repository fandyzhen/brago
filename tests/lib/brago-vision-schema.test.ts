import { describe, expect, it } from "vitest";
import { photoVisionAnalysisSchema } from "@/lib/brago/vision/schema";

const goodPayload = {
  photos: [
    {
      photoId: "p1",
      role: "after",
      roleConfidence: 0.9,
      bestAfterScore: 9,
      scores: {
        resultVisibility: 9,
        transformationStrength: 9,
        subjectCompleteness: 9,
        trustSignal: 8,
        googleFit: 9,
      },
      cropHint: {
        xPct: 5,
        yPct: 5,
        widthPct: 90,
        heightPct: 90,
        preferredAspectRatio: "1:1",
      },
      riskFlags: {
        visibleFace: false,
        visibleLicensePlate: false,
        visibleHouseNumber: false,
        tooBlurryToUse: false,
        tooDarkToUse: false,
        likelyCustomerPrivateProperty: false,
      },
      why: "Clean concrete, strong contrast.",
    },
  ],
  recommendedPhotoId: "p1",
  alternatives: [],
  proofRecommendation: {
    mode: "single_after",
    pairConfidence: 0,
    transformationScore: 0,
    reason: "Single after only.",
  },
};

describe("photoVisionAnalysisSchema", () => {
  it("accepts a fully valid payload", () => {
    const r = photoVisionAnalysisSchema.safeParse(goodPayload);
    expect(r.success).toBe(true);
  });

  it("rejects non-boolean risk flags", () => {
    const bad = JSON.parse(JSON.stringify(goodPayload));
    bad.photos[0].riskFlags.visibleFace = "yes";
    const r = photoVisionAnalysisSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects roleConfidence > 1", () => {
    const bad = JSON.parse(JSON.stringify(goodPayload));
    bad.photos[0].roleConfidence = 1.5;
    expect(photoVisionAnalysisSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown proof mode", () => {
    const bad = JSON.parse(JSON.stringify(goodPayload));
    bad.proofRecommendation.mode = "side_by_side";
    expect(photoVisionAnalysisSchema.safeParse(bad).success).toBe(false);
  });
});
