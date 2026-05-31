import { describe, expect, it } from "vitest";
import { scoreOutput } from "@/lib/brago/quality/score";
import data from "./eval-set.json";

type EvalCase = {
  id: string;
  industry: string;
  serviceType: string;
  serviceArea: string;
  language: "en" | "es";
  candidate: string;
  image: {
    isAiGenerated: boolean;
    hasBragoWatermark: boolean;
    overlayText: string;
  };
  minScore: number;
  expectMustPassFailure?: boolean;
};

const cases = (data as { cases: EvalCase[] }).cases;

describe("brago quality eval", () => {
  for (const c of cases) {
    it(c.id, () => {
      const r = scoreOutput({
        caption: c.candidate,
        language: c.language,
        ctx: { serviceType: c.serviceType, serviceArea: c.serviceArea },
        recentCaptions: [],
        image: c.image,
      });
      if (c.expectMustPassFailure) {
        expect(r.mustPassFailures.length).toBeGreaterThan(0);
      }
      expect(r.score).toBeGreaterThanOrEqual(c.minScore);
    });
  }
});
