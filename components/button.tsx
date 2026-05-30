import { cn } from "@/lib/utils";
import React from "react";

type ButtonOwnProps<T extends React.ElementType> = {
  children?: React.ReactNode;
  className?: string;
  variant?: "simple" | "outline" | "primary" | "accent";
  size?: "sm" | "md" | "lg";
  as?: T;
};

type ButtonProps<T extends React.ElementType> = ButtonOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ButtonOwnProps<T>>;

export function Button<T extends React.ElementType = "button">({
  children,
  className,
  variant = "primary",
  size = "md",
  as,
  ...props
}: ButtonProps<T>) {
  const Tag = (as ?? "button") as React.ElementType;

  const base =
    "relative z-10 inline-flex items-center justify-center rounded-xl font-semibold tracking-tight transition-all duration-200 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  // Generous tap targets — sized for a thumb on a phone, not just a mouse.
  const sizeClass =
    size === "sm"
      ? "text-sm px-3.5 py-2 gap-1.5"
      : size === "lg"
      ? "text-base md:text-lg px-6 py-3.5 gap-2"
      : "text-sm md:text-base px-5 py-2.5 gap-2";

  const variantClass =
    variant === "simple"
      ? "rounded-full bg-transparent font-medium text-foreground hover:bg-hover hover:text-hover-foreground"
      : variant === "outline"
      ? "border-2 border-foreground/15 bg-card text-foreground hover:border-foreground/30 hover:bg-hover"
      : variant === "accent"
      ? "border border-brand/60 bg-brand text-brand-foreground shadow-tactile hover:-translate-y-0.5 hover:brightness-[1.04]"
      : // primary (ink)
        "border border-foreground/10 bg-primary text-primary-foreground shadow-tactile hover:-translate-y-0.5";

  return (
    <Tag className={cn(base, variantClass, sizeClass, className)} {...props}>
      {children ?? `Get Started`}
    </Tag>
  );
}
