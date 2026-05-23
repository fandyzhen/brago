import Link from "next/link";
import { Container } from "@/components/container";

const SECTIONS = [
  {
    heading: "1. Before/after proof posts outperform traditional ads",
    body: `Traditional ads — flyers, directory listings, generic social posts — tell people you exist. A before/after photo shows them what you actually do. That difference matters when someone is choosing between three local businesses they don't know.

The photo is the ad. A driveway that was gray and stained is now clean concrete. Siding that looked old looks clean. You don't need to write anything persuasive — the comparison does the work.

Post finished jobs consistently, and you accumulate a visible track record. Potential customers who find your profile a month from now see a body of real work, not a logo and a phone number.`,
  },
  {
    heading: "2. Google Business Profile photo updates as free advertising",
    body: `Your Google Business Profile is ad inventory you already own. Every photo you post is visible to anyone who searches your business name or "pressure washing near me" in your area.

Businesses with recent, active photo libraries rank better in local results and get more profile visits. Each job photo you post increases that library — and unlike a paid ad, it stays there.

Keep the photos labeled with your service type and area where possible. "Driveway wash — [City]" in the photo description helps with local relevance. Brago formats your job photos into post-ready images with a headline and your branding automatically.`,
  },
  {
    heading: "3. Neighborhood-specific Nextdoor posts",
    body: `Nextdoor lets you target specific neighborhoods when you post. That means a job you finished on a street in one neighborhood can be visible to every other resident on that street and the surrounding blocks.

This is more precise than any paid local ad. The people seeing your post are the people most likely to need the same service on the same type of property in the same area.

The tone matters: post as a local business sharing finished work, not as an advertiser. "Finished this driveway in [neighborhood name] today — before and after" gets more engagement than "Now booking pressure washing jobs."`,
  },
  {
    heading: "4. Instagram for portfolio building",
    body: `Instagram is a visual portfolio. Each post you publish adds to a body of work that potential customers can scroll through when they find your profile.

You don't need a large following to get value from it. Even a small, consistent presence — one before/after post per week — builds a track record that's visible when someone searches your business name or finds you through local hashtags.

Use hashtags with your city or neighborhood name. Tag your location on each post. Keep your bio clear: what you do, where you work, how to reach you. A link to your Google Business Profile reduces friction for people who are ready to book.`,
  },
  {
    heading: "5. Referral mechanics that work for service crews",
    body: `Referrals happen naturally when your work is visible and your customers are satisfied. A freshly washed driveway gets noticed by neighbors. A clean patio comes up in conversation. You can accelerate this without a formal referral program.

The most effective mechanic is simply making sure each customer knows your name and how to refer you. A business card at the door. A Nextdoor post in their neighborhood. A follow-up text asking if they were happy with the work.

If you want a formal incentive, keep it simple: a discount on their next job for each person they refer who books. That's something a homeowner can explain to a neighbor in one sentence.

For more on building a local presence through finished job posts, see the pressure washing marketing guide linked below.`,
  },
];

const HEADLINE_EXAMPLES = [
  "Eight years of buildup, removed.",
  "Patio ready for summer.",
  "Siding washed clean — no damage.",
  "Walkway before/after — job done.",
  "Concrete looks new again.",
];

const CAPTION_EXAMPLES = [
  {
    channel: "Facebook",
    text: "Just finished this driveway in [your neighborhood]. The concrete hadn't been cleaned in years — one wash and it's back to looking sharp. Serving [area], licensed and insured. DM for a quote.",
  },
  {
    channel: "Instagram",
    text: "Before → After. Pressure wash + soft wash combo on this exterior. Driveway, siding, front walk. 📍 [City, State] #pressurewashing #beforeandafter #localservice",
  },
];

export function PressureWashingAdvertisingIdeas() {
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
              Pressure Washing Advertising Ideas
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Five approaches that work for small crews — each one built on showing real finished
              work rather than running traditional ads that compete on price.
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
                {section.body
                  .trim()
                  .split("\n\n")
                  .map((paragraph, i) => (
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
