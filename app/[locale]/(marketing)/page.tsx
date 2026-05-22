import { Container } from "@/components/container";
import { Hero } from "@/components/hero";
import { Background } from "@/components/background";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n.config";
import { generatePageMetadata } from "@/lib/metadata";
import Link from "next/link";

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return generatePageMetadata({
    locale,
    path: "",
    title: "Brago - Before/After Marketing Posts for Local Services",
    description: t("description"),
  });
}

const INDUSTRIES = [
  {
    slug: "/industries/pressure-washing-marketing",
    name: "Pressure Washing",
    accent: "#1E5EFF",
    scenes: ["Driveways", "Patios", "Siding", "Decks"],
  },
  {
    slug: "/industries/auto-detailing-marketing",
    name: "Auto Detailing",
    accent: "#FFD63A",
    scenes: ["Interior Detail", "Pet Hair", "Exterior Shine", "Mobile"],
  },
];

const HOW_IT_WORKS = [
  { step: "1", label: "Upload job photos", detail: "Before and after. Phone photos work great." },
  { step: "2", label: "Choose service type", detail: "Pressure washing, detailing, and more." },
  { step: "3", label: "Pick where to post", detail: "Google, Facebook/Nextdoor, or Instagram." },
  { step: "4", label: "Download and post", detail: "Image + caption ready in under 60 seconds." },
];

export default function Home() {
  return (
    <div className="relative">
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <Background />
      </div>
      <Container className="flex min-h-screen flex-col items-center justify-between">
        <Hero />

        {/* Industries */}
        <section className="w-full py-20 md:py-28">
          <div className="max-w-xl mb-10">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Industries
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Built for your trade
            </h2>
            <p className="mt-3 text-muted-foreground">
              Templates and captions matched to your specific job type — not generic social media posts.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {INDUSTRIES.map((industry) => (
              <Link
                key={industry.slug}
                href={industry.slug}
                className="group rounded-2xl border border-border bg-background p-6 hover:border-foreground/20 hover:shadow-md transition-all"
              >
                <div
                  className="w-3 h-3 rounded-full mb-4"
                  style={{ backgroundColor: industry.accent }}
                />
                <p className="font-semibold text-foreground">{industry.name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {industry.scenes.map((scene) => (
                    <span
                      key={scene}
                      className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5"
                    >
                      {scene}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="w-full py-16 md:py-24 border-t border-border">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              From job photos to post in 60 seconds
            </h2>
            <p className="mt-3 text-muted-foreground">
              No design skills. No templates to browse. Just upload and go.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-foreground text-background font-bold text-sm flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <p className="font-semibold text-foreground text-sm">{s.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust section */}
        <section className="w-full py-16 md:py-24 border-t border-border">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Real photos, real results",
                body: "Brago works with actual job photos — not stock images or mockups. The before/after contrast does the marketing for you.",
              },
              {
                title: "No design skills needed",
                body: "You answer two questions. Brago handles the layout, headline, caption, and formatting for each channel.",
              },
              {
                title: "Your brand, your posts",
                body: "Set up your business name, service area, and trust badges once. Every post is consistent and professional.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </Container>

      {/* Bottom CTA */}
      <div className="relative border-t border-border bg-secondary/30">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Turn your next finished job into a marketing post
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Upload before/after photos. Get a polished post for Google, Facebook, Nextdoor, or Instagram.
            Free to start.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center px-8 py-4 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Create your first post — it&apos;s free
          </Link>
        </div>
      </div>
    </div>
  );
}
