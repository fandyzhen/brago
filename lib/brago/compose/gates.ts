import "server-only";
import sharp from "sharp";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_OUTPUT_BYTES,
} from "./constants";
import { passesThumbnailReadability } from "./overlay";

export type CompositeGateIssue =
  | "wrong_dimensions"
  | "file_too_large"
  | "thumbnail_text_unreadable"
  | "invalid_format";

export type CompositeGateResult = {
  ok: boolean;
  issues: CompositeGateIssue[];
};

export async function validateOutputImage(
  buf: Buffer,
  opts: { overlayText: string },
): Promise<CompositeGateResult> {
  const issues: CompositeGateIssue[] = [];

  if (buf.byteLength > MAX_OUTPUT_BYTES) issues.push("file_too_large");

  let meta: sharp.Metadata | null = null;
  try {
    meta = await sharp(buf, { failOn: "none" }).metadata();
  } catch {
    issues.push("invalid_format");
    return { ok: false, issues };
  }

  const w = meta?.width ?? 0;
  const h = meta?.height ?? 0;
  const tol = 0.05; // ±5%（spec §1.6）
  if (
    Math.abs(w - CANVAS_WIDTH) / CANVAS_WIDTH > tol ||
    Math.abs(h - CANVAS_HEIGHT) / CANVAS_HEIGHT > tol
  ) {
    issues.push("wrong_dimensions");
  }
  if (meta?.format !== "jpeg") issues.push("invalid_format");

  if (!passesThumbnailReadability(opts.overlayText)) {
    issues.push("thumbnail_text_unreadable");
  }

  return { ok: issues.length === 0, issues };
}
