import { getDocsDescription, getDocsMetadata, getDocsPath } from "@/lib/docs-metadata";

describe("docs metadata helpers", () => {
  it("builds default-locale docs paths without a locale prefix", () => {
    expect(getDocsPath("en")).toBe("/docs");
    expect(getDocsPath("en", ["quickstart"])).toBe("/docs/quickstart");
  });

  it("falls back to a generic English description when a page omits one", () => {
    expect(getDocsDescription("en", "Quickstart")).toBe(
      "Quickstart documentation from Brago Docs.",
    );
  });

  it("returns canonical metadata for English docs pages", () => {
    const metadata = getDocsMetadata({
      locale: "en",
      slug: ["quickstart"],
      title: "Quickstart",
    });

    expect(metadata.title).toBe("Quickstart | Brago Docs");
    expect(metadata.description).toBe(
      "Quickstart documentation from Brago Docs.",
    );
    expect(metadata.alternates?.canonical).toBe(
      "http://localhost:3000/docs/quickstart",
    );
    expect(metadata.alternates?.languages).toEqual({
      en: "http://localhost:3000/docs/quickstart",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Quickstart | Brago Docs",
      locale: "en_US",
      url: "http://localhost:3000/docs/quickstart",
    });
  });
});
