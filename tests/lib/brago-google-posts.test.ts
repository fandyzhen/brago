import { describe, expect, it, vi, beforeEach } from "vitest";

const dbHandles = vi.hoisted(() => {
  const insertValues = vi.fn(async () => undefined);
  const updateSet = vi.fn();
  return {
    insertValues,
    updateSet,
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    select: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: dbHandles.insert,
    update: dbHandles.update,
    select: dbHandles.select,
  },
}));

beforeEach(() => {
  dbHandles.insertValues.mockClear();
  dbHandles.updateSet.mockClear();
  dbHandles.insert.mockClear();
  dbHandles.update.mockClear();
});

import { createGooglePost } from "@/lib/brago/google-posts";

describe("createGooglePost", () => {
  it("generates an id and forwards required defaults", async () => {
    const id = await createGooglePost({
      userId: "user_1",
      industry: "pressure_washing",
      serviceType: "driveway",
    });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(8);
    expect(dbHandles.insertValues).toHaveBeenCalledTimes(1);
    const call = dbHandles.insertValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.userId).toBe("user_1");
    expect(call.industry).toBe("pressure_washing");
    expect(call.serviceType).toBe("driveway");
    expect(call.status).toBe("draft");
    expect(call.imageMode).toBe("single_after");
    expect(call.language).toBe("en");
  });

  it("honors the language override", async () => {
    await createGooglePost({
      userId: "user_2",
      industry: "cleaning",
      serviceType: "carpet cleaning",
      language: "es",
    });
    const call = dbHandles.insertValues.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(call.language).toBe("es");
  });
});
