import { bufferToDataUrl, fileToDataUrl } from "@/lib/server/poster-templates/shared/image-utils";

describe("bufferToDataUrl", () => {
  it("produces a valid data URL with the given mime type", () => {
    const buffer = Buffer.from("fake-image-bytes");
    const result = bufferToDataUrl(buffer, "image/jpeg");
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.length).toBeGreaterThan("data:image/jpeg;base64,".length);
  });

  it("defaults to image/jpeg when mime type is omitted", () => {
    const buffer = Buffer.from("fake");
    const result = bufferToDataUrl(buffer);
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });
});

describe("fileToDataUrl", () => {
  it("converts a File to a base64 data URL", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    const file = new File([bytes], "test.png", { type: "image/png" });
    const result = await fileToDataUrl(file);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});
