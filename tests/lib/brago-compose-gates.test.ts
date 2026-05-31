import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { validateOutputImage } from "@/lib/brago/compose/gates";

async function jpeg(w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: "#888" } })
    .jpeg()
    .toBuffer();
}

describe("validateOutputImage", () => {
  it("passes a 1200×900 image under 5MB with readable overlay", async () => {
    const buf = await jpeg(1200, 900);
    const r = await validateOutputImage(buf, {
      overlayText: "PARK SLOPE · DRIVEWAY",
    });
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("fails when dimensions are off-spec", async () => {
    const buf = await jpeg(800, 800);
    const r = await validateOutputImage(buf, { overlayText: "X" });
    expect(r.ok).toBe(false);
    expect(r.issues).toContain("wrong_dimensions");
  });

  it("fails when overlay text would be illegible at 150px thumbnail", async () => {
    const buf = await jpeg(1200, 900);
    const r = await validateOutputImage(buf, {
      overlayText:
        "WAY WAY TOO MANY WORDS FOR A THUMBNAIL AT FIFTEEN ZERO PIXELS WIDE",
    });
    expect(r.ok).toBe(false);
    expect(r.issues).toContain("thumbnail_text_unreadable");
  });

  it("fails when byteLength exceeds 5MB", async () => {
    // 用 sharp 生成不太可能 >5MB 的 noise；改用直接构造一个大 buffer 注入伪测：
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 0xff);
    const r = await validateOutputImage(big, { overlayText: "OK" });
    expect(r.ok).toBe(false);
    expect(r.issues).toContain("file_too_large");
  });
});
