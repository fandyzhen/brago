import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/brago/free-generator/route";

function makeReq(form: Record<string, string>): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(form)) fd.set(k, v);
  return new Request("http://localhost/api/brago/free-generator", {
    method: "POST",
    body: fd,
  });
}

describe("/api/brago/free-generator", () => {
  it("interpolates the city into the driveway template", async () => {
    const res = await POST(makeReq({ city: "South Austin", serviceType: "driveway" }) as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.caption).toContain("South Austin");
    expect(data.caption.toLowerCase()).toContain("driveway");
  });

  it("falls back to a generic neighborhood label when city missing", async () => {
    const res = await POST(makeReq({ serviceType: "patio" }) as never);
    const data = await res.json();
    expect(data.caption).toContain("your neighborhood");
  });

  it("falls back to the driveway template when service type is unknown", async () => {
    const res = await POST(makeReq({ serviceType: "unknown", city: "Plano" }) as never);
    const data = await res.json();
    expect(data.caption.toLowerCase()).toContain("driveway");
  });

  it("never embeds a phone number or URL", async () => {
    const res = await POST(makeReq({ serviceType: "driveway", city: "Austin" }) as never);
    const data = await res.json();
    expect(data.caption).not.toMatch(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);
    expect(data.caption).not.toMatch(/https?:\/\//);
  });
});
