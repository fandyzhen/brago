import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  makeThumbnail,
  renderGoogleCrop,
  standardizePhoto,
} from "@/lib/brago/image-processing";

async function makeJpeg(
  width: number,
  height: number,
  background = "#888888",
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background,
    },
  })
    .jpeg()
    .toBuffer();
}

describe("brago image-processing", () => {
  it("standardizes large photos down to <= maxEdge JPEG", async () => {
    const input = await makeJpeg(4000, 3000);
    const out = await standardizePhoto(input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(2048);
  });

  it("makeThumbnail produces a small JPEG", async () => {
    const input = await makeJpeg(3000, 2000);
    const out = await makeThumbnail(input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(560);
  });

  it("renderGoogleCrop outputs a 1080×1080 JPEG", async () => {
    const input = await makeJpeg(2400, 1600, "#cccccc");
    const out = await renderGoogleCrop(
      input,
      { xPct: 10, yPct: 10, widthPct: 80, heightPct: 80 },
      { outputEdge: 1080 },
    );
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
    expect(meta.format).toBe("jpeg");
  });

  it("renderGoogleCrop throws on invalid input", async () => {
    await expect(renderGoogleCrop(Buffer.from([]), {
      xPct: 0,
      yPct: 0,
      widthPct: 100,
      heightPct: 100,
    })).rejects.toThrow();
  });
});
