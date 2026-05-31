import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const docsRoot = path.join(process.cwd(), "content", "docs");

function collectDocFiles(dir: string, prefix = ""): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const relativePath = prefix ? path.posix.join(prefix, entry.name) : entry.name;
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectDocFiles(absolutePath, relativePath);
    }

    if (!entry.name.endsWith(".mdx")) return [];

    return [relativePath];
  });
}

describe("docs content", () => {
  it("ships English-only docs (no leftover .zh.mdx files)", () => {
    const files = collectDocFiles(docsRoot);
    const chineseFiles = files.filter((file) => file.endsWith(".zh.mdx"));
    expect(chineseFiles).toEqual([]);
    expect(files.length).toBeGreaterThan(0);
  });

  it("keeps the root docs navigation aligned with the shipped guides", () => {
    const meta = JSON.parse(
      readFileSync(path.join(docsRoot, "meta.json"), "utf8"),
    ) as { pages: string[] };

    expect(meta.pages).toEqual([
      "index",
      "quickstart",
      "project-structure",
      "environment",
      "---Getting Started---",
      "auth",
      "payments",
      "ai",
      "email",
      "admin",
      "---Guides---",
      "deployment",
      "customization",
      "troubleshooting",
    ]);
  });

  it("ships an English docs landing page", () => {
    const englishIndex = readFileSync(path.join(docsRoot, "index.mdx"), "utf8");
    expect(englishIndex).toContain("title: Introduction");
    expect(englishIndex).toContain("[Quickstart](./quickstart)");
  });

  it("uses locale-safe relative links for internal docs references", () => {
    const docFiles = collectDocFiles(docsRoot);

    for (const file of docFiles) {
      const content = readFileSync(path.join(docsRoot, file), "utf8");
      expect(content).not.toMatch(/\]\(\/docs\//);
    }
  });
});
