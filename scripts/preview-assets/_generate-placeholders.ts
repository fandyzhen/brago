/**
 * One-off helper: generate 4 placeholder before/after sample jpegs
 * used by scripts/generate-template-previews.ts as raw image input.
 *
 * Run: pnpm tsx scripts/preview-assets/_generate-placeholders.ts
 *
 * Output: scripts/preview-assets/{pressure,detail}-{before,after}.jpg
 */
import { writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "scripts/preview-assets");

type Spec = {
  filename: string;
  // dominant gradient colors
  c1: { r: number; g: number; b: number };
  c2: { r: number; g: number; b: number };
  label: string;
};

const SPECS: Spec[] = [
  {
    filename: "pressure-before.jpg",
    c1: { r: 90, g: 80, b: 65 }, // dirty grey-brown concrete
    c2: { r: 60, g: 52, b: 42 },
    label: "BEFORE",
  },
  {
    filename: "pressure-after.jpg",
    c1: { r: 210, g: 210, b: 215 }, // clean light concrete
    c2: { r: 180, g: 180, b: 188 },
    label: "AFTER",
  },
  {
    filename: "detail-before.jpg",
    c1: { r: 70, g: 55, b: 45 }, // muddy interior
    c2: { r: 45, g: 35, b: 28 },
    label: "BEFORE",
  },
  {
    filename: "detail-after.jpg",
    c1: { r: 30, g: 30, b: 32 }, // detailed black leather
    c2: { r: 15, g: 15, b: 17 },
    label: "AFTER",
  },
];

const SIZE = 1024;

async function gen(spec: Spec) {
  const w = SIZE;
  const h = SIZE;
  // Build a vertical gradient pixel buffer
  const buf = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const r = Math.round(spec.c1.r + (spec.c2.r - spec.c1.r) * t);
    const g = Math.round(spec.c1.g + (spec.c2.g - spec.c1.g) * t);
    const b = Math.round(spec.c1.b + (spec.c2.b - spec.c1.b) * t);
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      // Add small noise for non-flat look
      const noise = ((x * 7 + y * 13) % 17) - 8;
      buf[idx] = Math.max(0, Math.min(255, r + noise));
      buf[idx + 1] = Math.max(0, Math.min(255, g + noise));
      buf[idx + 2] = Math.max(0, Math.min(255, b + noise));
    }
  }

  const svgLabel = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="40" width="220" height="56" rx="28" fill="rgba(0,0,0,0.75)" />
      <text x="150" y="78" text-anchor="middle" font-family="Inter, sans-serif"
            font-size="28" font-weight="700" letter-spacing="4" fill="#ffffff">
        ${spec.label}
      </text>
    </svg>`;

  const jpg = await sharp(buf, { raw: { width: w, height: h, channels: 3 } })
    .composite([{ input: Buffer.from(svgLabel), top: 0, left: 0 }])
    .jpeg({ quality: 86 })
    .toBuffer();

  const outPath = path.join(OUT, spec.filename);
  writeFileSync(outPath, jpg);
  console.log(`✓ ${spec.filename} (${jpg.length} bytes)`);
}

async function main() {
  for (const spec of SPECS) {
    await gen(spec);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
