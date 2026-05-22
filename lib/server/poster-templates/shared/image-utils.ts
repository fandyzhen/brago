export function bufferToDataUrl(
  buffer: Buffer,
  mimeType: string = "image/jpeg"
): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type || "image/jpeg";
  return bufferToDataUrl(buffer, mimeType);
}
