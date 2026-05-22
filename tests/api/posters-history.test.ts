// @vitest-environment node
import { GET } from "@/app/api/posters/history/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const MOCK_USER = { id: "user-123", email: "test@example.com", role: "user", banned: false, banExpires: null, emailVerified: true };

function mockAuth() {
  vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: true, user: MOCK_USER });
}

function mockDbSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);
  return chain;
}

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/posters/history");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: "GET" });
}

describe("GET /api/posters/history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getActiveSessionUser).mockResolvedValue({ ok: false, error: "Unauthorized", status: 401 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns empty items when no history exists", async () => {
    mockAuth();
    mockDbSelect([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.hasMore).toBe(false);
    expect(body.nextCursor).toBeNull();
  });

  it("returns mapped items with correct fields", async () => {
    mockAuth();
    const row = {
      id: "hist-1",
      createdAt: new Date("2026-05-22T10:00:00Z"),
      prompt: "Driveway Clean",
      resultUrl: "https://cdn.example.com/posters/abc.png",
      creditsUsed: 10,
      metadata: JSON.stringify({ templateId: "pressure_driveway_hero_split", headline: "Driveway Clean" }),
      type: "poster",
      status: "completed",
    };
    mockDbSelect([row]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    const item = body.items[0];
    expect(item.id).toBe("hist-1");
    expect(item.headline).toBe("Driveway Clean");
    expect(item.templateId).toBe("pressure_driveway_hero_split");
    expect(item.templateName).toBe("Driveway Hero Split");
    expect(item.resultUrl).toBe("https://cdn.example.com/posters/abc.png");
    expect(item.creditsUsed).toBe(10);
    expect(item.createdAt).toBe("2026-05-22T10:00:00.000Z");
  });

  it("sets hasMore=true and nextCursor when more items exist", async () => {
    mockAuth();
    // Return 21 rows (limit defaults to 20, we fetch limit+1)
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `hist-${i}`,
      createdAt: new Date(`2026-05-22T${String(10 + i).padStart(2, "0")}:00:00Z`),
      prompt: `headline ${i}`,
      resultUrl: null,
      creditsUsed: 10,
      metadata: JSON.stringify({ templateId: "pressure_driveway_hero_split", headline: `headline ${i}` }),
      type: "poster",
      status: "completed",
    }));
    mockDbSelect(rows);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.items).toHaveLength(20);
    expect(body.hasMore).toBe(true);
    expect(body.nextCursor).not.toBeNull();
  });

  it("respects custom limit parameter", async () => {
    mockAuth();
    const chain = mockDbSelect([]);
    await GET(makeRequest({ limit: "5" }));
    // limit(6) called because we fetch limit+1
    expect(chain.limit).toHaveBeenCalledWith(6);
  });

  it("handles corrupted metadata gracefully", async () => {
    mockAuth();
    const row = {
      id: "hist-bad",
      createdAt: new Date("2026-05-22T10:00:00Z"),
      prompt: "Fallback headline",
      resultUrl: null,
      creditsUsed: 10,
      metadata: "NOT_VALID_JSON",
      type: "poster",
      status: "completed",
    };
    mockDbSelect([row]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].headline).toBe("Fallback headline"); // falls back to prompt
  });
});
