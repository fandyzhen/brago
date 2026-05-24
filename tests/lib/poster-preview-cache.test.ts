import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setBatch,
  getBatch,
  deleteBatch,
  markIndexUsed,
  cleanupExpired,
  _resetForTests,
} from "@/lib/server/poster-preview-cache";

const sampleEntry = () => ({
  userId: "user_1",
  beforeDataUrl: "data:image/png;base64,AAA",
  afterDataUrl: "data:image/png;base64,BBB",
  headline: "Driveway Cleaned",
  description: "Cleaned in 3 hours",
  brandFields: {
    businessName: "Smith Pressure",
    isLicensed: false,
    isInsured: false,
  },
  items: [
    { templateId: "t1", name: "T1", thumbnailDataUrl: "data:image/png;base64,XXX" },
  ],
});

describe("poster-preview-cache", () => {
  beforeEach(() => _resetForTests());

  it("stores and retrieves a batch by id", () => {
    setBatch("batch_1", sampleEntry());
    const got = getBatch("batch_1");
    expect(got?.userId).toBe("user_1");
    expect(got?.items.length).toBe(1);
    expect(got?.usedIndices.size).toBe(0);
  });

  it("returns undefined for expired batch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    setBatch("batch_old", sampleEntry());
    vi.setSystemTime(new Date("2026-01-01T00:31:00Z")); // 31min later, past 30min TTL
    expect(getBatch("batch_old")).toBeUndefined();
    vi.useRealTimers();
  });

  it("cleanupExpired removes only past-TTL entries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    setBatch("batch_old", sampleEntry());
    vi.setSystemTime(new Date("2026-01-01T00:20:00Z"));
    setBatch("batch_new", sampleEntry());
    vi.setSystemTime(new Date("2026-01-01T00:31:00Z"));
    cleanupExpired();
    expect(getBatch("batch_old")).toBeUndefined();
    expect(getBatch("batch_new")).toBeDefined();
    vi.useRealTimers();
  });

  it("markIndexUsed appends to usedIndices + downloadedDataUrls", () => {
    setBatch("batch_2", sampleEntry());
    markIndexUsed("batch_2", 0, "data:image/png;base64,HIRES");
    const got = getBatch("batch_2");
    expect(got?.usedIndices.has(0)).toBe(true);
    expect(got?.downloadedDataUrls.get(0)).toBe("data:image/png;base64,HIRES");
  });

  it("evicts oldest when over LRU cap", () => {
    for (let i = 0; i < 205; i++) setBatch(`b${i}`, sampleEntry());
    // Cap is 200; the earliest 5 should be gone
    expect(getBatch("b0")).toBeUndefined();
    expect(getBatch("b4")).toBeUndefined();
    expect(getBatch("b5")).toBeDefined();
    expect(getBatch("b204")).toBeDefined();
  });

  it("deleteBatch removes the entry", () => {
    setBatch("batch_3", sampleEntry());
    deleteBatch("batch_3");
    expect(getBatch("batch_3")).toBeUndefined();
  });
});
