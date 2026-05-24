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

  it("contains the review trust pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_review_trust");
  });

  it("returns a render function for pressure_driveway_review_trust", () => {
    const renderer = getRenderer("pressure_driveway_review_trust");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("contains the soft quote pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_soft_quote");
  });

  it("returns a render function for pressure_driveway_soft_quote", () => {
    const renderer = getRenderer("pressure_driveway_soft_quote");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("contains the neighborhood pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_neighborhood");
  });

  it("returns a render function for pressure_driveway_neighborhood", () => {
    const renderer = getRenderer("pressure_driveway_neighborhood");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("contains the project no pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_project_no");
  });

  it("returns a render function for pressure_driveway_project_no", () => {
    const renderer = getRenderer("pressure_driveway_project_no");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("contains the portfolio split pressure washing template", () => {
    expect(getRegisteredTemplateIds()).toContain("pressure_driveway_portfolio_split");
  });

  it("returns a render function for pressure_driveway_portfolio_split", () => {
    const renderer = getRenderer("pressure_driveway_portfolio_split");
    expect(renderer).not.toBeNull();
    expect(typeof renderer).toBe("function");
  });

  it("has 8 registered pressure washing templates in total", () => {
    const ids = getRegisteredTemplateIds();
    const pwTemplates = ids.filter((id) => id.startsWith("pressure_"));
    expect(pwTemplates).toHaveLength(8);
  });
});
