import sharp from "sharp";

const WATERMARK_WIDTH = 1080;
const WATERMARK_HEIGHT = 64;

function buildWatermarkSvg(): Buffer {
  const svg = `<svg width="${WATERMARK_WIDTH}" height="${WATERMARK_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WATERMARK_WIDTH}" height="${WATERMARK_HEIGHT}" fill="rgba(0,0,0,0.55)" />
  <text
    x="${WATERMARK_WIDTH / 2}"
    y="${WATERMARK_HEIGHT / 2 + 9}"
    font-family="sans-serif"
    font-size="22"
    font-weight="600"
    fill="rgba(255,255,255,0.9)"
    text-anchor="middle"
    dominant-baseline="middle"
  >brago.app · Upgrade to remove watermark</text>
</svg>`;
  return Buffer.from(svg);
}

export async function applyWatermark(pngBuffer: Buffer): Promise<Buffer> {
  return sharp(pngBuffer)
    .composite([
      {
        input: buildWatermarkSvg(),
        top: WATERMARK_WIDTH - WATERMARK_HEIGHT,
        left: 0,
      },
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();
}
