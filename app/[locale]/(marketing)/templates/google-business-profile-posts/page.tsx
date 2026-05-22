import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Google Business Profile Posts for Local Services | Brago",
  description:
    "Create Google Business Profile posts, formerly Google My Business posts, from finished job photos for pressure washing, detailing, cleaning, and other local services.",
};

const INDUSTRIES = [
  {
    name: "Pressure Washing",
    example: "Driveway, patio, and siding before/after posts with service area and review count.",
    href: "/industries/pressure-washing-marketing",
  },
  {
    name: "Auto Detailing",
    example: "Interior and exterior detail posts with mobile service area and trust badges.",
    href: "/industries/auto-detailing-marketing",
  },
];

const WHAT_TO_INCLUDE = [
  {
    label: "Before/after job photo",
    detail: "The visual proof. One clear before and one clear after from the same job.",
  },
  {
    label: "Short headline",
    detail: "18–32 characters. Specific to the job — not generic slogans.",
  },
  {
    label: "Service area",
    detail: "'Serving Austin, TX' — not a full street address.",
  },
  {
    label: "License & Insurance",
    detail: "One line is enough. Builds trust without taking over the visual.",
  },
  {
    label: "Phone number (optional)",
    detail: "Google posts can include your number. Brago shows it at readable size, never crammed.",
  },
  {
    label: "Review count (optional)",
    detail: "If you have Google reviews, add the number. Brago shows it as '★★★★★ 247 Google reviews'.",
  },
];

export default function GoogleBusinessProfilePostsPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="border-b border-border">
        <Container className="py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Templates
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Google Business Profile Posts for Local Services
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Create Google Business Profile posts — formerly Google My Business posts — from finished job photos.
              Built for pressure washing, auto detailing, cleaning, and other local service businesses.
            </p>
            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
              >
                Create a Google Business Profile post
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* What is a GBP post */}
      <Container className="py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              What Google Business Profile posts are — and what they&apos;re not
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Google Business Profile posts (previously called Google My Business posts) are updates you
              publish directly on your business profile — visible to anyone who finds you on Google Search
              or Maps.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Brago generates the post image and caption. You upload both in your Google Business Profile
              dashboard. Brago does not post directly — your account stays under your control.
            </p>
            <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-5">
              <p className="text-sm font-semibold text-foreground mb-2">What GBP posts do:</p>
              <ul className="space-y-2">
                {[
                  "Keep your profile active with recent work",
                  "Show potential customers real job results",
                  "Display your service area, reviews, and license",
                  "Give people a reason to choose you over competitors with no posts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-5">
              <p className="text-sm font-semibold text-foreground mb-2">What Brago does NOT promise:</p>
              <ul className="space-y-2">
                {[
                  "Guaranteed ranking improvements",
                  "Specific lead or review volume",
                  "Direct posting or scheduling to your account",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              What Brago includes in every GBP post
            </h3>
            <div className="space-y-3">
              {WHAT_TO_INCLUDE.map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-4">
                  <p className="font-medium text-foreground text-sm">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>

      {/* GBP vs other channels */}
      <div className="border-y border-border bg-secondary/30">
        <Container className="py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Google Business Profile posts vs. Facebook and Instagram
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
            Each channel is a different audience with a different expectation. Brago formats the same
            before/after job photos differently depending on where you&apos;re posting.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              {
                channel: "Google Business Profile",
                tone: "Professional and informative",
                best: "Showing your business is active, licensed, and serving your area",
                include: "Phone number, service area, review count, license/insurance",
                avoid: "Casual emojis, aggressive promotions, invented review counts",
              },
              {
                channel: "Facebook / Nextdoor",
                tone: "Conversational and local",
                best: "Neighborhood word-of-mouth, sharing recent local jobs",
                include: "Light CTA ('message us'), service area, natural language caption",
                avoid: "Formal tone, hard-sell language, too much contact info upfront",
              },
              {
                channel: "Instagram",
                tone: "Visual portfolio",
                best: "Building a consistent body of work over time",
                include: "Visual-first layout, short caption, minimal phone number",
                avoid: "Long captions, too many trust badges competing with the photo",
              },
            ].map((ch) => (
              <div key={ch.channel} className="rounded-2xl border border-border bg-background p-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                  {ch.channel}
                </p>
                <p className="text-sm font-semibold text-foreground mb-2">Tone: {ch.tone}</p>
                <p className="text-xs text-muted-foreground mb-3"><strong>Best for:</strong> {ch.best}</p>
                <p className="text-xs text-muted-foreground mb-1"><strong>Include:</strong> {ch.include}</p>
                <p className="text-xs text-muted-foreground"><strong>Avoid:</strong> {ch.avoid}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* Industry links */}
      <Container className="py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          GBP post examples by industry
        </h2>
        <p className="mt-3 text-muted-foreground">
          Brago has industry-specific templates for each type of local service job.
        </p>
        <div className="mt-8 grid md:grid-cols-2 gap-5">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.name}
              href={industry.href}
              className="group rounded-2xl border border-border p-6 hover:border-foreground/20 hover:shadow-md transition-all"
            >
              <p className="font-semibold text-foreground group-hover:text-foreground transition-colors">
                {industry.name}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{industry.example}</p>
              <p className="mt-3 text-xs font-medium text-foreground/60 group-hover:text-foreground transition-colors">
                See {industry.name} templates →
              </p>
            </Link>
          ))}
        </div>
      </Container>

      {/* CTA */}
      <div className="border-t border-border">
        <Container className="py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Create a Google Business Profile post from your next job
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Upload before/after photos, set up your brand profile once, and generate a post in under 60 seconds.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-4 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
            >
              Create your first post — it&apos;s free
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <Link href="/industries/pressure-washing-marketing" className="hover:text-foreground transition-colors">
              Pressure Washing Marketing →
            </Link>
            <Link href="/industries/auto-detailing-marketing" className="hover:text-foreground transition-colors">
              Auto Detailing Marketing →
            </Link>
          </div>
        </Container>
      </div>
    </div>
  );
}
