// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(async () => ({ ok: true, user: { id: "user_1" } })),
}));

const { deductCreditsMock, refundCreditsMock, canUserAffordMock } = vi.hoisted(() => ({
  deductCreditsMock: vi.fn(),
  refundCreditsMock: vi.fn(),
  canUserAffordMock: vi.fn(),
}));
vi.mock("@/lib/credits", () => ({
  deductCredits: deductCreditsMock,
  refundCredits: refundCreditsMock,
  canUserAfford: canUserAffordMock,
  getUserCredits: vi.fn(async () => 100),
  getUserPlanKey: vi.fn(async () => "free"),
}));

vi.mock("@/lib/server/poster-templates/registry", () => ({
  getRenderer: vi.fn(() => () => ({ type: "div", props: { children: "stub" } })),
}));
vi.mock("@/lib/poster-templates/public-metadata", () => ({
  getTemplateById: vi.fn((id: string) => ({
    id,
    name: "T " + id,
    layoutFamily: "split",
    industry: "pressure_washing",
    channel: "google_business_profile",
    phoneDefault: "subtle",
  })),
}));
vi.mock("satori", () => ({ default: vi.fn(async () => "<svg/>") }));
vi.mock("sharp", () => ({
  default: () => ({
    png: () => ({ toBuffer: async () => Buffer.from("FULLHIRES") }),
    resize: () => ({ png: () => ({ toBuffer: async () => Buffer.from("FULLHIRES") }) }),
  }),
}));
vi.mock("@/lib/server/watermark", () => ({ applyWatermark: vi.fn(async (b: Buffer) => b) }));

const { postInsertMock, genHistoryInsertMock } = vi.hoisted(() => ({
  postInsertMock: vi.fn(),
  genHistoryInsertMock: vi.fn(),
}));
vi.mock("@/lib/db", async () => {
  const schema = await import("@/lib/db/schema");
  return {
    db: {
      insert: (table: unknown) => ({
        values: (row: unknown) => {
          if (table === schema.post) {
            postInsertMock(row);
          } else if (table === schema.generationHistory) {
            genHistoryInsertMock(row);
          }
          return Promise.resolve();
        },
      }),
    },
  };
});

import {
  setBatch,
  getBatch,
  _resetForTests,
} from "@/lib/server/poster-preview-cache";
import { POST } from "@/app/api/posters/finalize/route";

function seedBatch(id = "b1") {
  setBatch(id, {
    userId: "user_1",
    beforeDataUrl: "data:image/png;base64,AAA",
    afterDataUrl: "data:image/png;base64,BBB",
    headline: "Driveway Cleaned",
    description: "in 3 hours",
    brandFields: { businessName: "Smith", isLicensed: false, isInsured: false },
    items: [
      { templateId: "t1", name: "T1", thumbnailDataUrl: "data:image/png;base64,T" },
      { templateId: "t2", name: "T2", thumbnailDataUrl: "data:image/png;base64,T" },
      { templateId: "t3", name: "T3", thumbnailDataUrl: "data:image/png;base64,T" },
    ],
  });
}

function req(body: unknown): Request {
  return new Request("http://x/api/posters/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/posters/finalize", () => {
  beforeEach(() => {
    _resetForTests();
    deductCreditsMock.mockReset().mockResolvedValue({ success: true, remainingCredits: 90 });
    refundCreditsMock.mockReset().mockResolvedValue({ success: true, remainingCredits: 100 });
    canUserAffordMock.mockReset().mockResolvedValue(true);
    postInsertMock.mockReset();
    genHistoryInsertMock.mockReset();
    delete process.env.ENABLE_AI_FINALIZE;
  });

  it("returns 410 when batch is unknown", async () => {
    const res = await POST(req({ batchId: "missing", index: 0 }));
    expect(res.status).toBe(410);
  });

  it("returns 400 when index out of range", async () => {
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 5 }));
    expect(res.status).toBe(400);
  });

  it("flag=false: new index does NOT charge, writes post + history", async () => {
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.charged).toBe(0);
    expect(body.cachedHit).toBe(false);
    expect(body.url.startsWith("data:image/png;base64,")).toBe(true);
    expect(deductCreditsMock).not.toHaveBeenCalled();
    expect(postInsertMock).toHaveBeenCalledTimes(1);
    expect(genHistoryInsertMock).toHaveBeenCalledTimes(1);
  });

  it("flag=false: repeat same index returns cached dataURL, no post written", async () => {
    seedBatch();
    await POST(req({ batchId: "b1", index: 1 }));
    postInsertMock.mockReset();
    const res = await POST(req({ batchId: "b1", index: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cachedHit).toBe(true);
    expect(body.charged).toBe(0);
    expect(postInsertMock).not.toHaveBeenCalled();
  });

  it("flag=true: new index deducts 10 + writes post", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 0 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.charged).toBe(10);
    expect(deductCreditsMock).toHaveBeenCalledWith(
      "user_1",
      10,
      "poster_ai_finalize"
    );
    expect(postInsertMock).toHaveBeenCalledTimes(1);
  });

  it("flag=true: repeated same index does not re-charge (cache hit)", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    seedBatch();
    await POST(req({ batchId: "b1", index: 0 }));
    deductCreditsMock.mockReset();
    const res = await POST(req({ batchId: "b1", index: 0 }));
    const body = await res.json();
    expect(body.cachedHit).toBe(true);
    expect(body.charged).toBe(0);
    expect(deductCreditsMock).not.toHaveBeenCalled();
  });

  it("flag=true: insufficient credits returns 402, nothing written", async () => {
    process.env.ENABLE_AI_FINALIZE = "true";
    canUserAffordMock.mockResolvedValue(false);
    seedBatch();
    const res = await POST(req({ batchId: "b1", index: 0 }));
    expect(res.status).toBe(402);
    expect(deductCreditsMock).not.toHaveBeenCalled();
    expect(postInsertMock).not.toHaveBeenCalled();
  });

  it("flag=false: marks index used so a second index counts as a new finalize", async () => {
    seedBatch();
    await POST(req({ batchId: "b1", index: 0 }));
    await POST(req({ batchId: "b1", index: 2 }));
    const entry = getBatch("b1");
    expect(entry?.usedIndices.has(0)).toBe(true);
    expect(entry?.usedIndices.has(2)).toBe(true);
    expect(entry?.usedIndices.has(1)).toBe(false);
  });
});
