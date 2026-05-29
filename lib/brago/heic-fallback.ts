import "server-only";
import heicConvert from "heic-convert";

export async function convertHeicToJpegBuffer(
  input: Buffer,
  quality = 0.85,
): Promise<Buffer> {
  // heic-convert v2 types are picky about Buffer<ArrayBufferLike>. Pass a
  // fresh Uint8Array view to satisfy the declared `ArrayBufferLike` shape.
  const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const output = await heicConvert({
    buffer: view as unknown as ArrayBufferLike,
    format: "JPEG",
    quality,
  });
  return Buffer.from(output as unknown as ArrayBuffer);
}

export function isHeicMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return (
    m === "image/heic" ||
    m === "image/heif" ||
    m === "image/heic-sequence" ||
    m === "image/heif-sequence"
  );
}

export function isHeicFilename(name: string | null | undefined): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.endsWith(".heic") || lower.endsWith(".heif");
}
