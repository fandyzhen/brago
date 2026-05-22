// @vitest-environment node
import { POST } from "@/app/api/posters/render/route";

// Mock satori 和 sharp，避免渲染真实 PNG 影响单元测试速度
vi.mock("satori", () => ({
  default: vi.fn().mockResolvedValue("<svg></svg>"),
}));

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
  })),
}));

// Mock fs.readFileSync for font loading
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    default: {
      ...(actual as unknown as Record<string, unknown>),
      readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-font")),
    },
    readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-font")),
  };
});

function makeFormData(overrides: Record<string, string | File> = {}): FormData {
  const formData = new FormData();
  const fakeFile = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
  formData.append("beforeImage", fakeFile);
  formData.append("afterImage", fakeFile);
  formData.append("templateId", "pressure_driveway_hero_split");
  formData.append("headline", "Test headline");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("POST /api/posters/render", () => {
  it("returns 400 when beforeImage is missing", async () => {
    const formData = makeFormData();
    formData.delete("beforeImage");
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when afterImage is missing", async () => {
    const formData = makeFormData();
    formData.delete("afterImage");
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when headline is missing", async () => {
    const formData = makeFormData();
    formData.delete("headline");
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 for an unknown templateId", async () => {
    const formData = makeFormData({ templateId: "not_a_real_template" });
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown templateid/i);
  });

  it("returns 200 with Content-Type image/png for valid input", async () => {
    const formData = makeFormData();
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 400 when image file exceeds 10MB", async () => {
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    const formData = makeFormData();
    formData.set("beforeImage", bigFile);
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/10mb/i);
  });

  it("returns 500 when satori throws", async () => {
    const { default: satoriMock } = await import("satori");
    (satoriMock as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("satori crash"));
    const formData = makeFormData();
    const req = new Request("http://localhost/api/posters/render", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/render failed/i);
  });
});
