import Link from "next/link";
import { Container } from "@/components/container";

const SECTIONS = [
  {
    heading: "1. Interior detail before/after is highly shareable",
    body: `Interior before/after photos are some of the most engaging content a detailing business can post. The transformation is dramatic — stained seats, cluttered floors, grimy door panels become clean surfaces — and it's immediately relatable. Most people know their own car's interior could use work.

Post the full job: seats, floor mats, center console, door panels. The more complete the transformation, the more the photo speaks for itself. You don't need a caption that sells — the image does that.

Interior detail posts tend to generate more saves, shares, and "how much do you charge?" messages than exterior posts. If you're doing these jobs, document them every time.`,
  },
  {
    heading: "2. Pet hair removal posts perform well on social media",
    body: `Pet hair removal is a specific, high-demand service that many detailers underpost. The before/after is visually clear — fur covering every surface, then clean upholstery — and it speaks directly to a large segment of car owners who deal with the same problem.

These posts also tend to get more comments and shares because people tag friends with pets or share them in community groups. If pet hair removal is part of your service, it deserves its own post.

Keep the caption direct: what the job involved, how long it took, and how to reach you. Don't oversell. The photo already demonstrates the result.`,
  },
  {
    heading: "3. Mobile detailing — your service area is your ad",
    body: `If you offer mobile detailing, every job you finish in a neighborhood is a potential referral. Neighbors notice a clean car in the driveway. Coworkers notice a transformed interior. The service comes to the customer — which means your work is visible where your customers live and work.

Every post you publish should include your service area. On Google Business Profile, keep your service area current. On Facebook and Instagram, include the city or neighborhood in your caption and location tag.

When you finish a job, post it the same day with the location tagged. That post can surface when someone in the area searches for mobile detailing later.`,
  },
  {
    heading: "4. Exterior shine posts for portfolio building",
    body: `Exterior detail and paint correction posts are your portfolio. A clear, well-lit before/after of a paint decontamination, clay bar treatment, or wax finish shows potential customers the standard of your work before they ever contact you.

You don't need professional photography equipment. A clean backdrop, good lighting, and a steady hand with your phone is enough. What matters is that the finish is visible — swirls gone, shine restored, paint looking right.

Post these to Instagram as well as Facebook and Google. Instagram is a particularly good channel for detailing work because the platform is visual and the audience is used to seeing finished work in portfolios.`,
  },
  {
    heading: "5. Keep your Google Business Profile active with job photos",
    body: `Your Google Business Profile is where customers in your area will find you when they search "auto detailing near me" or "mobile car detailing [city]." Businesses that post regular photos — especially recent job photos — appear more active and get more profile visits.

Post at least one finished job photo per week. Include your service area in the photo description. Each photo stays on your profile and builds a library of work visible to anyone who finds you.

More photos also give Google more signals to display your business for relevant local searches. It's free visibility that compounds over time.

For a full channel breakdown specific to auto detailing, see the auto detailing marketing guide linked below.`,
  },
];

const HEADLINE_EXAMPLES = [
  "Interior detail — before and after.",
  "Pet hair, gone.",
  "Full detail done in your driveway.",
  "Before/after exterior shine.",
  "Seats cleaned, carpets done.",
];

const CAPTION_EXAMPLES = [
  {
    channel: "Google Business Profile",
    text: "Finished a full interior detail in [Area] today. Seats, carpets, and door panels — the car hadn't been deep cleaned in years. We're a mobile service, licensed and insured, serving [area]. Call or DM for availability.",
  },
  {
    channel: "Facebook",
    text: "Before and after interior detail. Pet hair and stains from the floor to the headliner — came out clean. Mobile detailing in [area]. Message us for pricing and availability.",
  },
];

export function AutoDetailingMarketingPosts() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="border-b border-border">
        <Container className="py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Resources &middot; Auto Detailing
            </p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Auto Detailing Marketing Posts
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Five types of before/after posts that work for auto detailing businesses — practical
              guidance for mobile and shop-based detailers posting finished jobs consistently.
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
            Headline examples for auto detailing posts
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
            href="/industries/auto-detailing-marketing"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Auto Detailing Marketing Posts — templates and channel guide
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
            Turn your next finished detail into a post
          </h2>
          <p className="mt-3 text-muted-foreground text-sm max-w-md mx-auto">
            Upload before/after photos. Brago handles the formatting. You get a post ready for
            Google, Facebook, Instagram, or Nextdoor in about 60 seconds.
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
