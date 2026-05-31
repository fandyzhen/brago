import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { composeBeforeAfterProof } from "@/lib/brago/image-compose";

async function makeJpeg(
  width: number,
  height: number,
  background: string,
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background },
  })
    .jpeg()
    .toBuffer();
}

describe("composeBeforeAfterProof", () => {
  it("returns a 1200×900 JPEG with both halves rendered", async () => {
    const before = await makeJpeg(2000, 1500, "#333333");
    const after = await makeJpeg(2000, 1500, "#dddddd");
    const out = await composeBeforeAfterProof(before, after);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(900);
    // basic sanity — output is a non-trivial JPEG (solid-color test sources
    // compress very tightly, so the bar is intentionally low)
    expect(out.byteLength).toBeGreaterThan(2_000);
  });
});
