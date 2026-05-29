import React from "react";
import { render, screen } from "@testing-library/react";
import { GooglePostCard } from "@/features/brago/dashboard/google-post-card";

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

describe("GooglePostCard", () => {
  it("renders service type + area + status + language", () => {
    render(
      <GooglePostCard
        id="p1"
        serviceType="driveway cleaning"
        serviceArea="South Austin"
        status="ready"
        language="en"
      />,
    );
    expect(screen.getByText("driveway cleaning")).toBeInTheDocument();
    expect(screen.getByText(/South Austin/)).toBeInTheDocument();
    expect(screen.getByTestId("status").textContent).toBe("Ready");
    expect(screen.getByTestId("lang").textContent).toBe("EN");
  });

  it("renders Posted label when the user marked it sent", () => {
    render(
      <GooglePostCard
        id="p2"
        serviceType="patio"
        serviceArea={null}
        status="posted_manually"
        language="es"
      />,
    );
    expect(screen.getByTestId("status").textContent).toBe("Posted");
    expect(screen.getByTestId("lang").textContent).toBe("ES");
  });

  it("links to the output page", () => {
    render(
      <GooglePostCard
        id="abc"
        serviceType="carpet cleaning"
        serviceArea="Plano"
        status="draft"
        language="en"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/google-posts/abc");
  });
});
