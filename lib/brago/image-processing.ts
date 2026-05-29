import "server-only";
import sharp from "sharp";

export type StandardizeOptions = {
  maxEdge?: number;
  quality?: number;
  enhance?: boolean;
};

export async function standardizePhoto(
  input: Buffer,
  options: StandardizeOptions = {},
): Promise<Buffer> {
  const maxEdge = options.maxEdge ?? 2048;
  const quality = options.quality ?? 85;
  let pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  if ((meta.width ?? 0) > maxEdge || (meta.height ?? 0) > maxEdge) {
    pipeline = pipeline.resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  if (options.enhance) {
    pipeline = pipeline
      .modulate({ saturation: 1.05, brightness: 1.02 })
      .sharpen({ sigma: 0.6 });
  }
  return pipeline
    .jpeg({ quality, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
}

export async function makeThumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .withMetadata({})
    .toBuffer();
}

export type CropPct = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
};

export async function renderGoogleCrop(
  input: Buffer,
  crop: CropPct,
  options: { outputEdge?: number; enhance?: boolean } = {},
): Promise<Buffer> {
  const edge = options.outputEdge ?? 1080;
  const meta = await sharp(input).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (W === 0 || H === 0) {
    throw new Error("invalid image dimensions");
  }
  const left = Math.max(0, Math.round((crop.xPct / 100) * W));
  const top = Math.max(0, Math.round((crop.yPct / 100) * H));
  const width = Math.min(W - left, Math.round((crop.widthPct / 100) * W));
  const height = Math.min(H - top, Math.round((crop.heightPct / 100) * H));
  let pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .extract({ left, top, width, height })
    .resize({ width: edge, height: edge, fit: "cover" });
  if (options.enhance ?? true) {
    pipeline = pipeline
      .modulate({ saturation: 1.05, brightness: 1.02 })
      .sharpen({ sigma: 0.6 });
  }
  return pipeline
    .jpeg({ quality: 88, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
}
