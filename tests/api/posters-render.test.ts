// @vitest-environment node
import { POST } from "@/app/api/posters/render/route";

// ── 现有 mock（保留不变）──────────────────────────────────────────
vi.mock("satori", () => ({
  default: vi.fn().mockResolvedValue("<svg></svg>"),
}));

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
  })),
}));

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

// ── 新增 mock ─────────────────────────────────────────────────────
vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(),
}));

vi.mock("@/lib/credits", () => ({
  canUserAfford: vi.fn(),
  getUserCredits: vi.fn(),
  deductCredits: vi.fn(),
  getUserPlanKey: vi.fn(),
}));

vi.mock("@/lib/server/watermark", () => ({
  applyWatermark: vi.fn((buf: Buffer) => Promise.resolve(buf)),
}));

vi.mock("@/lib/server/r2-poster", () => ({
  uploadPosterToR2: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn() },
}));

import { getActiveSessionUser } from "@/lib/auth/session";
import { canUserAfford, getUserCredits, deductCredits, getUserPlanKey } from "@/lib/credits";
import { uploadPosterToR2 } from "@/lib/server/r2-poster";
import { db } from "@/lib/db";

// ── 默认 mock 值（登录成功、积分充足、R2 跳过）────────────────────
const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
  role: "user",
  banned: false,
  banExpires: null,
  emailVerified: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: true, user: MOCK_USER });
  vi.mocked(canUserAfford).mockResolvedValue(true);
  vi.mocked(getUserCredits).mockResolvedValue(100);
  vi.mocked(deductCredits).mockResolvedValue({ success: true, remainingCredits: 90 });
  vi.mocked(getUserPlanKey).mockResolvedValue("starter_monthly"); // paid user by default
  vi.mocked(uploadPosterToR2).mockResolvedValue(null); // R2 not configured
  const insertChain = { values: vi.fn().mockResolvedValue([]) };
  vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);
});

// ── 工具函数 ──────────────────────────────────────────────────────
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

function makeRequest(fd: FormData): Request {
  return new Request("http://localhost/api/posters/render", {
    method: "POST",
    body: fd,
  });
}

// ── 原有验证测试（保持通过）──────────────────────────────────────
describe("POST /api/posters/render — validation", () => {
  it("returns 400 when beforeImage is missing", async () => {
    const fd = makeFormData();
    fd.delete("beforeImage");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 400 when afterImage is missing", async () => {
    const fd = makeFormData();
    fd.delete("afterImage");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 400 when headline is missing", async () => {
    const fd = makeFormData();
    fd.delete("headline");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 400 for an unknown templateId", async () => {
    const fd = makeFormData({ templateId: "not_a_real_template" });
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unknown templateid/i);
  });

  it("returns 400 when image file exceeds 10MB", async () => {
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    const fd = makeFormData();
    fd.set("beforeImage", bigFile);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/10mb/i);
  });
});

// ── 新增：auth & credits 测试 ─────────────────────────────────────
describe("POST /api/posters/render — auth & credits", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: false, error: "Unauthorized", status: 401 });
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it("returns 402 when user has insufficient credits", async () => {
    vi.mocked(canUserAfford).mockResolvedValue(false);
    vi.mocked(getUserCredits).mockResolvedValue(3);
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toMatch(/insufficient credits/i);
    expect(body.required).toBe(10);
    expect(body.available).toBe(3);
  });

  it("returns 500 and does NOT deduct credits when R2 upload throws", async () => {
    vi.mocked(uploadPosterToR2).mockRejectedValueOnce(new Error("R2 down"));
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(500);
    expect(deductCredits).not.toHaveBeenCalled();
  });
});

// ── 新增：成功路径测试 ────────────────────────────────────────────
describe("POST /api/posters/render — success path", () => {
  it("returns 200 PNG, calls deductCredits and writes post/pair/history rows on success", async () => {
    vi.mocked(uploadPosterToR2).mockResolvedValue("https://cdn.example.com/posters/user-123/abc.png");

    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(deductCredits).toHaveBeenCalledWith("user-123", 10, "poster_generation");
    // Phase 2: route writes 3 tables — post, postImagePair, generationHistory
    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it("still returns 200 PNG even when db.insert fails (degraded mode)", async () => {
    const badInsertChain = { values: vi.fn().mockRejectedValueOnce(new Error("DB down")) };
    vi.mocked(db.insert).mockReturnValueOnce(badInsertChain as unknown as ReturnType<typeof db.insert>);

    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("calls deductCredits and writes post/pair/history rows even when R2 returns null (not configured)", async () => {
    // uploadPosterToR2 returns null by default (from beforeEach) — R2 not configured
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(200);
    expect(deductCredits).toHaveBeenCalledWith("user-123", 10, "poster_generation");
    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it("returns 500 when satori throws", async () => {
    const { default: satoriMock } = await import("satori");
    (satoriMock as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("satori crash"));
    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/render failed/i);
  });
});
