import sharp from "sharp";

// Watermark height scales with image width so it stays readable at both
// the 360px thumbnail size and the 1080px final size.
const WATERMARK_HEIGHT_RATIO = 64 / 1080;

function buildWatermarkSvg(width: number, height: number): Buffer {
  // Scale font size proportionally to height so the watermark stays legible
  // at thumbnail sizes without overflowing the strip.
  const fontSize = Math.max(10, Math.round(height * (22 / 64)));
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.55)" />
  <text
    x="${width / 2}"
    y="${height / 2 + Math.round(fontSize * 0.34)}"
    font-family="sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    fill="rgba(255,255,255,0.9)"
    text-anchor="middle"
    dominant-baseline="middle"
  >brago.ai · Upgrade to remove watermark</text>
</svg>`;
  return Buffer.from(svg);
}

export async function applyWatermark(pngBuffer: Buffer): Promise<Buffer> {
  // Read actual image dimensions instead of assuming 1080x1080 — preview
  // thumbnails are 360x360 and would have caused composite to throw
  // "Image to composite must have same dimensions or smaller".
  const meta = await sharp(pngBuffer).metadata();
  const imgWidth = meta.width ?? 1080;
  const imgHeight = meta.height ?? 1080;

  const stripHeight = Math.max(20, Math.round(imgWidth * WATERMARK_HEIGHT_RATIO));
  const top = Math.max(0, imgHeight - stripHeight);

  return sharp(pngBuffer)
    .composite([
      {
        input: buildWatermarkSvg(imgWidth, stripHeight),
        top,
        left: 0,
      },
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();
}
