import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/brago/caption/prompt-builders";
import { DEFAULT_BRAND_VOICE } from "@/lib/brago/types";

const base = {
  industry: "pressure_washing" as const,
  serviceType: "driveway",
  serviceArea: "Park Slope",
  language: "en" as const,
  brandVoice: DEFAULT_BRAND_VOICE,
  templateExamples: [],
  avoidOpenings: [],
  avoidPhrases: [],
};

describe("buildSystemPrompt", () => {
  it("requires a title separated by a blank line", () => {
    const sys = buildSystemPrompt(base);
    expect(sys).toMatch(/title/i);
    expect(sys).toMatch(/blank line/i);
  });

  it("specifies body length 100-300 chars", () => {
    const sys = buildSystemPrompt(base);
    expect(sys).toMatch(/100/);
    expect(sys).toMatch(/300/);
  });

  it("calls out forbidden template phrases by name", () => {
    const sys = buildSystemPrompt(base);
    expect(sys.toLowerCase()).toContain("trusted by");
    expect(sys.toLowerCase()).toContain("expert");
    expect(sys.toLowerCase()).toContain("best in");
  });

  it("switches blacklist examples for Spanish", () => {
    const sys = buildSystemPrompt({ ...base, language: "es" });
    expect(sys.toLowerCase()).toContain("expertos");
    expect(sys.toLowerCase()).toContain("mejor en");
  });
});

describe("buildUserPrompt", () => {
  it("includes the value-prop anchor instruction", () => {
    const usr = buildUserPrompt(base);
    expect(usr).toMatch(/value prop|first 100/i);
  });
});
