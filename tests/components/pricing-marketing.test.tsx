import React from "react";
import { render, screen } from "@testing-library/react";
import pricingMessages from "@/messages/en.json";
import { Pricing } from "@/components/pricing";
import { PricingTable } from "@/app/[locale]/(marketing)/pricing/pricing-table";

const routerPushMock = vi.fn();

function getNestedValue(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }

    return undefined;
  }, source);
}

function interpolate(message: string, values?: Record<string, string | number>) {
  if (!values) {
    return message;
  }

  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value));
  }, message);
}

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => {
    const translate = (path: string, values?: Record<string, string | number>) => {
      const value = getNestedValue(pricingMessages.pricing as Record<string, unknown>, path);

      if (typeof value !== "string") {
        throw new Error(`Missing translation for ${path}`);
      }

      return interpolate(value, values);
    };

    translate.raw = (path: string) =>
      getNestedValue(pricingMessages.pricing as Record<string, unknown>, path);

    return translate;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: {
      user: null,
    },
  }),
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag) => {
        return ({
          children,
          initial,
          animate,
          exit,
          transition,
          layoutId,
          ...props
        }: React.PropsWithChildren<
          React.HTMLAttributes<HTMLElement> & {
            initial?: unknown;
            animate?: unknown;
            exit?: unknown;
            transition?: unknown;
            layoutId?: string;
          }
        >) => {
          void initial;
          void animate;
          void exit;
          void transition;
          void layoutId;
          return React.createElement(
            typeof tag === "string" ? tag : "div",
            props,
            children,
          );
        };
      },
    },
  ),
}));

describe("marketing pricing", () => {
  it("renders Free and Brago Local as the only two tiers", () => {
    render(<Pricing />);

    expect(screen.getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Brago Local" })).toBeInTheDocument();
    // Free price + Brago Local promo price (more than one $19 string is fine — promo card + checkout button)
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getAllByText(/\$19/).length).toBeGreaterThanOrEqual(1);
    // Old tiers must NOT come back
    expect(screen.queryByRole("heading", { name: "Pro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Crew" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Post Pack" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Enterprise" })).not.toBeInTheDocument();
  });

  it("comparison table compares Free vs Brago Local", () => {
    render(<PricingTable />);

    expect(screen.getByRole("columnheader", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Brago Local" })).toBeInTheDocument();
    expect(screen.getByText("3 total")).toBeInTheDocument();
    expect(screen.getByText("30 per month")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Pro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Crew" })).not.toBeInTheDocument();
  });
});
