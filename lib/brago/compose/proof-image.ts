import "server-only";
import sharp from "sharp";
import {
  BEFORE_INSET_MARGIN_PCT,
  BEFORE_INSET_STROKE_PX,
  BEFORE_INSET_WIDTH_PCT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_OUTPUT_BYTES,
} from "./constants";
import { buildOverlaySvg } from "./overlay";
import { buildWatermarkLayer, type WatermarkInput } from "./watermark";

export type ProofComposeInput =
  | {
      mode: "single_after";
      after: Buffer;
      overlayText: string;
      watermark: WatermarkInput;
    }
  | {
      mode: "before_after";
      after: Buffer;
      before: Buffer;
      overlayText: string;
      watermark: WatermarkInput;
    };

async function fitToCanvas(buf: Buffer): Promise<Buffer> {
  return sharp(buf, { failOn: "none" })
    .rotate()
    .resize({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      fit: "cover",
      position: "attention",
    })
    // 仅允许色彩/曝光矫正（spec §1.1 — no "significant alteration"）
    .modulate({ saturation: 1.02, brightness: 1.0 })
    .toBuffer();
}

async function buildBeforeInset(before: Buffer): Promise<{
  buf: Buffer;
  width: number;
  height: number;
}> {
  const width = Math.round(CANVAS_WIDTH * (BEFORE_INSET_WIDTH_PCT / 100));
  const height = Math.round(width * (3 / 4)); // 与主图一致 4:3
  const cropped = await sharp(before, { failOn: "none" })
    .rotate()
    .resize({ width, height, fit: "cover", position: "attention" })
    .toBuffer();
  // 加 BEFORE 标签条 + 白色描边
  const labelHeight = Math.round(height * 0.22);
  const totalHeight = height + labelHeight;
  const composed = await sharp({
    create: {
      width,
      height: totalHeight,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([
      { input: cropped, top: labelHeight, left: 0 },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${labelHeight}">
             <rect width="${width}" height="${labelHeight}" fill="#c0291d"/>
             <text x="${width / 2}" y="${labelHeight * 0.72}" font-family="Inter, Arial, sans-serif" font-size="${Math.round(labelHeight * 0.55)}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">BEFORE</text>
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
  // 再外加 white stroke 边框
  const bordered = await sharp(composed)
    .extend({
      top: BEFORE_INSET_STROKE_PX,
      bottom: BEFORE_INSET_STROKE_PX,
      left: BEFORE_INSET_STROKE_PX,
      right: BEFORE_INSET_STROKE_PX,
      background: "#ffffff",
    })
    .png()
    .toBuffer();
  const meta = await sharp(bordered).metadata();
  return { buf: bordered, width: meta.width ?? width, height: meta.height ?? totalHeight };
}

async function ensureUnderLimit(buf: Buffer): Promise<Buffer> {
  if (buf.byteLength <= MAX_OUTPUT_BYTES) return buf;
  // 降到 q=80 再试，仍超则 q=72
  for (const q of [80, 72, 64]) {
    const out = await sharp(buf, { failOn: "none" })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    if (out.byteLength <= MAX_OUTPUT_BYTES) return out;
  }
  throw new Error("composed image exceeds 5MB even after compression");
}

export async function composeProofImage(
  input: ProofComposeInput,
): Promise<Buffer> {
  const base = await fitToCanvas(input.after);
  const composites: sharp.OverlayOptions[] = [];

  if (input.mode === "before_after") {
    const inset = await buildBeforeInset(input.before);
    const margin = Math.round(
      Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * (BEFORE_INSET_MARGIN_PCT / 100),
    );
    composites.push({
      input: inset.buf,
      top: CANVAS_HEIGHT - inset.height - margin,
      left: CANVAS_WIDTH - inset.width - margin,
    });
  }

  if (input.overlayText) {
    composites.push({ input: buildOverlaySvg(input.overlayText), top: 0, left: 0 });
  }

  const wm = await buildWatermarkLayer(input.watermark);
  if (wm) {
    if (wm.gravity) composites.push({ input: wm.input, gravity: wm.gravity });
    else composites.push({ input: wm.input, top: 0, left: 0 });
  }

  const composed = await sharp(base)
    .composite(composites)
    .jpeg({ quality: 88, mozjpeg: true })
    .withMetadata({})
    .toBuffer();

  return ensureUnderLimit(composed);
}
