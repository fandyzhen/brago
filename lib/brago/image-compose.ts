import "server-only";
import sharp from "sharp";

const CANVAS = 1080;
const LABEL_HEIGHT = 64;

function labelSvg(text: string, side: "left" | "right"): Buffer {
  const half = CANVAS / 2;
  const baseX = side === "left" ? 24 : half + 24;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${LABEL_HEIGHT}">
  <rect x="${baseX - 12}" y="14" rx="8" ry="8" width="120" height="36" fill="rgba(0,0,0,0.55)"/>
  <text x="${baseX + 6}" y="40" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="600" fill="#ffffff">${text}</text>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

export async function composeBeforeAfterProof(
  beforeBuffer: Buffer,
  afterBuffer: Buffer,
  options: { edge?: number } = {},
): Promise<Buffer> {
  const edge = options.edge ?? CANVAS;
  const half = Math.floor(edge / 2);

  const beforeCrop = await sharp(beforeBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: half, height: edge, fit: "cover" })
    .modulate({ saturation: 1.04, brightness: 1.0 })
    .jpeg({ quality: 92 })
    .toBuffer();

  const afterCrop = await sharp(afterBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: half, height: edge, fit: "cover" })
    .modulate({ saturation: 1.04, brightness: 1.02 })
    .jpeg({ quality: 92 })
    .toBuffer();

  return sharp({
    create: {
      width: edge,
      height: edge,
      channels: 3,
      background: "#000000",
    },
  })
    .composite([
      { input: beforeCrop, top: 0, left: 0 },
      { input: afterCrop, top: 0, left: half },
      {
        input: labelSvg("Before", "left"),
        top: edge - LABEL_HEIGHT - 16,
        left: 0,
      },
      {
        input: labelSvg("After", "right"),
        top: edge - LABEL_HEIGHT - 16,
        left: 0,
      },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
}
