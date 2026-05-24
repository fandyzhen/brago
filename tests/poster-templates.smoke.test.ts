import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "@/lib/server/poster-templates/registry";
import { POSTER_TEMPLATES } from "@/lib/poster-templates/public-metadata";
import type { RenderInput } from "@/lib/server/poster-templates/shared/types";

const ROOT = process.cwd();

function dataUrl(p: string): string {
  const buf = readFileSync(path.join(ROOT, p));
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const fonts = [
  {
    name: "Inter",
    data: readFileSync(path.join(ROOT, "public/fonts/inter-regular.woff")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: readFileSync(path.join(ROOT, "public/fonts/jetbrains-mono-regular.woff")),
    weight: 400 as const,
    style: "normal" as const,
  },
];

describe("poster templates smoke", () => {
  it.each(POSTER_TEMPLATES)("renders $id without throwing", async (meta) => {
    const renderer = getRenderer(meta.id);
    expect(renderer).toBeTruthy();
    const isPressure = meta.industry === "pressure_washing";
    const before = dataUrl(isPressure ? "scripts/preview-assets/pressure-before.jpg" : "scripts/preview-assets/detail-before.jpg");
    const after = dataUrl(isPressure ? "scripts/preview-assets/pressure-after.jpg" : "scripts/preview-assets/detail-after.jpg");
    const input: RenderInput = {
      beforeImageDataUrl: before,
      afterImageDataUrl: after,
      templateId: meta.id,
      headline: "Concrete restored, not replaced.",
      businessName: "Test Co",
      phone: "(512) 555-0184",
      serviceArea: "Serving Austin, TX",
      isLicensed: true,
      isInsured: true,
      googleReviewCount: 247,
      projectNumber: 12,
    };
    if (meta.layoutFamily === "collage") {
      input.photoPairs = [
        { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A1" },
        { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A2" },
      ];
    }
    const element = renderer!(input);
    const svg = await satori(element, { width: 1080, height: 1080, fonts });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(png.byteLength).toBeGreaterThan(10_000);
  }, 30_000);

  it("renders multi-area templates with 4 pairs", async () => {
    const multiArea = POSTER_TEMPLATES.filter((t) => t.layoutFamily === "collage");
    expect(multiArea.length).toBeGreaterThanOrEqual(2);
    for (const meta of multiArea) {
      const renderer = getRenderer(meta.id)!;
      const isPressure = meta.industry === "pressure_washing";
      const before = dataUrl(isPressure ? "scripts/preview-assets/pressure-before.jpg" : "scripts/preview-assets/detail-before.jpg");
      const after = dataUrl(isPressure ? "scripts/preview-assets/pressure-after.jpg" : "scripts/preview-assets/detail-after.jpg");
      const input: RenderInput = {
        beforeImageDataUrl: before,
        afterImageDataUrl: after,
        templateId: meta.id,
        headline: "Multi-area job",
        photoPairs: [
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A1" },
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A2" },
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A3" },
          { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: "A4" },
        ],
      };
      const svg = await satori(renderer(input), { width: 1080, height: 1080, fonts });
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      expect(png.byteLength).toBeGreaterThan(10_000);
    }
  }, 60_000);
});
