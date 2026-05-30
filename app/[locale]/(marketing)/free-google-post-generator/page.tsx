import { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/i18n.config";
import { generatePageMetadata } from "@/lib/metadata";
import { Container } from "@/components/container";
import { FreeGeneratorClient } from "./client";

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return generatePageMetadata({
    locale,
    path: "/free-google-post-generator",
    title: "Free Google Business Post Generator for Pressure Washers",
    description:
      "Upload finished job photos and get a Google-safe Business Profile caption you can paste right in. No signup needed for the first draft.",
  });
}

export default function FreeGoogleGeneratorPage() {
  return (
    <div className="bg-paper-glow relative overflow-hidden">
      <Container className="relative z-20 py-16 md:py-24 max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Free tool
        </p>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
          Free Google Business Post Generator for Pressure Washers
        </h1>
        <p className="mt-4 text-muted-foreground">
          Pick a service type, tell us the neighborhood, and we&apos;ll draft a Google-safe caption you can paste straight into your Business Profile.
        </p>

        <FreeGeneratorClient />

        <section className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Want best-photo selection and history-aware wording?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Brago Local picks the strongest after shot from a batch, dedupes your last 10 posts so you don&apos;t sound repetitive, and emails a weekly reminder when your Google profile goes stale.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center rounded-xl bg-brand text-brand-foreground px-5 py-2.5 text-sm font-bold shadow-tactile transition-all hover:-translate-y-0.5"
          >
            Try full Brago with best photo selection
          </Link>
        </section>
      </Container>
    </div>
  );
}
