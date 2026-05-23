import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/posters/caption/route";
import * as sessionModule from "@/lib/auth/session";
import * as chatModule from "@/lib/volcano-engine/chat";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/volcano-engine/chat");

const mockUser = {
  id: "user-1",
  emailVerified: true,
  banned: false,
  banExpires: null,
  role: "user",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sessionModule.getActiveSessionUser).mockResolvedValue({
    ok: true,
    user: mockUser,
  });
});

function makeCaptionRequest(body: Record<string, string> = {}) {
  return new Request("http://localhost/api/posters/caption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/posters/caption", () => {
  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(sessionModule.getActiveSessionUser).mockResolvedValue({
      ok: false,
      error: "Unauthorized",
      status: 401,
    });

    const res = await POST(makeCaptionRequest({ industry: "pressure_washing" }));
    expect(res.status).toBe(401);
  });

  it("returns headlines array and caption string on success", async () => {
    vi.mocked(chatModule.createChatCompletion).mockResolvedValue({
      id: "test-id",
      object: "chat.completion",
      created: 1234567890,
      model: "doubao-1-5-thinking-pro-250415",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              headlines: [
                "Driveway Fully Restored",
                "Before & After — Done Right",
                "Cleaned. Ready to Impress.",
              ],
              caption:
                "Just finished this driveway transformation in Austin, TX. Pressure washing at its finest!",
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });

    const res = await POST(
      makeCaptionRequest({
        industry: "pressure_washing",
        serviceType: "driveway",
        channel: "google_business_profile",
        businessName: "Austin Power Wash",
        serviceArea: "Austin, TX",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.headlines)).toBe(true);
    expect(data.headlines).toHaveLength(3);
    expect(typeof data.caption).toBe("string");
    expect(data.caption.length).toBeGreaterThan(0);
  });

  it("returns 500 when LLM call fails", async () => {
    vi.mocked(chatModule.createChatCompletion).mockRejectedValue(
      new Error("API error")
    );

    const res = await POST(
      makeCaptionRequest({ industry: "pressure_washing" })
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 when LLM returns invalid JSON", async () => {
    vi.mocked(chatModule.createChatCompletion).mockResolvedValue({
      id: "test-id",
      object: "chat.completion",
      created: 1234567890,
      model: "doubao-1-5-thinking-pro-250415",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "not valid json at all",
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
    });

    const res = await POST(
      makeCaptionRequest({ industry: "pressure_washing" })
    );
    expect(res.status).toBe(500);
  });
});
