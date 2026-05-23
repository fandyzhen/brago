import Link from "next/link";
import { Container } from "@/components/container";

const SECTIONS = [
  {
    heading: "1. Keep your Google Business Profile active with job photos",
    body: `Your Google Business Profile is where most local customers start. When someone searches "pressure washing near me," the businesses showing recent work photos get more clicks than those with empty profiles.

The simplest way to stay active: post a before/after photo within 24 hours of finishing a job. You don't need a campaign — one real photo beats any ad you could run. Brago turns your phone photos into a formatted post in about 60 seconds.

Include your service area, license status, and review count. Potential customers scanning local results treat this as a trust signal before they ever click your name.`,
  },
  {
    heading: "2. Post finished work on Facebook and Nextdoor — not ads",
    body: `On Facebook and Nextdoor, hard sell posts get ignored. Local job shares get saved, shared, and followed up on.

The difference is tone. "Finished this driveway in the neighborhood today — before and after says it all" gets more responses than "Pressure Washing Services — Call Now." You're sharing proof of work, not running an ad.

Consistency is what builds a local following. Crews that post one finished job per week build name recognition in their service areas without spending on boosted posts. Brago makes it fast enough to actually do every week.`,
  },
  {
    heading: "3. Ask for Google reviews after every job",
    body: `Reviews are your best long-term acquisition channel. A business with recent, specific reviews — "they did my driveway and back patio, quick and professional" — wins more jobs than one with older, generic ones.

Ask the same day you finish. A simple text or handoff card: "If you're happy with the work, a quick Google review helps us more than you know." Don't ask for five stars — just ask them to leave honest feedback.

More reviews also improve how your Google Business Profile ranks. Every review compounds.`,
  },
  {
    heading: "4. Build referrals through visible, memorable work",
    body: `Neighbors notice. A freshly washed driveway stands out on the street. Walkways and patios that look obviously cleaner prompt "who did that?" conversations.

You can accelerate this without doing anything extra. Just make sure the homeowner knows who you are and how to reach you. A small business card left at the door after a job — or a neighborhood-aware post on Nextdoor — turns one job into a thread of referrals over time.

The before/after post on Nextdoor serves double duty: it shows the work and makes your business name visible in the neighborhood where the job happened.`,
  },
  {
    heading: "5. Target seasonal and event-driven timing",
    body: `Driveways get washed before family gatherings, before listing a home, and after winter. Decks get done before summer. Siding gets attention when someone lists a house or repaints.

You don't need to know each homeowner's schedule. You need to be visible when the decision moment happens. Being the crew with consistent posts means your name comes up when someone finally decides to act.

Running a quick post that mentions "spring driveway prep" during March costs nothing and catches people who are already thinking about it.`,
  },
];

const HEADLINE_EXAMPLES = [
  "Driveway done. Ready for the weekend.",
  "Before & after — concrete restored.",
  "Patio pressure wash finished today.",
  "Eight years of buildup, gone.",
  "Siding washed, no streaks.",
];

const CAPTION_EXAMPLES = [
  {
    channel: "Google Business Profile",
    text: "Just finished a full driveway and walkway wash in the North Austin area. The concrete hadn't been cleaned in years — one job and it looks new. We're licensed and insured, serving Austin and surrounding areas. See our Google reviews and call for a free estimate.",
  },
  {
    channel: "Facebook / Nextdoor",
    text: "Another driveway done in the neighborhood! Before and after — this concrete hadn't been washed in years. If your driveway, patio, or siding could use some attention, send a message. Local, licensed, and insured. 📍 Austin, TX",
  },
];

export function HowToGetPressureWashingCustomers() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="border-b border-border">
        <Container className="py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Resources &middot; Pressure Washing
            </p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              How to Get Pressure Washing Customers
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Five practical methods that work for small, owner-operated pressure washing crews — without
              spending on lead generation services or ad budgets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
              >
                Create a proof post &rarr;
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* Main content */}
      <Container className="py-16 md:py-20">
        <div className="max-w-2xl space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">{section.heading}</h2>
              <div className="mt-4 space-y-3">
                {section.body.trim().split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed text-sm md:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>

      {/* Headline examples */}
      <div className="border-y border-border bg-secondary/30">
        <Container className="py-12 md:py-16">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Headline examples for pressure washing posts
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Short, specific, and believable. These go directly on your post image.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {HEADLINE_EXAMPLES.map((h) => (
              <span
                key={h}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
              >
                &ldquo;{h}&rdquo;
              </span>
            ))}
          </div>

          <h3 className="mt-10 text-lg font-bold text-foreground">Caption examples by channel</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Brago generates captions matched to the platform tone. Edit before posting.
          </p>
          <div className="mt-5 space-y-4">
            {CAPTION_EXAMPLES.map((ex) => (
              <div key={ex.channel} className="rounded-2xl border border-border bg-background p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                  {ex.channel}
                </p>
                <p className="text-sm text-foreground leading-relaxed">&ldquo;{ex.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* Related links */}
      <Container className="py-12 md:py-16">
        <h2 className="text-lg font-bold text-foreground">Related</h2>
        <div className="mt-4 space-y-2">
          <Link
            href="/industries/pressure-washing-marketing"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Pressure Washing Marketing Posts — templates and channel guide
          </Link>
          <Link
            href="/templates/google-business-profile-posts"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Google Business Profile post templates for local service businesses
          </Link>
          <Link
            href="/industries"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            All industries Brago supports
          </Link>
        </div>
      </Container>

      {/* CTA */}
      <div className="border-t border-border bg-secondary/30">
        <Container className="py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Turn your next finished job into a post
          </h2>
          <p className="mt-3 text-muted-foreground text-sm max-w-md mx-auto">
            Upload before/after photos. Brago handles the formatting. You get a post ready for
            Google, Facebook, Nextdoor, or Instagram in about 60 seconds.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Create your first post — free
          </Link>
        </Container>
      </div>
    </div>
  );
}
