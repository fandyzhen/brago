import { describe, expect, it, vi, beforeEach } from "vitest";

const handles = vi.hoisted(() => ({
  selectLimit: vi.fn(async () => [] as Array<Record<string, unknown>>),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: handles.selectLimit,
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
  },
}));

beforeEach(() => {
  handles.selectLimit.mockReset();
  handles.selectLimit.mockResolvedValue([]);
});

import { getBrandVoice } from "@/lib/brago/brand-voice";
import { DEFAULT_BRAND_VOICE } from "@/lib/brago/types";

describe("getBrandVoice", () => {
  it("returns the default profile when no row exists", async () => {
    const voice = await getBrandVoice("user_unknown");
    expect(voice).toEqual(DEFAULT_BRAND_VOICE);
  });

  it("merges the stored JSON over the defaults", async () => {
    handles.selectLimit.mockResolvedValueOnce([
      {
        id: "v1",
        userId: "user_1",
        voiceJson: JSON.stringify({
          speaker: "crew",
          tone: ["casual"],
          avoid: [],
          customerLanguage: "es",
          serviceAreas: ["Houston"],
          verifiedClaims: { licensed: true },
          ctaStyle: "soft_contact",
        }),
        customerLanguage: "es",
      },
    ]);
    const voice = await getBrandVoice("user_1");
    expect(voice.speaker).toBe("crew");
    expect(voice.customerLanguage).toBe("es");
    expect(voice.verifiedClaims.licensed).toBe(true);
    expect(voice.ctaStyle).toBe("soft_contact");
  });

  it("falls back to default when JSON is corrupted", async () => {
    handles.selectLimit.mockResolvedValueOnce([{ voiceJson: "not-json" }]);
    const voice = await getBrandVoice("user_2");
    expect(voice).toEqual(DEFAULT_BRAND_VOICE);
  });
});
