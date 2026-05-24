import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { NavBar } from "@/features/navigation/components/navbar";

export default function DemoLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Brago hides the upstream Sistine demos in all environments — they are not
  // a Brago product feature. Keep the underlying source code so we can still
  // reuse the volcano-engine / image generation infrastructure server-side.
  if (process.env.NEXT_PUBLIC_SHOW_SISTINE_DEMOS !== "true") {
    notFound();
  }
  return (
    <main className="min-h-screen">
      <NavBar />
      {children}
    </main>
  );
}
