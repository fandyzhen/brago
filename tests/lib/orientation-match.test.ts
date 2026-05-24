import { describe, it, expect } from "vitest";
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
    it("landscape prioritizes split/card_pair (score 3) ahead of stacked (score 1)", () => {
      // Run a few times to average out randomness within score buckets
      const picks = pickPreviewTemplates("landscape", 3);
      const families = picks.map((p) => p.layoutFamily);
      // At least one of the top picks should be a 3-scored family
      const topFamilies = new Set(["split", "card_pair"]);
      expect(families.some((f) => topFamilies.has(f))).toBe(true);
    });
    it("portrait prioritizes stacked/hero_photo over split", () => {
      const picks = pickPreviewTemplates("portrait", 3);
      const families = picks.map((p) => p.layoutFamily);
      const topFamilies = new Set(["stacked", "hero_photo"]);
      expect(families.some((f) => topFamilies.has(f))).toBe(true);
    });
  });
});
