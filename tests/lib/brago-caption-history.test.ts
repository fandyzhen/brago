import { describe, expect, it } from "vitest";
import {
  extractKeyPhrases,
  extractOpeningPhrase,
} from "@/lib/brago/caption/history";

describe("extractOpeningPhrase", () => {
  it("returns lowercased first ~6 words", () => {
    expect(
      extractOpeningPhrase("Cleaned up this driveway in South Austin today."),
    ).toBe("cleaned up this driveway in south");
  });
  it("strips leading punctuation", () => {
    expect(extractOpeningPhrase(`"Took on a job today."`)).toBe(
      "took on a job today",
    );
  });
  it("handles empty input", () => {
    expect(extractOpeningPhrase("")).toBe("");
  });
});

describe("extractKeyPhrases", () => {
  it("returns bigrams of content words", () => {
    const k = extractKeyPhrases(
      "Cleaned the driveway concrete looked bright the concrete was clean concrete bright concrete bright",
    );
    expect(k.length).toBeGreaterThan(0);
    for (const phrase of k) {
      expect(phrase).toMatch(/^\S+ \S+$/);
    }
  });

  it("filters stop-word-only pairs", () => {
    const k = extractKeyPhrases("the of and to but");
    expect(k).toEqual([]);
  });
});
