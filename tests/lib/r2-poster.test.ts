// @vitest-environment node

vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn().mockImplementation(function () {
      return { send: mockSend };
    }),
    PutObjectCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

import { uploadPosterToR2 } from "@/lib/server/r2-poster";

function setEnv(overrides: Record<string, string>) {
  for (const [k, v] of Object.entries(overrides)) {
    process.env[k] = v;
  }
}
function clearStorageEnv() {
  delete process.env.STORAGE_BUCKET_NAME;
  delete process.env.STORAGE_ACCESS_KEY_ID;
  delete process.env.STORAGE_SECRET_ACCESS_KEY;
  delete process.env.STORAGE_ENDPOINT;
  delete process.env.STORAGE_PUBLIC_URL;
}

describe("uploadPosterToR2", () => {
  beforeEach(() => {
    clearStorageEnv();
    vi.clearAllMocks();
  });

  it("returns null when R2 env vars are not configured", async () => {
    const result = await uploadPosterToR2(Buffer.from("fake-png"), "user-123");
    expect(result).toBeNull();
  });

  it("returns null when only some env vars are set", async () => {
    setEnv({ STORAGE_BUCKET_NAME: "my-bucket" });
    const result = await uploadPosterToR2(Buffer.from("fake-png"), "user-123");
    expect(result).toBeNull();
  });

  it("uploads to R2 and returns public URL when fully configured", async () => {
    setEnv({
      STORAGE_BUCKET_NAME: "my-bucket",
      STORAGE_ACCESS_KEY_ID: "key123",
      STORAGE_SECRET_ACCESS_KEY: "secret456",
      STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      STORAGE_PUBLIC_URL: "https://cdn.example.com",
    });

    const { __mockSend } = await import("@aws-sdk/client-s3") as unknown as { __mockSend: ReturnType<typeof vi.fn> };
    __mockSend.mockResolvedValueOnce({});

    const result = await uploadPosterToR2(Buffer.from("fake-png"), "user-abc");

    expect(result).toMatch(/^https:\/\/cdn\.example\.com\/posters\/user-abc\//);
    expect(result).toMatch(/\.png$/);
    expect(__mockSend).toHaveBeenCalledOnce();
  });

  it("throws when S3 send fails", async () => {
    setEnv({
      STORAGE_BUCKET_NAME: "my-bucket",
      STORAGE_ACCESS_KEY_ID: "key123",
      STORAGE_SECRET_ACCESS_KEY: "secret456",
      STORAGE_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      STORAGE_PUBLIC_URL: "https://cdn.example.com",
    });

    const { __mockSend } = await import("@aws-sdk/client-s3") as unknown as { __mockSend: ReturnType<typeof vi.fn> };
    __mockSend.mockRejectedValueOnce(new Error("S3 network error"));

    await expect(uploadPosterToR2(Buffer.from("fake-png"), "user-abc")).rejects.toThrow("S3 network error");
  });
});
