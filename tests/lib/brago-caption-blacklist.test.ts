import { describe, expect, it } from "vitest";
import { containsBlacklistedPhrase } from "@/lib/brago/caption/blacklist";

describe("containsBlacklistedPhrase", () => {
  it("flags English template phrases", () => {
    expect(
      containsBlacklistedPhrase(
        "Trusted by Austin homeowners for years.",
        "en",
      ),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase("Expert pressure washing in Austin", "en"),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase(
        "Your local cleaning service in Brooklyn",
        "en",
      ),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase(
        "Best detailing in Austin guaranteed",
        "en",
      ),
    ).toBe(true);
  });

  it("flags Spanish equivalents", () => {
    expect(
      containsBlacklistedPhrase("Expertos en limpieza en Miami", "es"),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase("Mejor servicio en Austin", "es"),
    ).toBe(true);
    expect(
      containsBlacklistedPhrase("Profesional y confiable", "es"),
    ).toBe(true);
  });

  it("ignores benign captions", () => {
    expect(
      containsBlacklistedPhrase(
        "Cleaned a concrete driveway in Park Slope this morning.",
        "en",
      ),
    ).toBe(false);
    expect(
      containsBlacklistedPhrase(
        "Limpieza profunda de una camioneta en Austin esta mañana.",
        "es",
      ),
    ).toBe(false);
  });

  it("flags [city]-X-[city]-Y keyword stuffing", () => {
    expect(
      containsBlacklistedPhrase(
        "Austin cleaning, Austin detailing, Austin pressure washing",
        "en",
      ),
    ).toBe(true);
  });
});
