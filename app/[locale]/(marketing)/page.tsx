import { Container } from "@/components/container";
import { Hero } from "@/components/hero";
import { Button } from "@/components/button";
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
    title: "Brago — Google-ready posts from finished job photos",
    description: t("description"),
  });
}

const INDUSTRIES = [
  {
    slug: "/industries/pressure-washing-marketing",
    name: "Pressure Washing",
    accent: "#1E5EFF",
    scenes: ["Driveways", "Patios", "Siding", "Walkways"],
  },
  {
    slug: "/industries/auto-detailing-marketing",
    name: "Auto Detailing",
    accent: "#F59E0B",
    scenes: ["Interior Detail", "Pet Hair", "Exterior Shine", "Mobile"],
  },
  {
    slug: "/industries/cleaning-marketing",
    name: "Cleaning",
    accent: "#22C55E",
    scenes: ["Carpet", "Move-out", "Window", "Commercial"],
  },
];

const HOW_IT_WORKS = [
  { step: "1", label: "Upload job photos", detail: "1–10 from today's job. Phone photos work great." },
  { step: "2", label: "Brago picks the best after shot", detail: "Strongest image, auto-cropped square for Google." },
  { step: "3", label: "Write a Google-safe caption", detail: "Sounds like you. No salesy filler, no AI clichés." },
  { step: "4", label: "Copy and paste to Google", detail: "You stay in control. No auto-posting." },
];

const TRUST = [
  {
    title: "Real job photos, not stock",
    body: "Brago works with your actual job photos. The real after shot does the marketing for you — that's the point of a Google Business Profile photo.",
  },
  {
    title: "Google-safe by default",
    body: "Captions stay within Google's posting rules. No phone numbers in the text, no URLs, no salesy AI clichés.",
  },
  {
    title: "You stay in control",
    body: "Brago drafts the post. You review and paste it into Google yourself. No platform tokens, no auto-posting, no risk to your profile.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
      <span className="h-2 w-2 rounded-full bg-brand" />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div className="relative">
      <Hero />

      <Container className="flex flex-col items-center">
        {/* Industries */}
        <section className="w-full py-16 md:py-24">
          <div className="mb-10 max-w-xl">
            <Eyebrow>Industries</Eyebrow>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Built for your trade
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Templates and captions matched to your specific job type — not generic social media posts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((industry) => (
              <Link
                key={industry.slug}
                href={industry.slug}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-tactile"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: industry.accent }}
                  />
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-brand">
                    View →
                  </span>
                </div>
                <p className="mt-4 font-display text-xl font-bold text-foreground">{industry.name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {industry.scenes.map((scene) => (
                    <span
                      key={scene}
                      className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/70"
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
        <section className="w-full border-t border-border py-16 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              From job photos to a Google-ready post
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              No design work. No platform login. Just upload today&apos;s job and copy the result to Google.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-display text-base font-bold text-brand-foreground">
                  {s.step}
                </div>
                <p className="mt-4 font-semibold text-foreground">{s.label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="w-full border-t border-border py-16 md:py-24">
          <div className="grid gap-8 md:grid-cols-3">
            {TRUST.map((item) => (
              <div key={item.title} className="border-l-2 border-brand pl-5">
                <h3 className="font-display text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </Container>

      {/* Bottom CTA */}
      <div className="bg-paper-glow relative border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Turn today&apos;s finished job into a Google post
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
            Upload the photos, get a Google-ready post, copy and paste it to your Google Business Profile. Free to try.
          </p>
          <Button
            as={Link}
            href="/free-google-post-generator"
            variant="accent"
            size="lg"
            className="mt-8"
          >
            Create a free Google post
          </Button>
        </div>
      </div>
    </div>
  );
}
