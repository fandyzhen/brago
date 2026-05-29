import { describe, expect, it } from "vitest";
import {
  computeStreakDays,
  freshnessLabel,
  freshnessStatus,
} from "@/lib/brago/reminders/freshness";

describe("computeStreakDays", () => {
  it("counts consecutive days from today backwards", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    const dates = [
      new Date("2026-05-29T08:00:00Z"),
      new Date("2026-05-28T09:00:00Z"),
      new Date("2026-05-27T10:00:00Z"),
      new Date("2026-05-25T10:00:00Z"), // gap
    ];
    expect(computeStreakDays(dates, now)).toBe(3);
  });

  it("returns 0 for empty input", () => {
    expect(computeStreakDays([])).toBe(0);
  });

  it("ignores invalid entries", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    expect(
      computeStreakDays(
        [null, "not-a-date", new Date("2026-05-29T08:00:00Z")],
        now,
      ),
    ).toBe(1);
  });
});

describe("freshnessLabel", () => {
  it("messages an empty profile", () => {
    expect(freshnessLabel(null)).toContain("No Google post");
  });
  it("messages a fresh post", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    expect(freshnessLabel(new Date("2026-05-28T08:00:00Z"), now)).toContain(
      "Fresh",
    );
  });
  it("messages a stale post", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    expect(freshnessLabel(new Date("2026-05-15T08:00:00Z"), now)).toContain(
      "No Google post this week",
    );
  });
});

describe("freshnessStatus", () => {
  it("returns empty / fresh / stale", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    expect(freshnessStatus(null, now)).toBe("empty");
    expect(freshnessStatus(new Date("2026-05-25T08:00:00Z"), now)).toBe("fresh");
    expect(freshnessStatus(new Date("2026-05-10T08:00:00Z"), now)).toBe("stale");
  });
});
