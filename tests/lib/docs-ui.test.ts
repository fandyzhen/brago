import { docsI18n } from "@/lib/docs-i18n";
import { docsI18nUI, getDocsBaseOptions } from "@/lib/docs-ui";

describe("docs UI config", () => {
  it("only supports English docs", () => {
    expect(docsI18n.defaultLanguage).toBe("en");
    expect(docsI18n.languages).toEqual(["en"]);
    expect(docsI18n.hideLocale).toBe("default-locale");
  });

  it("builds a default docs nav url", () => {
    expect(getDocsBaseOptions("en").nav?.url).toBe("/docs");
  });

  it("provides English labels for the docs UI", () => {
    const enProvider = docsI18nUI.provider("en");
    expect(enProvider.locale).toBe("en");
    expect(enProvider.translations?.search).toBe("Search docs");
    expect(enProvider.locales?.map((item) => item.locale)).toEqual(["en"]);
  });
});
