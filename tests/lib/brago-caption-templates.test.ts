import { describe, expect, it } from "vitest";
import {
  ALL_TEMPLATES,
  currentSeasonFor,
  findTemplates,
} from "@/lib/brago/caption/templates";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

describe("caption templates", () => {
  it("ships at least 50 templates", () => {
    expect(ALL_TEMPLATES.length).toBeGreaterThanOrEqual(50);
  });

  it("covers all three P0 industries", () => {
    const industries = new Set(ALL_TEMPLATES.map((t) => t.industry));
    expect(industries.has("pressure_washing")).toBe(true);
    expect(industries.has("auto_detailing")).toBe(true);
    expect(industries.has("cleaning")).toBe(true);
  });

  it("every template passes the Google policy checker", () => {
    for (const t of ALL_TEMPLATES) {
      const text = t.templateText
        .replace(/\{city\}/g, "Austin")
        .replace(/\{serviceType\}/g, "driveway");
      const r = checkGooglePolicy(text);
      expect(
        r.valid,
        `template ${t.id} failed: ${JSON.stringify(r.issues)}`,
      ).toBe(true);
    }
  });

  it("findTemplates returns matching service types first", () => {
    const r = findTemplates({
      industry: "pressure_washing",
      serviceType: "driveway",
      limit: 3,
    });
    expect(r.length).toBeGreaterThan(0);
    expect(
      r.every(
        (t) =>
          t.industry === "pressure_washing" &&
          t.serviceTypes.some((s) => s.includes("driveway")),
      ),
    ).toBe(true);
  });

  it("findTemplates falls back to industry when service unknown", () => {
    const r = findTemplates({
      industry: "cleaning",
      serviceType: "weird-service",
      limit: 3,
    });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((t) => t.industry === "cleaning")).toBe(true);
  });

  it("currentSeasonFor returns one of four", () => {
    expect(["spring", "summer", "fall", "winter"]).toContain(currentSeasonFor());
  });
});
