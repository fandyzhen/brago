import { describe, expect, it, vi, beforeEach } from "vitest";

const handles = vi.hoisted(() => ({
  selectPost: vi.fn(async () => [] as Array<Record<string, unknown>>),
  selectPhotos: vi.fn(async () => [] as Array<Record<string, unknown>>),
  copyR2: vi.fn(async (src: string, dest: string) => `https://r2/${dest}`),
}));

vi.mock("@/lib/db", () => {
  const createDb = () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => handles.selectPost()),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
    transaction: vi.fn(async (fn: (tx: ReturnType<typeof createDb>) => Promise<void>) => {
      const tx = createDb();
      return fn(tx);
    }),
  });
  const db = createDb();
  return { db };
});

vi.mock("@/lib/brago/r2-upload", () => ({
  copyR2Object: handles.copyR2,
  keyFromPublicUrl: (u: string) => (u.startsWith("https://r2/") ? u.slice("https://r2/".length) : null),
  buildClaimedKey: (userId: string, postId: string, photoId: string, suffix: string) =>
    `claimed/${userId}/${postId}/${photoId}_${suffix}`,
}));

beforeEach(() => {
  Object.values(handles).forEach((m) => (m as { mockReset?: () => void }).mockReset?.());
});

import { claimAnonymousPost } from "@/lib/brago/anonymous/claim";

describe("claimAnonymousPost", () => {
  it("returns null when no post matches the anonId", async () => {
    handles.selectPost.mockResolvedValueOnce([]);
    const out = await claimAnonymousPost("user_new", "anon_missing");
    expect(out).toBeNull();
  });

  it("returns the claimed postId when a match exists", async () => {
    // First select for finding the post
    handles.selectPost.mockResolvedValueOnce([
      { id: "gp_1", anonId: "anon_1", userId: null },
    ]);
    // Second select for finding photos within the transaction
    handles.selectPost.mockResolvedValueOnce([]);
    const out = await claimAnonymousPost("user_new", "anon_1");
    expect(out).toBe("gp_1");
  });
});
