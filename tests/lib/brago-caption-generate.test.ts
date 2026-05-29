import { describe, expect, it, vi } from "vitest";

const handles = vi.hoisted(() => ({
  generate: vi.fn(),
  history: vi.fn(async () => []),
  record: vi.fn(async () => "h1"),
  brandVoice: {
    speaker: "local_owner",
    tone: ["friendly"],
    avoid: [],
    customerLanguage: "en",
    serviceAreas: [],
    verifiedClaims: {},
    ctaStyle: "call_now_button",
  },
}));

vi.mock("@/lib/brago/brand-voice", () => ({
  getBrandVoice: vi.fn(async () => handles.brandVoice),
}));

vi.mock("@/lib/brago/caption/history", () => ({
  getRecentHistory: handles.history,
  recordCaptionHistory: handles.record,
  extractOpeningPhrase: () => "",
  extractKeyPhrases: () => [],
}));

vi.mock("@/lib/brago/caption/text-provider", () => ({
  getTextProvider: () => ({
    name: "stub",
    generateGoogleCaption: handles.generate,
  }),
  isAiTextAvailable: () => false,
}));

import { generateCaption } from "@/lib/brago/caption/generate";

describe("generateCaption", () => {
  it("returns a policy-clean caption when the provider succeeds", async () => {
    handles.generate.mockResolvedValueOnce({
      caption:
        "Cleaned up a driveway in Austin today. Concrete looks fresh again.",
      language: "en",
      source: "ai",
    });
    const out = await generateCaption({
      userId: "u1",
      industry: "pressure_washing",
      serviceType: "driveway",
      serviceArea: "Austin",
      language: "en",
    });
    expect(out.caption.toLowerCase()).toContain("driveway");
    expect(out.policy.valid).toBe(true);
    expect(handles.record).toHaveBeenCalledTimes(1);
  });

  it("retries when the first attempt violates policy", async () => {
    handles.generate
      .mockResolvedValueOnce({
        caption: "Call us at 555-123-4567 today!",
        language: "en",
        source: "ai",
      })
      .mockResolvedValueOnce({
        caption:
          "Patio cleaning in Austin today. Looks great after the deep clean.",
        language: "en",
        source: "ai",
      });
    const out = await generateCaption({
      userId: "u1",
      industry: "pressure_washing",
      serviceType: "patio",
      serviceArea: "Austin",
      language: "en",
    });
    expect(out.policy.valid).toBe(true);
    expect(handles.generate.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to a template if the provider keeps failing", async () => {
    handles.generate.mockRejectedValueOnce(new Error("provider down"));
    const out = await generateCaption({
      userId: "u1",
      industry: "cleaning",
      serviceType: "carpet cleaning",
      serviceArea: "Austin",
      language: "en",
    });
    expect(out.source).toBe("fallback-template");
    expect(out.caption.length).toBeGreaterThan(20);
  });
});
