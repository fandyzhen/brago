import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Templates | Brago",
  description:
    "Before/after post templates for Google Business Profile, Facebook, Nextdoor, and Instagram. Built for pressure washing, auto detailing, and other local services.",
};

const CHANNELS = [
  {
    slug: "google-business-profile-posts",
    name: "Google Business Profile",
    description:
      "Formal, trust-forward posts for your GBP profile. Includes service area, review count, license and insurance. Formerly called Google My Business posts.",
    format: "1080 × 1080",
    tone: "Professional",
    available: true,
  },
  {
    slug: "facebook-nextdoor-before-after-posts",
    name: "Facebook / Nextdoor",
    description:
      "Community-sharing posts that feel like a genuine job update, not an ad. Great for local neighborhood reach and word-of-mouth.",
    format: "1080 × 1080",
    tone: "Conversational",
    available: false,
  },
  {
    slug: "instagram-before-after-posts",
    name: "Instagram Feed",
    description:
      "Portfolio-style posts that let the before/after photo do the talking. Minimal contact info, visual-first layout.",
    format: "1080 × 1080",
    tone: "Visual-first",
    available: false,
  },
];

const INDUSTRIES = [
  { name: "Pressure Washing", href: "/industries/pressure-washing-marketing", available: true },
  { name: "Auto Detailing", href: "/industries/auto-detailing-marketing", available: true },
  { name: "Carpet Cleaning", href: "/industries", available: false },
  { name: "Lawn Care", href: "/industries", available: false },
  { name: "Window Cleaning", href: "/industries", available: false },
];

export default function TemplatesPage() {
  return (
    <Container className="py-20 md:py-32">
      {/* Header */}
      <div className="grid items-center gap-10 lg:grid-cols-[28rem_20rem] lg:justify-center lg:gap-16">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Templates
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Before/after post templates
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for specific channels and industries. You pick where you&apos;re posting — Brago picks the
            right format, tone, and information density.
          </p>
        </div>
        {/* Visual proof — a real Brago-rendered template output */}
        <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
          <div className="rounded-[28px] border border-border bg-card p-2.5 shadow-tactile">
            <div className="overflow-hidden rounded-[20px] border border-border">
              <div className="relative aspect-square">
                <Image
                  src="/hero/cases/park-slope-kitchen.jpg"
                  alt="Example Brago-rendered Google Business Profile post template output."
                  fill
                  sizes="(max-width: 1024px) 24rem, 20rem"
                  className="object-cover"
                />
              </div>
              <div className="border-t border-border px-4 py-3">
                <p className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Template output
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Google Business Profile · 1080 × 1080
                </p>
              </div>
            </div>
          </div>
          <span className="absolute -left-3 -top-3 rounded-full border border-brand/40 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground shadow-sm">
            Real render
          </span>
        </div>
      </div>

      {/* How templates work */}
      <div className="mt-16 rounded-2xl border border-border bg-secondary/40 p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              How Brago templates work
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              You don&apos;t browse and pick a template. You answer two questions — where are you posting, and
              how many before/after areas — and Brago selects the right one automatically. Every template
              outputs a 1080 × 1080 PNG ready to post.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", t: "Pick the channel", d: "Google, Facebook/Nextdoor, or Instagram." },
              { n: "2", t: "Brago picks the layout", d: "Based on photo count and information density." },
              { n: "3", t: "Download the PNG", d: "1080 × 1080, ready to post — no editing needed." },
            ].map((s) => (
              <li
                key={s.n}
                className="flex flex-col rounded-xl border border-border bg-card p-4"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-brand-foreground">
                  {s.n}
                </span>
                <p className="mt-3 text-sm font-semibold leading-tight text-foreground">
                  {s.t}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Channel templates */}
      <h2 className="mt-16 text-2xl font-display font-extrabold text-foreground">By channel</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {CHANNELS.map((ch) => (
          <div key={ch.name} className="relative">
            {ch.available ? (
              <Link
                href={`/templates/${ch.slug}`}
                className="group block h-full rounded-2xl border border-border bg-background p-6 transition-all hover:border-foreground/20 hover:shadow-md"
              >
                <ChannelCard ch={ch} />
              </Link>
            ) : (
              <div className="block h-full rounded-2xl border border-border bg-background/50 p-6 opacity-60">
                <ChannelCard ch={ch} comingSoon />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Industry links */}
      <h2 className="mt-16 text-2xl font-display font-extrabold text-foreground">By industry</h2>
      <p className="mt-2 text-muted-foreground text-sm">
        Each industry has its own set of templates with industry-appropriate scenes and examples.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {INDUSTRIES.map((industry) =>
          industry.available ? (
            <Link
              key={industry.name}
              href={industry.href}
              className="inline-flex items-center px-5 py-2.5 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              {industry.name}
            </Link>
          ) : (
            <span
              key={industry.name}
              className="inline-flex items-center px-5 py-2.5 rounded-full border border-border bg-background text-sm font-medium text-muted-foreground opacity-50"
            >
              {industry.name} <span className="ml-2 text-xs">(soon)</span>
            </span>
          )
        )}
      </div>

      {/* CTA */}
      <div className="mt-20 rounded-2xl border border-border bg-secondary/50 p-8 md:p-12 text-center">
        <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground">
          Start with your next finished job
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Upload before/after photos and get a post ready for Google Business Profile, Facebook, Nextdoor, or Instagram in under 60 seconds.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
        >
          Create your first post
        </Link>
      </div>
    </Container>
  );
}

function ChannelCard({
  ch,
  comingSoon,
}: {
  ch: (typeof CHANNELS)[0];
  comingSoon?: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="font-semibold text-foreground text-sm">{ch.name}</p>
        {comingSoon && (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2 py-0.5">
            Coming soon
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{ch.description}</p>
      <div className="mt-4 flex gap-3">
        <span className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
          {ch.format}
        </span>
        <span className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
          {ch.tone}
        </span>
      </div>
    </>
  );
}
