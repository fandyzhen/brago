import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Industries | Brago",
    description:
      "Google-ready posts for pressure washing, auto detailing, cleaning, and other local service businesses.",
  };
}

const INDUSTRIES = [
  {
    slug: "pressure-washing-marketing",
    name: "Pressure Washing",
    tagline: "Pressure washing Google posts",
    description:
      "Turn driveway, patio, siding, and walkway pressure washing jobs into Google-ready posts you can paste into your Google Business Profile.",
    accent: "#1E5EFF",
    scenes: ["Driveways", "Patios", "Siding", "Decks", "Walkways"],
    available: true,
  },
  {
    slug: "auto-detailing-marketing",
    name: "Auto Detailing",
    tagline: "Auto detailing Google posts",
    description:
      "Interior, pet hair removal, exterior shine, and mobile detailing jobs → Google-safe captions and best-photo selection.",
    accent: "#F59E0B",
    scenes: ["Interior Detail", "Pet Hair Removal", "Exterior Shine", "Wheels", "Mobile Detail"],
    available: true,
  },
  {
    slug: "cleaning-marketing",
    name: "Cleaning",
    tagline: "Cleaning Google posts",
    description:
      "Carpet cleaning, move-out, window cleaning, and commercial cleaning jobs into Google Business Profile posts.",
    accent: "#22C55E",
    scenes: ["Carpet", "Move-out", "Window", "Commercial", "Tile & Grout"],
    available: true,
  },
  {
    slug: "carpet-cleaning-marketing",
    name: "Carpet Cleaning",
    tagline: "Carpet cleaning marketing posts",
    description:
      "Show stain removal, high-traffic area refresh, and move-out cleaning results that drive new bookings.",
    accent: "#0F766E",
    scenes: ["Stain Removal", "High-Traffic Areas", "Stairs", "Room Refresh"],
    available: false,
  },
  {
    slug: "lawn-care-marketing",
    name: "Lawn Care",
    tagline: "Lawn care marketing posts",
    description:
      "Turn yard cleanups, mowing, and landscape transformations into trust-building posts your neighbors will notice.",
    accent: "#16a34a",
    scenes: ["Yard Cleanup", "Mowing", "Edging", "Seasonal Cleanup"],
    available: false,
  },
  {
    slug: "window-cleaning-marketing",
    name: "Window Cleaning",
    tagline: "Window cleaning marketing posts",
    description:
      "Before/after window cleaning posts that show the transformation clearly and attract new residential and commercial clients.",
    accent: "#0ea5e9",
    scenes: ["Residential Windows", "Commercial Windows", "Exterior Cleaning"],
    available: false,
  },
];

export default async function IndustriesPage() {
  return (
    <Container className="py-20 md:py-32">
      {/* Header */}
      <div className="max-w-2xl">
        <p className="mb-4 inline-flex items-center gap-2 font-display text-xs font-bold text-foreground uppercase tracking-[0.18em]">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Industries
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Google-ready posts for local service crews
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Brago turns finished job photos into Google Business Profile posts built for your specific trade.
          Pick your industry to see examples and how the workflow looks.
        </p>
      </div>

      {/* Industry grid */}
      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {INDUSTRIES.map((industry) => (
          <div key={industry.slug} className="relative">
            {industry.available ? (
              <Link
                href={`/industries/${industry.slug}`}
                className="group block h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-tactile"
              >
                <IndustryCard industry={industry} />
              </Link>
            ) : (
              <div className="block h-full rounded-2xl border border-border bg-background/50 p-6 opacity-60">
                <IndustryCard industry={industry} comingSoon />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="bg-paper-glow mt-20 rounded-2xl border border-border p-8 md:p-12 text-center">
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
          Turn today&apos;s job into a Google post
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Upload job photos, Brago picks the best after shot and writes a Google-safe caption you can paste right into your Business Profile.
        </p>
        <Link
          href="/free-google-post-generator"
          className="mt-6 inline-flex items-center px-6 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold shadow-tactile transition-all hover:-translate-y-0.5"
        >
          Create a free Google post
        </Link>
      </div>
    </Container>
  );
}

function IndustryCard({
  industry,
  comingSoon,
}: {
  industry: (typeof INDUSTRIES)[0];
  comingSoon?: boolean;
}) {
  return (
    <>
      {/* Accent dot */}
      <div
        className="w-3 h-3 rounded-full mb-4"
        style={{ backgroundColor: industry.accent }}
      />
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground transition-colors">
          {industry.name}
        </h2>
        {comingSoon && (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2 py-0.5">
            Coming soon
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {industry.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {industry.scenes.map((scene) => (
          <span
            key={scene}
            className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5"
          >
            {scene}
          </span>
        ))}
      </div>
    </>
  );
}
