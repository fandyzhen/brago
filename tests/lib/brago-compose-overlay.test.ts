import { describe, expect, it } from "vitest";
import {
  buildOverlayText,
  buildOverlaySvg,
  passesThumbnailReadability,
} from "@/lib/brago/compose/overlay";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/brago/compose/constants";

describe("buildOverlayText", () => {
  it("uppercases and joins city + service", () => {
    expect(buildOverlayText("park slope", "driveway")).toBe(
      "PARK SLOPE · DRIVEWAY",
    );
  });

  it("trims to 3-5 words by truncating long service phrases", () => {
    const out = buildOverlayText("park slope", "ceramic coating premium plus deluxe");
    const words = out.split(/\s+/).filter((w) => w !== "·");
    expect(words.length).toBeLessThanOrEqual(5);
  });

  it("falls back to service-only when no city", () => {
    expect(buildOverlayText(null, "driveway")).toBe("DRIVEWAY");
  });

  it("returns empty string when neither field is set", () => {
    expect(buildOverlayText(null, "")).toBe("");
  });
});

describe("buildOverlaySvg", () => {
  it("returns SVG matching canvas width", () => {
    const svg = buildOverlaySvg("PARK SLOPE · DRIVEWAY").toString("utf-8");
    expect(svg).toContain(`width="${CANVAS_WIDTH}"`);
    expect(svg).toContain(`height="${CANVAS_HEIGHT}"`);
    expect(svg).toContain("PARK SLOPE · DRIVEWAY");
  });
});

describe("passesThumbnailReadability", () => {
  // 缩略图可读性合成 gate：text height after resize to 150px wide
  // 必须 ≥ 9px（在 150px 缩略图上人眼可读阈值），且 contrast ≥ 4.5:1（已固定为白字+黑描边）
  it("passes for normal 3-5 word overlay", () => {
    expect(passesThumbnailReadability("PARK SLOPE · DRIVEWAY")).toBe(true);
  });

  it("fails when text would be illegibly small (>10 words)", () => {
    expect(
      passesThumbnailReadability(
        "PARK SLOPE BROOKLYN DRIVEWAY PRESSURE CLEAN POLISH SHINE BRIGHT",
      ),
    ).toBe(false);
  });

  it("passes empty (no overlay → trivially readable)", () => {
    expect(passesThumbnailReadability("")).toBe(true);
  });
});
