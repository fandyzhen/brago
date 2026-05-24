// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock auth + credits + renderer + cache before importing the route
vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(async () => ({
    ok: true,
    user: { id: "user_1" },
  })),
}));

const { deductCreditsMock, canUserAffordMock } = vi.hoisted(() => ({
  deductCreditsMock: vi.fn(),
  canUserAffordMock: vi.fn(async () => true),
}));
vi.mock("@/lib/credits", () => ({
  deductCredits: deductCreditsMock,
  canUserAfford: canUserAffordMock,
  getUserCredits: vi.fn(async () => 100),
  getUserPlanKey: vi.fn(async () => "free"),
}));

vi.mock("@/lib/server/poster-templates/registry", () => ({
  getRenderer: vi.fn(() => () => ({ type: "div", props: { children: "stub" } })),
}));

vi.mock("@/lib/poster-templates/public-metadata", () => ({
  getTemplateById: vi.fn((id: string) =>
    id === "collage_x"
      ? { id, name: "C", layoutFamily: "collage" }
      : { id, name: "T " + id, layoutFamily: "split" }
  ),
}));

vi.mock("satori", () => ({
  default: vi.fn(async () => "<svg/>"),
}));
vi.mock("sharp", () => ({
  default: () => ({
    png: () => ({ resize: () => ({ toBuffer: async () => Buffer.from("PNGDATA") }) }),
    resize: () => ({ png: () => ({ toBuffer: async () => Buffer.from("PNGDATA") }) }),
  }),
}));

vi.mock("@/lib/server/watermark", () => ({
  applyWatermark: vi.fn(async (b: Buffer) => b),
}));

import { getBatch, _resetForTests } from "@/lib/server/poster-preview-cache";
import { POST } from "@/app/api/posters/preview-batch/route";

function makeFormRequest(): Request {
  const fd = new FormData();
  fd.set("headline", "Driveway Cleaned");
  fd.set("description", "Cleaned a driveway in 3 hours");
  fd.set("templateIds", JSON.stringify(["t1", "t2", "t3"]));
  fd.set("businessName", "Smith Pressure");
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  fd.set("beforeImage", new File([blob], "b.png", { type: "image/png" }));
  fd.set("afterImage", new File([blob], "a.png", { type: "image/png" }));
  return new Request("http://x/api/posters/preview-batch", { method: "POST", body: fd });
}

describe("/api/posters/preview-batch", () => {
  beforeEach(() => {
    _resetForTests();
    deductCreditsMock.mockReset();
    canUserAffordMock.mockReset().mockResolvedValue(true);
  });

  it("renders 3 thumbnails and writes a batch to cache WITHOUT deducting credits", async () => {
    const res = await POST(makeFormRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.batchId).toMatch(/.+/);
    expect(body.thumbnails).toHaveLength(3);
    for (const t of body.thumbnails) {
      expect(t.thumbnailDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    }
    expect(body.aiFinalizeEnabled).toBe(false);
    // NEVER calls deductCredits
    expect(deductCreditsMock).not.toHaveBeenCalled();

    // Cache written with original image dataURLs + brandFields
    const entry = getBatch(body.batchId);
    expect(entry?.userId).toBe("user_1");
    expect(entry?.headline).toBe("Driveway Cleaned");
    expect(entry?.description).toBe("Cleaned a driveway in 3 hours");
    expect(entry?.brandFields.businessName).toBe("Smith Pressure");
    expect(entry?.items).toHaveLength(3);
  });

  it("rejects a collage templateId", async () => {
    const fd = new FormData();
    fd.set("headline", "x");
    fd.set("templateIds", JSON.stringify(["collage_x"]));
    const blob = new Blob([new Uint8Array([1])], { type: "image/png" });
    fd.set("beforeImage", new File([blob], "b.png", { type: "image/png" }));
    fd.set("afterImage", new File([blob], "a.png", { type: "image/png" }));
    const req = new Request("http://x", { method: "POST", body: fd });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("exposes aiFinalizeEnabled=true when env flag is set", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    try {
      const res = await POST(makeFormRequest());
      const body = await res.json();
      expect(body.aiFinalizeEnabled).toBe(true);
    } finally {
      delete process.env.ENABLE_AI_FINALIZE;
    }
  });
});
