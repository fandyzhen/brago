import { describe, expect, it } from "vitest";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";
import { HERO_CASES } from "@/lib/hero/cases";

describe("HERO_CASES homepage showcase data", () => {
  it("has 6 unique cases", () => {
    expect(HERO_CASES).toHaveLength(6);
    const ids = new Set(HERO_CASES.map((c) => c.id));
    expect(ids.size).toBe(6);
  });

  it("references the generated /hero/cases/{id}.jpg image", () => {
    for (const c of HERO_CASES) {
      expect(c.imagePath).toBe(`/hero/cases/${c.id}.jpg`);
    }
  });

  it.each(HERO_CASES.map((c) => [c.id, c] as const))(
    "%s caption passes Google policy",
    (_id, c) => {
      const caption = `${c.title}\n\n${c.body}`;
      const result = checkGooglePolicy(caption, {
        language: "en",
        ctx: {
          serviceType: c.industry,
          serviceArea: c.overlay.city,
        },
        recentCaptions: [],
      });
      expect(result.issues).toEqual([]);
      expect(result.valid).toBe(true);
    },
  );

  it.each(HERO_CASES.map((c) => [c.id, c] as const))(
    "%s alt text mentions before and after",
    (_id, c) => {
      expect(c.alt.toLowerCase()).toContain("before");
      expect(c.alt.toLowerCase()).toContain("after");
    },
  );
});
