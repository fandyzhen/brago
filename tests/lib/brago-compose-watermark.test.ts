import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  buildWatermarkLayer,
  type WatermarkInput,
} from "@/lib/brago/compose/watermark";

async function makePng(w: number, h: number, bg: string): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 4, background: bg },
  })
    .png()
    .toBuffer();
}

describe("buildWatermarkLayer", () => {
  it("returns null when neither logo nor businessName is provided (no Brago watermark)", async () => {
    const r = await buildWatermarkLayer({ logo: null, businessName: null });
    expect(r).toBeNull();
  });

  it("returns a sharp composite descriptor when logo is provided", async () => {
    const logo = await makePng(400, 200, "#ff0000");
    const r = await buildWatermarkLayer({ logo, businessName: null });
    expect(r).not.toBeNull();
    expect(r?.input).toBeInstanceOf(Buffer);
    // 应位于右下角
    expect(r?.gravity).toBe("southeast");
  });

  it("falls back to text watermark when only businessName is provided", async () => {
    const r = await buildWatermarkLayer({
      logo: null,
      businessName: "American Dream Pressure Washing",
    });
    expect(r).not.toBeNull();
    expect(r?.input).toBeInstanceOf(Buffer);
    // svg-based text watermark — verify it includes the business name
    const svg = (r?.input as Buffer).toString("utf-8");
    expect(svg).toContain("American Dream");
  });

  it("truncates business names over 30 chars with ellipsis", async () => {
    const long = "A".repeat(45);
    const r = await buildWatermarkLayer({ logo: null, businessName: long });
    const svg = (r?.input as Buffer).toString("utf-8");
    expect(svg).toMatch(/A{27}…|A{27}\.\.\./);
  });

  it("never injects the string 'Brago' anywhere", async () => {
    const r = await buildWatermarkLayer({
      logo: null,
      businessName: "Joe's Cleaning",
    });
    const svg = (r?.input as Buffer).toString("utf-8");
    expect(svg.toLowerCase()).not.toContain("brago");
  });
});
