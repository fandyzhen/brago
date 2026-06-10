import React from "react";
import { render, screen } from "@testing-library/react";
import messages from "@/messages/en.json";
import { Footer } from "@/components/footer";

function getNestedValue(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }

    return undefined;
  }, source);
}

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => {
    return (path: string) => {
      const value = getNestedValue(messages as Record<string, unknown>, path);

      if (typeof value !== "string") {
        throw new Error(`Missing translation for ${path}`);
      }

      return value;
    };
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<
    { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>
  >) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Footer", () => {
  it("includes the SceneSelf resource link as an external footer link", () => {
    render(<Footer />);

    expect(
      screen.getByRole("link", {
        name: "SceneSelf - AI photo dump generator",
      }),
    ).toHaveAttribute("href", "https://sceneself.com");
  });
});
