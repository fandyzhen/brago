import { describe, expect, it } from "vitest";
import { scoreOutput } from "@/lib/brago/quality/score";

describe("scoreOutput", () => {
  const goodCaption =
    "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. Pollen stains came right off. Book today.";

  it("returns 0 when any must-pass gate fails", () => {
    const r = scoreOutput({
      caption: "Too short.",
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
      image: { isAiGenerated: false, hasBragoWatermark: false, overlayText: "PARK SLOPE · DRIVEWAY" },
    });
    expect(r.score).toBe(0);
    expect(r.mustPassFailures.length).toBeGreaterThan(0);
  });

  it("returns 0 when Brago watermark is present (hard gate)", () => {
    const r = scoreOutput({
      caption: goodCaption,
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
      image: { isAiGenerated: false, hasBragoWatermark: true, overlayText: "PARK SLOPE · DRIVEWAY" },
    });
    expect(r.score).toBe(0);
    expect(r.mustPassFailures).toContain("no_brago_watermark_on_image");
  });

  it("returns ≥ 70 for a clean caption + clean image", () => {
    const r = scoreOutput({
      caption: goodCaption,
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
      image: { isAiGenerated: false, hasBragoWatermark: false, overlayText: "PARK SLOPE · DRIVEWAY" },
    });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.mustPassFailures).toEqual([]);
  });
});
