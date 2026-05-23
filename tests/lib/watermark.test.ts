import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { applyWatermark } from "@/lib/server/watermark";

async function makeTestPng(width = 1080, height = 1080): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 200, g: 200, b: 200, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("applyWatermark", () => {
  it("returns a non-empty Buffer", async () => {
    const input = await makeTestPng();
    const result = await applyWatermark(input);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it("output is a valid PNG (correct magic bytes)", async () => {
    const input = await makeTestPng();
    const result = await applyWatermark(input);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50);
    expect(result[2]).toBe(0x4e);
    expect(result[3]).toBe(0x47);
  });

  it("output has same dimensions as input (1080x1080)", async () => {
    const input = await makeTestPng();
    const result = await applyWatermark(input);
    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
  });
});
