import { describe, expect, it } from "vitest";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

describe("checkGooglePolicy", () => {
  it("flags US-style phone numbers", () => {
    const r = checkGooglePolicy("Call us at 512-555-1234 today.");
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("phone_number_detected");
  });

  it("flags absolute and bare URLs", () => {
    expect(
      checkGooglePolicy("Visit https://example.com today.").issues,
    ).toContain("url_detected");
    expect(checkGooglePolicy("Book at austinpressure.com").issues).toContain(
      "url_detected",
    );
  });

  it("flags em dashes", () => {
    expect(checkGooglePolicy("Cleaned this — looks fresh.").issues).toContain(
      "em_dash_detected",
    );
  });

  it("flags ALL-CAPS shouting", () => {
    // spec §2.6 + plan Task 1.6: requires 3+ consecutive 4-char caps words.
    expect(
      checkGooglePolicy("BIGGEST CLEANEST DEEPEST POWERWASH").issues,
    ).toContain("shouting_text");
  });

  it("flags AI clichés", () => {
    expect(
      checkGooglePolicy(
        "Whether you need a quick wash or a deep clean we got you.",
      ).issues,
    ).toContain("ai_cliche");
    expect(
      checkGooglePolicy("Transform your driveway today.").issues,
    ).toContain("ai_cliche");
  });

  it("flags too long", () => {
    expect(checkGooglePolicy("a".repeat(1600)).issues).toContain("too_long");
  });

  it("flags too many emojis", () => {
    expect(
      checkGooglePolicy("Great job today 🚿✨🌟🧽 fresh start").issues,
    ).toContain("too_many_emojis");
  });

  it("flags unverified license/insurance claims by default", () => {
    expect(
      checkGooglePolicy("We're licensed and insured for any job.").issues,
    ).toContain("unverified_claim");
  });

  it("does not flag verified claims when allowed", () => {
    const r = checkGooglePolicy(
      "We're licensed and insured for any job.",
      { allowVerifiedClaims: true },
    );
    expect(r.issues).not.toContain("unverified_claim");
  });

  it("passes a clean caption", () => {
    const r = checkGooglePolicy(
      "Cleaned a driveway in South Austin today. Concrete looks fresh again.",
    );
    expect(r.valid).toBe(true);
  });
});
