// @vitest-environment node
import { GET, PUT } from "@/app/api/brand-profile/route";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser = { id: "user-123", email: "test@example.com" };

vi.mock("@/lib/auth/session", () => ({
  getActiveSessionUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Helper: fake session auth succeeds
function mockAuth() {
  vi.mocked(getActiveSessionUser).mockResolvedValue({
    ok: true,
    user: mockUser,
  } as ReturnType<typeof getActiveSessionUser> extends Promise<infer T> ? T : never);
}

// Helper: fake session auth fails
function mockAuthFail(status = 401) {
  vi.mocked(getActiveSessionUser).mockResolvedValue({
    ok: false,
    error: "Unauthorized",
    status,
  } as ReturnType<typeof getActiveSessionUser> extends Promise<infer T> ? T : never);
}

// Helper: build a chainable db.select mock
function mockDbSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);
  return chain;
}

function makeRequest(body?: unknown, method = "PUT"): NextRequest {
  return new NextRequest("http://localhost/api/brand-profile", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ── GET tests ────────────────────────────────────────────────────────────────

describe("GET /api/brand-profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuthFail(401);
    const req = new NextRequest("http://localhost/api/brand-profile", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns null when no brand profile exists", async () => {
    mockAuth();
    mockDbSelect([]);
    const req = new NextRequest("http://localhost/api/brand-profile", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.brandProfile).toBeNull();
  });

  it("returns brand profile when it exists", async () => {
    mockAuth();
    const profile = {
      id: "bp-1",
      userId: "user-123",
      businessName: "Clean Pro",
      phone: "555-1234",
      serviceArea: "Austin, TX",
      isLicensed: true,
      isInsured: true,
      logoUrl: null,
      googleReviewCount: 47,
    };
    mockDbSelect([profile]);
    const req = new NextRequest("http://localhost/api/brand-profile", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.brandProfile).toEqual(profile);
  });
});

// ── PUT tests ────────────────────────────────────────────────────────────────

describe("PUT /api/brand-profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuthFail(401);
    const res = await PUT(makeRequest({ businessName: "Test Co" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    mockAuth();
    const req = new NextRequest("http://localhost/api/brand-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when businessName exceeds 120 chars", async () => {
    mockAuth();
    const res = await PUT(makeRequest({ businessName: "a".repeat(121) }));
    expect(res.status).toBe(400);
  });

  it("creates new brand profile when none exists (insert path)", async () => {
    mockAuth();

    // SELECT returns empty (no existing profile)
    mockDbSelect([]);

    // INSERT chain mock
    const insertedRow = {
      id: expect.any(String),
      userId: "user-123",
      businessName: "Clean Pro",
      phone: "555-1234",
      serviceArea: "Austin, TX",
      isLicensed: true,
      isInsured: false,
      logoUrl: null,
      googleReviewCount: null,
    };
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([insertedRow]),
    };
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    const res = await PUT(makeRequest({
      businessName: "Clean Pro",
      phone: "555-1234",
      serviceArea: "Austin, TX",
      isLicensed: true,
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.brandProfile.businessName).toBe("Clean Pro");
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("updates existing brand profile when one exists (update path)", async () => {
    mockAuth();

    // SELECT returns existing profile
    mockDbSelect([{ id: "bp-1" }]);

    // UPDATE chain mock
    const updatedRow = {
      id: "bp-1",
      userId: "user-123",
      businessName: "Updated Name",
      phone: null,
      serviceArea: null,
      isLicensed: false,
      isInsured: false,
      logoUrl: null,
      googleReviewCount: null,
    };
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedRow]),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    const res = await PUT(makeRequest({ businessName: "Updated Name" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.brandProfile.businessName).toBe("Updated Name");
    expect(db.update).toHaveBeenCalledOnce();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("accepts googleReviewCount as integer", async () => {
    mockAuth();
    mockDbSelect([]);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "bp-2", googleReviewCount: 100 }]),
    };
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    const res = await PUT(makeRequest({ googleReviewCount: 100 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.brandProfile.googleReviewCount).toBe(100);
  });
});
