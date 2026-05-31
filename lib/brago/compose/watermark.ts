import "server-only";
import sharp from "sharp";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TEXT_WATERMARK_HEIGHT_PCT,
  TEXT_WATERMARK_OPACITY,
  WATERMARK_HEIGHT_PCT,
  WATERMARK_MARGIN_PCT,
  WATERMARK_OPACITY,
} from "./constants";

export type WatermarkInput = {
  logo: Buffer | null;
  businessName: string | null;
};

type CompositeDescriptor = {
  input: Buffer;
  gravity?: "southeast";
  top?: number;
  left?: number;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function buildLogoLayer(logo: Buffer): Promise<CompositeDescriptor> {
  const targetHeight = Math.round(
    CANVAS_HEIGHT * (WATERMARK_HEIGHT_PCT / 100),
  );
  // 先 resize，再查实际尺寸，保证 SVG overlay 完全匹配
  const resizedBuf = await sharp(logo, { failOn: "none" })
    .resize({ height: targetHeight, fit: "inside" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const { width: rw, height: rh } = await sharp(resizedBuf).metadata();
  const w = rw ?? 1;
  const h = rh ?? targetHeight;
  const withOpacity = await sharp(resizedBuf)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="white" fill-opacity="${WATERMARK_OPACITY}"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
  return { input: withOpacity, gravity: "southeast" };
}

function buildTextLayer(businessName: string): CompositeDescriptor {
  // 截断 + ellipsis
  let display = businessName.trim();
  if (display.length > 30) display = display.slice(0, 27) + "…";
  const fontPx = Math.round(CANVAS_HEIGHT * (TEXT_WATERMARK_HEIGHT_PCT / 100));
  const padding = Math.round(
    Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * (WATERMARK_MARGIN_PCT / 100),
  );
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
  <style>
    .wm { font: 800 ${fontPx}px Inter, "Helvetica Neue", Arial, sans-serif;
          fill: #ffffff; fill-opacity: ${TEXT_WATERMARK_OPACITY};
          stroke: #000000; stroke-width: 1.5; paint-order: stroke fill;
          text-anchor: end; }
  </style>
  <text x="${CANVAS_WIDTH - padding}" y="${CANVAS_HEIGHT - padding}" class="wm">${escapeXml(display)}</text>
</svg>`;
  return { input: Buffer.from(svg, "utf-8") };
}

export async function buildWatermarkLayer(
  input: WatermarkInput,
): Promise<CompositeDescriptor | null> {
  if (input.logo) return buildLogoLayer(input.logo);
  if (input.businessName && input.businessName.trim()) {
    return buildTextLayer(input.businessName);
  }
  return null;
}
