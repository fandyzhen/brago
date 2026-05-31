import { describe, expect, it } from "vitest";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

const good =
  "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. Pollen stains came right off. Concrete looks fresh. Book today.";

describe("checkGooglePolicy (extended)", () => {
  it("passes on a clean caption with proper structure", () => {
    const r = checkGooglePolicy(good, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.valid).toBe(true);
  });

  it("flags blacklisted phrase", () => {
    const text =
      "Park Slope driveway\n\nTrusted by Park Slope homeowners for years. Cleaned a driveway today.";
    const r = checkGooglePolicy(text, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.issues).toContain("blacklisted_phrase");
  });

  it("flags 30-day similarity", () => {
    const r = checkGooglePolicy(good, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [
        "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. Pollen stains came right off. Concrete looks fresh. Book today.",
      ],
    });
    expect(r.issues).toContain("similar_to_recent");
  });

  it("flags missing title and short body via structure", () => {
    const r = checkGooglePolicy("Too short.", {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.issues).toEqual(
      expect.arrayContaining(["missing_title", "length_out_of_range"]),
    );
  });

  it("still flags legacy issues (phone numbers, AI cliché)", () => {
    const text =
      "Park Slope driveway\n\nCall us at 512-555-1234 and we will transform your driveway.";
    const r = checkGooglePolicy(text, {
      language: "en",
      ctx: { serviceType: "driveway", serviceArea: "Park Slope" },
      recentCaptions: [],
    });
    expect(r.issues).toContain("phone_number_detected");
    expect(r.issues).toContain("ai_cliche");
  });
});
