import { describe, expect, it, vi, beforeEach } from "vitest";

const handles = vi.hoisted(() => ({
  insertReturning: vi.fn(async () => [{ count: 1 }] as Array<{ count: number }>),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: handles.insertReturning,
        })),
      })),
    })),
  },
}));

beforeEach(() => {
  handles.insertReturning.mockReset();
  process.env.BETTER_AUTH_SECRET = "test-secret-32-chars-aaaaaaaaaaaaaaaa";
});

import { hashIp, assertTrialQuota, TrialQuotaExceededError } from "@/lib/brago/anonymous/quota";

describe("hashIp", () => {
  it("returns a stable hex string for same input", () => {
    const a = hashIp("1.2.3.4");
    const b = hashIp("1.2.3.4");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns different hashes for different IPs", () => {
    expect(hashIp("1.2.3.4")).not.toBe(hashIp("5.6.7.8"));
  });

  it("never returns the raw IP", () => {
    expect(hashIp("1.2.3.4")).not.toContain("1.2.3.4");
  });
});

describe("assertTrialQuota", () => {
  it("allows the first call with count=1", async () => {
    handles.insertReturning.mockResolvedValueOnce([{ count: 1 }]);
    await expect(
      assertTrialQuota({ ipHash: "h", anonId: "a1" }),
    ).resolves.toBeUndefined();
  });

  it("throws TrialQuotaExceededError when count > 1", async () => {
    handles.insertReturning.mockResolvedValueOnce([{ count: 2 }]);
    await expect(
      assertTrialQuota({ ipHash: "h", anonId: "a1" }),
    ).rejects.toBeInstanceOf(TrialQuotaExceededError);
  });
});
