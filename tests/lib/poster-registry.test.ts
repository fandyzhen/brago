import { getRenderer, getRegisteredTemplateIds } from "@/lib/server/poster-templates/registry";

describe("poster template registry", () => {
  it("contains the first pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_hero_split");
  });

  it("returns a render function for a valid template id", () => {
    const renderer = getRenderer("pressure_driveway_hero_split");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("returns null for an unknown template id", () => {
    const renderer = getRenderer("nonexistent_template_id");
    expect(renderer).toBeNull();
  });

  it("contains the stacked pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_stacked");
  });

  it("returns a render function for pressure_driveway_stacked", () => {
    const renderer = getRenderer("pressure_driveway_stacked");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("contains the local share pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_local_share");
  });

  it("returns a render function for pressure_driveway_local_share", () => {
    const renderer = getRenderer("pressure_driveway_local_share");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });
});
