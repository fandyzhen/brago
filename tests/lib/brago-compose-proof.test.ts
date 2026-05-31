import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { composeProofImage } from "@/lib/brago/compose/proof-image";

async function jpeg(w: number, h: number, bg: string): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: bg } })
    .jpeg()
    .toBuffer();
}

describe("composeProofImage", () => {
  it("renders a 1200×900 JPEG for before/after mode", async () => {
    const before = await jpeg(2000, 1500, "#222");
    const after = await jpeg(2000, 1500, "#ddd");
    const out = await composeProofImage({
      mode: "before_after",
      after,
      before,
      overlayText: "PARK SLOPE · DRIVEWAY",
      watermark: { logo: null, businessName: "Joe's Cleaning" },
    });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(900);
    expect(out.byteLength).toBeLessThan(5 * 1024 * 1024);
  });

  it("renders a 1200×900 JPEG for after-only mode", async () => {
    const after = await jpeg(2000, 1500, "#ddd");
    const out = await composeProofImage({
      mode: "single_after",
      after,
      overlayText: "PARK SLOPE · DRIVEWAY",
      watermark: { logo: null, businessName: null },
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(900);
  });

  it("never refuses if overlayText is empty", async () => {
    const after = await jpeg(2000, 1500, "#ddd");
    const out = await composeProofImage({
      mode: "single_after",
      after,
      overlayText: "",
      watermark: { logo: null, businessName: null },
    });
    expect(out.byteLength).toBeGreaterThan(0);
  });
});
