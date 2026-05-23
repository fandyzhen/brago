import Link from "next/link";
import { Container } from "@/components/container";

const SECTIONS = [
  {
    heading: "1. Post one finished job every week",
    body: `The most effective marketing habit for a small pressure washing crew is also the simplest: post one finished job every week.

Not a promotion. Not a price announcement. A before/after photo of something you actually cleaned — a driveway, a patio, a stretch of siding — with a short caption and your service area.

That's it. One post, once a week. Crews that maintain this habit build name recognition in their local market without any ad spend. The posts accumulate. Six months in, a potential customer finds your profile and sees dozens of finished jobs. That history is more convincing than any ad.`,
  },
  {
    heading: "2. Tag your service area every time",
    body: `Every post you publish should include your service area. Not just once on your profile bio — in the caption, every time.

This matters for a few reasons. On Google, it reinforces local relevance. On Facebook and Nextdoor, it tells neighbors you work in their area. On Instagram, it makes your posts findable by anyone searching your city or neighborhood.

Keep it simple: "[City, State]" at the end of your caption, or "serving [area]" worked naturally into the sentence. You don't need to list every zip code — just be clear about where you work.`,
  },
  {
    heading: "3. Ask for a review the day of the job",
    body: `The best time to ask for a Google review is the same day you finish the job — when the customer can see the result and satisfaction is highest.

A simple text message works: "Thanks for having us out today. If you're happy with the work, a Google review really helps us out." You can also leave a card at the door with a QR code linking to your review page.

Don't overthink the ask. Most satisfied customers will leave a review if asked directly and made it easy. Reviews improve your local ranking and build trust with potential customers who find you online.`,
  },
  {
    heading: "4. Vary the job type across posts",
    body: `If every post shows a driveway, potential customers assume that's all you do. Mix in different job types to show the range of your work.

Driveways, patios, walkways, siding, decks, roof washing, commercial concrete — each category is a separate type of customer searching for a separate service. Showing variety also keeps your content from looking repetitive to followers.

A simple rotation: driveway one week, patio the next, siding or deck the week after. You're probably doing all of these anyway. The goal is to make sure your posts reflect that.`,
  },
  {
    heading: "5. Respond to every comment and DM within a day",
    body: `When someone comments on your post or sends a message asking about availability, respond the same day. This is one of the highest-leverage things you can do and most crews don't do it.

A fast response signals that you're active, professional, and easy to work with. A slow response — or no response — loses the job to whoever picks up first.

Turn on notifications for your business profiles. Keep your availability response short: "Yes, we're serving [area] — I'll send you a message with more details." Then follow up.

For a full breakdown of channels and templates, see the pressure washing marketing guide linked below.`,
  },
];

const HEADLINE_EXAMPLES = [
  "Deck restored — before and after.",
  "Driveway pressure wash, done.",
  "Soft wash on the siding today.",
  "Before/after from this morning.",
];

const CAPTION_EXAMPLES = [
  {
    channel: "Google Business Profile",
    text: "Wrapped up a driveway and patio wash in [Area] today. Clean concrete, no residue, no streaks. We do this all week — if your property is due, we're local and available.",
  },
  {
    channel: "Nextdoor",
    text: "One more finished today in [neighborhood]. It's the kind of job where the photos do the talking. If you've thought about getting your driveway or patio done, message us.",
  },
];

export function PressureWashingMarketingIdeas() {
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
              Pressure Washing Marketing Ideas
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Five lightweight actions you can fit into your week without hiring anyone or running
              ads — built for owner-operated crews who are already busy with jobs.
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
