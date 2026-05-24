/**
 * Render all registered poster templates to webp previews.
 *
 * Run with: pnpm tsx scripts/generate-template-previews.ts
 *
 * Outputs to: public/template-previews/<templateId>.webp
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import satori from "satori";
import sharp from "sharp";
import { getRenderer } from "../lib/server/poster-templates/registry";
import { POSTER_TEMPLATES } from "../lib/poster-templates/public-metadata";
import type { RenderInput } from "../lib/server/poster-templates/shared/types";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "template-previews");

function fileToDataUrl(filePath: string): string {
  const buf = readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buf.toString("base64")}`;
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

const pressureBefore = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/pressure-before.jpg"));
const pressureAfter = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/pressure-after.jpg"));
const detailBefore = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/detail-before.jpg"));
const detailAfter = fileToDataUrl(path.join(ROOT, "scripts/preview-assets/detail-after.jpg"));

function sampleInput(meta: (typeof POSTER_TEMPLATES)[number]): RenderInput {
  const isPressure = meta.industry === "pressure_washing";
  const before = isPressure ? pressureBefore : detailBefore;
  const after = isPressure ? pressureAfter : detailAfter;

  const headline = isPressure ? "Concrete restored, not replaced." : "Pet hair, gone.";

  const base: RenderInput = {
    beforeImageDataUrl: before,
    afterImageDataUrl: after,
    templateId: meta.id,
    headline,
    businessName: isPressure ? "Bright Wash Co" : "Mirror Mobile Detailing",
    phone: "(512) 555-0184",
    serviceArea: isPressure ? "Serving Austin, TX" : "Austin mobile detailing",
    isLicensed: true,
    isInsured: true,
    googleReviewCount: 247,
    projectNumber: 18,
  };

  if (meta.layoutFamily === "collage") {
    base.photoPairs = [
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "DRIVEWAY" : "INTERIOR" },
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "PATIO" : "EXTERIOR" },
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "SIDING" : "WHEELS" },
      { beforeImageDataUrl: before, afterImageDataUrl: after, areaLabel: isPressure ? "DECK" : "DETAIL" },
    ];
  }

  return base;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;

  for (const meta of POSTER_TEMPLATES) {
    const renderer = getRenderer(meta.id);
    if (!renderer) {
      console.error(`✗ no renderer for ${meta.id}`);
      fail += 1;
      continue;
    }

    try {
      const element = renderer(sampleInput(meta));
      const svg = await satori(element, { width: 1080, height: 1080, fonts });
      const webp = await sharp(Buffer.from(svg))
        .resize(720, 720)
        .webp({ quality: 82 })
        .toBuffer();
      const outPath = path.join(OUT_DIR, `${meta.id}.webp`);
      writeFileSync(outPath, webp);
      console.log(`✓ ${meta.id}`);
      ok += 1;
    } catch (err) {
      console.error(`✗ ${meta.id}: ${(err as Error).message}`);
      fail += 1;
    }
  }

  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
