import { describe, expect, it } from "vitest";
import {
  parseCaptionParts,
  checkCaptionStructure,
} from "@/lib/brago/caption/structure";

describe("parseCaptionParts", () => {
  it("splits the first non-empty line off as title", () => {
    const r = parseCaptionParts(
      "Park Slope driveway came up clean\n\nCleaned a 30 ft pollen-stained driveway in Park Slope this morning. Book today.",
    );
    expect(r.title).toBe("Park Slope driveway came up clean");
    expect(r.body.startsWith("Cleaned")).toBe(true);
  });

  it("falls back to empty title when only one line", () => {
    const r = parseCaptionParts("Just a single line caption with no break");
    expect(r.title).toBe("");
    expect(r.body).toContain("single line");
  });
});

describe("checkCaptionStructure", () => {
  const goodCaption =
    "Park Slope driveway came up clean\n\nCleaned a concrete driveway in Park Slope this morning. The pollen stains came right off. Book today.";

  it("passes a well-formed caption", () => {
    const r = checkCaptionStructure(goodCaption, {
      serviceType: "driveway",
      serviceArea: "Park Slope",
    });
    expect(r.issues).toEqual([]);
  });

  it("flags missing title", () => {
    const r = checkCaptionStructure(
      "Cleaned a driveway in Park Slope this morning. Looks fresh.",
      { serviceType: "driveway", serviceArea: "Park Slope" },
    );
    expect(r.issues).toContain("missing_title");
  });

  it("flags ALL-CAPS title", () => {
    const r = checkCaptionStructure(
      "PARK SLOPE DRIVEWAY CLEAN\n\nCleaned a driveway today.",
      { serviceType: "driveway", serviceArea: "Park Slope" },
    );
    expect(r.issues).toContain("title_all_caps");
  });

  it("flags caption shorter than 100 chars (body)", () => {
    const r = checkCaptionStructure("Title\n\nToo short.", {
      serviceType: "driveway",
      serviceArea: "Park Slope",
    });
    expect(r.issues).toContain("length_out_of_range");
  });

  it("flags caption longer than 300 chars (body)", () => {
    const long = "x".repeat(350);
    const r = checkCaptionStructure(`Title\n\n${long}`, {
      serviceType: "driveway",
      serviceArea: "Park Slope",
    });
    expect(r.issues).toContain("length_out_of_range");
  });

  it("flags first 100 chars without enough value-prop anchors", () => {
    // body 首 100 字既无服务又无地点又无时间锚定
    const r = checkCaptionStructure(
      "Title here\n\nIt was a great experience and we are happy with how it went and we hope you like it too thanks.",
      { serviceType: "driveway", serviceArea: "Park Slope" },
    );
    expect(r.issues).toContain("value_prop_missing");
  });
});
