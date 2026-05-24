import { describe, it, expect, vi } from "vitest";
import { detectOrientation, pickPreviewTemplates } from "@/lib/poster-templates/orientation-match";

describe("orientation-match", () => {
  describe("detectOrientation", () => {
    it("returns landscape when width significantly > height", () => {
      expect(detectOrientation(1600, 900)).toBe("landscape");
      expect(detectOrientation(1200, 1000)).toBe("landscape"); // ratio 1.2
    });
    it("returns portrait when height significantly > width", () => {
      expect(detectOrientation(900, 1600)).toBe("portrait");
      expect(detectOrientation(1000, 1200)).toBe("portrait"); // ratio 0.83
    });
    it("returns square when ratio within ±10%", () => {
      expect(detectOrientation(1080, 1080)).toBe("square");
      expect(detectOrientation(1000, 1050)).toBe("square");
    });
    it("treats exactly ±10% as landscape/portrait", () => {
      // ratio exactly 1.1 → landscape (>= 1.1)
      expect(detectOrientation(1100, 1000)).toBe("landscape");
      // ratio exactly 0.9 → portrait (<= 0.9)
      expect(detectOrientation(900, 1000)).toBe("portrait");
      // just below 1.1 → square
      expect(detectOrientation(1090, 1000)).toBe("square");
      // just above 0.9 → square
      expect(detectOrientation(910, 1000)).toBe("square");
    });
    it("returns square for invalid dimensions", () => {
      expect(detectOrientation(0, 1000)).toBe("square");
      expect(detectOrientation(-100, 100)).toBe("square");
    });
  });

  describe("pickPreviewTemplates", () => {
    it("never returns collage templates", () => {
      const picks = pickPreviewTemplates("landscape", 10);
      for (const t of picks) expect(t.layoutFamily).not.toBe("collage");
    });
    it("returns at most `count` templates", () => {
      expect(pickPreviewTemplates("square", 3).length).toBeLessThanOrEqual(3);
      expect(pickPreviewTemplates("landscape", 2).length).toBeLessThanOrEqual(2);
    });
    it("landscape returns only split/card_pair (the score-3 families) in top 3", () => {
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
      try {
        const picks = pickPreviewTemplates("landscape", 3);
        const families = picks.map((p) => p.layoutFamily);
        const topFamilies = new Set(["split", "card_pair"]);
        // With pool sizes split=7 + card_pair=1, the 8-strong score-3 bucket
        // saturates count=3, so every pick MUST come from the top bucket.
        expect(families.every((f) => topFamilies.has(f))).toBe(true);
      } finally {
        randomSpy.mockRestore();
      }
    });
    it("portrait returns only stacked/hero_photo (the score-3 families) in top 3", () => {
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
      try {
        const picks = pickPreviewTemplates("portrait", 3);
        const families = picks.map((p) => p.layoutFamily);
        const topFamilies = new Set(["stacked", "hero_photo"]);
        // Pool sizes stacked=5 + hero_photo=2 → 7-strong bucket > count=3.
        expect(families.every((f) => topFamilies.has(f))).toBe(true);
      } finally {
        randomSpy.mockRestore();
      }
    });
  });
});
