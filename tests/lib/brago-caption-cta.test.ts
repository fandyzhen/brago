import { describe, expect, it } from "vitest";
import { classifyPostKind, isCtaAligned } from "@/lib/brago/caption/cta-alignment";

describe("classifyPostKind", () => {
  it("flags education content", () => {
    expect(
      classifyPostKind(
        "How to choose a pressure washer\n\nThree things to consider when picking a washer for vinyl siding versus concrete.",
      ),
    ).toBe("education");
  });

  it("defaults to completed job", () => {
    expect(
      classifyPostKind(
        "Park Slope driveway cleanup\n\nCleaned a 30 ft concrete driveway this morning. Looks fresh. Call now.",
      ),
    ).toBe("completed_job");
  });

  it("flags team intro", () => {
    expect(
      classifyPostKind(
        "Meet our crew\n\nOur Park Slope team has been keeping driveways clean for 7 years.",
      ),
    ).toBe("team_intro");
  });
});

describe("isCtaAligned", () => {
  it("allows Call now on completed-job caption", () => {
    const body = "Cleaned a driveway in Park Slope this morning. Call now.";
    expect(isCtaAligned("completed_job", body)).toBe(true);
  });

  it("rejects Call now on education caption", () => {
    const body =
      "How to choose between soft wash and pressure wash for vinyl siding. Call now.";
    expect(isCtaAligned("education", body)).toBe(false);
  });

  it("allows Learn more on education caption", () => {
    const body =
      "How to choose between soft wash and pressure wash for vinyl siding. Learn more.";
    expect(isCtaAligned("education", body)).toBe(true);
  });
});
