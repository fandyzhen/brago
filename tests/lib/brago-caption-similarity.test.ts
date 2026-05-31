import { describe, expect, it } from "vitest";
import { ngramSimilarity, isTooSimilar } from "@/lib/brago/caption/similarity";

describe("ngramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(ngramSimilarity("hello world test", "hello world test")).toBe(1);
  });

  it("returns near 0 for fully different strings", () => {
    expect(
      ngramSimilarity(
        "morning driveway cleaning park slope",
        "evening car detailing brooklyn heights",
      ),
    ).toBeLessThan(0.2);
  });

  it("returns moderate score for paraphrase", () => {
    const a =
      "Cleaned a concrete driveway in Park Slope this morning. Looks fresh.";
    const b =
      "Cleaned a concrete driveway in Park Slope today. Looks brand new.";
    const sim = ngramSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.5);
    expect(sim).toBeLessThan(0.95);
  });
});

describe("isTooSimilar", () => {
  it("flags any history caption above 0.7 threshold", () => {
    const candidate =
      "Cleaned a concrete driveway in Park Slope this morning. Came out fresh.";
    const history = [
      "Detailed a car in Austin today.",
      "Cleaned a concrete driveway in Park Slope this morning. Came out fresh and bright.",
    ];
    expect(isTooSimilar(candidate, history)).toBe(true);
  });

  it("passes when all history is distinct", () => {
    const candidate =
      "Polished a black SUV in Austin this afternoon. Paint looks deep.";
    const history = [
      "Cleaned a driveway in Park Slope yesterday. Looks great.",
      "Washed a fleet of trucks in Houston last week.",
    ];
    expect(isTooSimilar(candidate, history)).toBe(false);
  });
});
