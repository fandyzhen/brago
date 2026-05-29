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
    accent: "#FFD63A",
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
  { step: "1", label: "Upload job photos", detail: "1-10 from today's job. Phone photos work great." },
  { step: "2", label: "Brago picks the best after shot", detail: "Strongest image, auto-cropped square for Google." },
  { step: "3", label: "Write a Google-safe caption", detail: "Sounds like you. No salesy filler, no AI clichés." },
  { step: "4", label: "Copy and paste to Google", detail: "You stay in control. No auto-posting." },
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
              From job photos to a Google-ready post
            </h2>
            <p className="mt-3 text-muted-foreground">
              No design work. No platform login. Just upload today&apos;s job and copy the result to Google.
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
                title: "Real job photos, not stock",
                body: "Brago works with actual job photos. The real after shot does the marketing for you — that's the point of a Google Business Profile photo.",
              },
              {
                title: "Google-safe by default",
                body: "Captions stay within Google's posting rules. No phone numbers in the text, no URLs, no salesy AI clichés.",
              },
              {
                title: "You stay in control",
                body: "Brago drafts the post. You review and paste it into Google yourself. No platform tokens, no auto-posting, no risk to your profile.",
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
            Turn today&apos;s finished job into a Google post
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Upload the photos, get a Google-ready post, copy and paste it to your Google Business Profile. Free to try.
          </p>
          <Link
            href="/free-google-post-generator"
            className="mt-8 inline-flex items-center px-8 py-4 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Create a free Google post
          </Link>
        </div>
      </div>
    </div>
  );
}
