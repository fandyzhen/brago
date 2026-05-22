/* eslint-disable @next/next/no-img-element */
import React from "react";
import { render, screen } from "@testing-library/react";
import messages from "@/messages/en.json";
import { Hero } from "@/components/hero";

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
  useTranslations: (namespace?: string) => {
    const root = namespace
      ? (getNestedValue(messages as Record<string, unknown>, namespace) as Record<string, unknown>)
      : (messages as Record<string, unknown>);

    return (path: string) => {
      const value = getNestedValue(root, path);

      if (typeof value !== "string") {
        throw new Error(`Missing translation for ${namespace ?? "root"}:${path}`);
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
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; priority?: boolean }) => {
    const { alt, src, priority, ...imgProps } = props;
    void priority;

    return <img alt={alt} src={src} {...imgProps} />;
  },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_target, tag) => {
        return (props: React.PropsWithChildren<Record<string, unknown>>) => {
          const {
            children,
            initial,
            animate,
            exit,
            transition,
            ...elementProps
          } = props;

          void initial;
          void animate;
          void exit;
          void transition;

          return React.createElement(
            typeof tag === "string" ? tag : "div",
            elementProps,
            children
          );
        };
      },
    }
  ),
}));

describe("Hero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Brago hero badge, heading, and channel chips", () => {
    render(<Hero />);

    expect(
      screen.getByText("⚡ Before/after posts in 60 seconds")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 1, name: "Let your work brag." })
    ).toBeInTheDocument();

    expect(screen.getByText("Google Business Profile")).toBeInTheDocument();
    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.getByText("Nextdoor")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
  });

  it("primary CTA links to /en/dashboard and secondary CTA links to /en/industries", () => {
    render(<Hero />);

    const primaryCta = screen.getByRole("link", { name: "Create Your First Post" });
    expect(primaryCta).toHaveAttribute("href", "/en/dashboard");

    const secondaryCta = screen.getByRole("link", { name: /See examples/i });
    expect(secondaryCta).toHaveAttribute("href", "/en/industries");
  });

  it("does not render a course-community modal or Get Code button", () => {
    render(<Hero />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get Code" })).not.toBeInTheDocument();
  });
});
