"use client";
import Link from "next/link";
import React from "react";

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm mr-4 text-foreground px-2 py-1 relative z-20"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
      >
        {/* Camera body */}
        <rect x="2" y="7" width="20" height="14" rx="3" fill="currentColor" opacity="0.9" />
        {/* Lens */}
        <circle cx="12" cy="14" r="4" stroke="hsl(var(--background))" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" opacity="0.7" />
        {/* Flash bump */}
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="currentColor" opacity="0.7" />
        {/* Before/after divider line */}
        <line x1="12" y1="7" x2="12" y2="21" stroke="hsl(var(--background))" strokeWidth="1" opacity="0.5" />
      </svg>
      <span className="font-semibold text-foreground tracking-tight">Brago</span>
    </Link>
  );
};
