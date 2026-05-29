import { describe, expect, it } from "vitest";
import { createFallbackVisionProvider } from "@/lib/brago/vision/fallback";

describe("fallback vision provider", () => {
  it("returns null recommendedPhotoId and single_after mode", async () => {
    const p = createFallbackVisionProvider();
    const out = await p.analyzeGooglePostPhotos({
      industry: "pressure_washing",
      serviceType: "driveway",
      photos: [
        { photoId: "p1", url: "u1" },
        { photoId: "p2", url: "u2" },
      ],
    });
    expect(out.recommendedPhotoId).toBeNull();
    expect(out.alternatives).toEqual(["p1", "p2"]);
    expect(out.proofRecommendation.mode).toBe("single_after");
    expect(out.photos).toHaveLength(2);
    expect(out.photos[0].why).toContain("Photo AI not connected");
    expect(out.photos[0].role).toBe("other");
  });

  it("handles empty photo input", async () => {
    const p = createFallbackVisionProvider();
    const out = await p.analyzeGooglePostPhotos({
      industry: "cleaning",
      serviceType: "carpet cleaning",
      photos: [],
    });
    expect(out.photos).toEqual([]);
    expect(out.recommendedPhotoId).toBeNull();
    expect(out.alternatives).toEqual([]);
  });
});
