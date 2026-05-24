// @vitest-environment node
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { applyWatermark } from "@/lib/server/watermark";

async function makeBlankPng(size: number): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 3, background: "#222" },
  })
    .png()
    .toBuffer();
}

describe("applyWatermark", () => {
  it("works on 360x360 thumbnails without throwing", async () => {
    // Regression: previously composite assumed 1080x1080 and threw
    // "Image to composite must have same dimensions or smaller"
    // when called from preview-batch (which renders at 360).
    const input = await makeBlankPng(360);
    const out = await applyWatermark(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(360);
    expect(meta.height).toBe(360);
  });

  it("works on 1080x1080 finals without throwing", async () => {
    const input = await makeBlankPng(1080);
    const out = await applyWatermark(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
  });

  it("darkens the bottom strip (watermark is placed there)", async () => {
    const input = await makeBlankPng(400);
    const out = await applyWatermark(input);
    const { data, info } = await sharp(out)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const x = Math.floor(info.width / 2);
    const y = info.height - 5;
    const idx = (y * info.width + x) * info.channels;
    // background was #222 (~34); watermark strip overlays 55% black → darker.
    expect(data[idx]).toBeLessThan(34);
  });
});
