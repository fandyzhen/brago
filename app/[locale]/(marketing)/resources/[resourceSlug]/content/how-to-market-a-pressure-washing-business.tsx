import Link from "next/link";
import { Container } from "@/components/container";

const SECTIONS = [
  {
    heading: "1. Start with your Google Business Profile",
    body: `If you haven't claimed your Google Business Profile yet, that's the first thing to do. It's free, and it's where most people in your area will find you when they search "pressure washing near me."

Once it's set up, keep it active with job photos. Businesses that post recent work — especially before/after shots — get more clicks than ones with empty profiles. You don't need to post every day. One photo after a job is enough to signal that you're active and working.

Fill in your service area, hours, and license status. Customers scanning local results look at that information before they read a single review.`,
  },
  {
    heading: "2. Before/after photos are your best ad",
    body: `No ad copy works as well as a clear before/after photo of a job you just finished. The concrete was dirty — now it's clean. That's the entire pitch, and it's credible because it's real.

You don't need a good camera. A phone photo of the driveway before you start and another when you pack up is enough. The contrast does the work. Post it to your Google Business Profile, Facebook, and Nextdoor the same day.

Brago formats the photo pair into a post-ready image — headline, branding, layout — in about 60 seconds. The goal is to make posting fast enough that you actually do it after every job, not just occasionally.`,
  },
  {
    heading: "3. Facebook and Nextdoor for neighborhood reach",
    body: `Facebook and Nextdoor are where local service posts get traction — not because of algorithms, but because neighbors see your work in their feed and recognize the street or house.

On Nextdoor, you can specify the neighborhoods your post appears in. A finished job post that says "did this driveway yesterday in [your neighborhood]" reaches the exact people who live near that customer. That's more targeted than most paid advertising.

On Facebook, keep the tone informational rather than promotional. "Before and after from today's job" performs better than "Call us for the best price." You're showing proof, not selling.`,
  },
  {
    heading: "4. Google reviews compound over time",
    body: `Reviews are a long-term asset. A business with recent, specific reviews consistently outranks one with older, generic ones — and that ranking difference drives calls and form submissions for years.

The simplest ask: after you wrap up a job, send the customer a text or hand them a card. Something like, "If you're happy with the work, a Google review helps us out a lot." Don't script it. Just ask.

More reviews also improve your Google Business Profile placement in local map results. Every review you collect today is still working for you a year from now.`,
  },
  {
    heading: "5. A simple weekly posting habit",
    body: `You don't need a marketing strategy. You need a habit: post one finished job per week, every week.

Pick a day — Friday afternoon, Sunday evening — and use that time to post the best job from the week. Before photo, after photo, short caption with your service area. Done.

Crews that do this consistently build name recognition in their market without any ad spend. The posts accumulate. Customers searching for a local pressure washer will find your work from three months ago alongside last week's. The history of real jobs is more convincing than any ad you could run.

For a full channel-by-channel breakdown, see the pressure washing marketing guide linked below.`,
  },
];

const HEADLINE_EXAMPLES = [
  "Driveway done. Before and after.",
  "Soft wash — siding looks new.",
  "Concrete restored in one visit.",
  "Patio pressure washed today.",
  "No streaks, no damage — done right.",
];

const CAPTION_EXAMPLES = [
  {
    channel: "Google Business Profile",
    text: "Finished a full exterior wash in the Cedar Park area today. Driveway, walkway, and front siding. If your home is due for a clean, we're licensed, insured, and available for free estimates.",
  },
  {
    channel: "Nextdoor",
    text: "Did this driveway yesterday in the neighborhood — before and after. If you've been thinking about getting yours done, message us. We serve this area and offer free estimates.",
  },
];

export function HowToMarketAPressureWashingBusiness() {
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
              How to Market a Pressure Washing Business
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              A practical guide for small, owner-operated pressure washing crews — five actions that
              build visibility without ad budgets or marketing agencies.
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
