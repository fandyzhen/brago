import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Auto Detailing Marketing Posts | Brago",
  description:
    "Create before-and-after marketing posts from car detailing photos, including interiors, pet hair removal, exterior shine, and mobile detailing jobs.",
};

const HEADLINE_EXAMPLES = [
  "Pet hair, gone.",
  "Interior detail — before/after says everything.",
  "Mobile detail done in your driveway, Austin TX.",
  "Full detail. Seats, carpets, exterior — all of it.",
  "Message us for a mobile detail quote.",
];

const CAPTION_EXAMPLES = [
  {
    channel: "Google Business Profile",
    text: "Just finished a full interior detail in Austin — pet hair removal, seat shampooing, and carpet extract. Before and after photos show exactly what we do. Mobile service available throughout Austin and North Austin. Licensed and insured. Call or message for a free estimate.",
  },
  {
    channel: "Facebook / Nextdoor",
    text: "Mobile detail done in the driveway — before/after on the interior. Pet hair, stains, and years of buildup — all gone. If your car could use some attention, send us a message. We come to you. Serving Austin and surrounding areas. 🚗",
  },
  {
    channel: "Instagram",
    text: "Interior detail ✔️ Before → After. Pet hair removal + full carpet extract + seat shampoo. We do mobile detailing throughout Austin. DM for a quote. #autodetailing #austintx #mobiledetailing #beforeandafter",
  },
];

const FAQS = [
  {
    q: "What types of detailing jobs work best for Brago?",
    a: "Interior transformations work especially well — pet hair removal, stain extraction, carpet cleaning. Exterior paint correction and full-service details also photograph well. Any job with visible before/after contrast is a good candidate.",
  },
  {
    q: "My before photos show a really messy car. Should I still post it?",
    a: "Yes. The messier the before, the more impressive the after looks. Potential customers aren't judging your clients — they're seeing proof that you can handle difficult jobs. That builds real trust.",
  },
  {
    q: "Can I use Brago for mobile detailing specifically?",
    a: "Yes. You can include your service area and 'mobile service available' in the brand profile so it shows on every post. Mobile detailers get good traction on Facebook and Nextdoor especially.",
  },
  {
    q: "Does Brago post directly to social media?",
    a: "No. Brago generates the image and caption. You download both and post yourself. This keeps your account under your control and lets you customize the caption before posting.",
  },
];

export default function AutoDetailingMarketingPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="border-b border-border">
        <Container className="py-10 md:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Auto Detailing Marketing
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Auto Detailing Marketing Posts
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Create before/after marketing posts from car detailing photos — interiors, pet hair removal,
              exterior shine, and mobile detailing jobs — for Google Business Profile, Facebook, Nextdoor, and Instagram.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
              >
                Create your first post
              </Link>
              <Link
                href="#examples"
                className="inline-flex items-center px-6 py-3 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-secondary transition-colors"
              >
                See detailing examples
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* Pain points */}
      <Container className="py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground">
              Great results. Not enough time to show them.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Auto detailers do transformative work — interiors that look brand new, exteriors that shine.
              The challenge is consistently turning those results into content you can actually post.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Car before/after photos are your most convincing marketing material.",
                "Facebook Marketplace buyers and referrals trust visual proof over any ad.",
                "Mobile detailers need local reach — Nextdoor and GBP posts deliver that.",
                "Clients who see your work online are already pre-sold before they call.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Detailing scenes Brago handles
            </h3>
            {[
              { scene: "Interior Detail", detail: "Seat shampoo, carpet extract, door panels — interior transformation posts." },
              { scene: "Pet Hair Removal", detail: "High before/after contrast. One of the most shared detailing posts." },
              { scene: "Exterior Shine", detail: "Paint correction, wax, and ceramic coating results. Strong portfolio content." },
              { scene: "Wheels & Tires", detail: "Detail shots that show craftsmanship. Great for Instagram." },
              { scene: "Mobile Detailing", detail: "On-location shots with your service area. Works well on Nextdoor." },
            ].map((item) => (
              <div key={item.scene} className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground text-sm">{item.scene}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* Channels */}
      <div id="examples" className="border-y border-border bg-secondary/30">
        <Container className="py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground max-w-2xl">
            Where auto detailers should post — and why before/after works
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
            Car detailing results are visual by nature. Before/after photos do more work than any
            testimonial. The key is matching the tone to the channel — formal on Google, conversational
            on Facebook and Nextdoor, portfolio-style on Instagram.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              {
                channel: "Google Business Profile",
                use: "Keep your profile active with recent job posts. Include your service area, license, insurance, and review count. GBP posts help potential customers see you're actively working.",
                style: "Professional tone. Include service area and trust details. Phone number visible.",
              },
              {
                channel: "Facebook / Nextdoor",
                use: "Local word-of-mouth starts here. Mobile detailers especially benefit from neighborhood posts. Before/after interior or pet hair posts tend to get shared and commented on.",
                style: "Casual and genuine. Skip the hard sell. Invite messages for quotes.",
              },
              {
                channel: "Instagram",
                use: "Build a visual portfolio over time. Exterior shine and interior transformation posts perform well. Less phone number, more craft. Consistent posting builds a recognizable brand.",
                style: "Visual-first. Short caption. A few targeted hashtags.",
              },
            ].map((ch) => (
              <div key={ch.channel} className="rounded-2xl border border-border bg-background p-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                  {ch.channel}
                </p>
                <p className="text-sm text-foreground leading-relaxed">{ch.use}</p>
                <p className="mt-3 text-xs text-muted-foreground italic">{ch.style}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* Headline examples */}
      <Container className="py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground">
          Auto detailing headline examples
        </h2>
        <p className="mt-3 text-muted-foreground">
          Short and specific. No fake promises, no invented prices.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {HEADLINE_EXAMPLES.map((h) => (
            <div
              key={h}
              className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-medium text-foreground"
            >
              &ldquo;{h}&rdquo;
            </div>
          ))}
        </div>

        {/* Caption examples */}
        <h2 className="mt-16 text-2xl md:text-3xl font-display font-extrabold text-foreground">
          Caption examples by channel
        </h2>
        <div className="mt-8 space-y-5">
          {CAPTION_EXAMPLES.map((ex) => (
            <div key={ex.channel} className="rounded-2xl border border-border p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {ex.channel}
              </p>
              <p className="text-sm text-foreground leading-relaxed">&ldquo;{ex.text}&rdquo;</p>
            </div>
          ))}
        </div>
      </Container>

      {/* How it works */}
      <div className="border-y border-border bg-secondary/30">
        <Container className="py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground text-center">
            From job photos to post in 60 seconds
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: "1", label: "Upload before/after photos", detail: "Phone photos work great." },
              { step: "2", label: "Pick where you're posting", detail: "Google, Facebook/Nextdoor, or Instagram." },
              { step: "3", label: "Review headline and caption", detail: "Edit or accept the generated text." },
              { step: "4", label: "Download and post", detail: "Image + caption ready to copy." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-foreground text-background font-bold text-sm flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <p className="font-semibold text-foreground text-sm">{s.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* FAQ */}
      <Container className="py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground">
          Frequently asked questions
        </h2>
        <div className="mt-8 space-y-5 max-w-2xl">
          {FAQS.map((faq) => (
            <div key={faq.q} className="rounded-2xl border border-border p-6">
              <p className="font-semibold text-foreground text-sm">{faq.q}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* CTA */}
      <div className="border-t border-border">
        <Container className="py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
            Turn your next finished detail into a marketing post
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Upload photos, pick a channel, and post in under 60 seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
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
            <Link href="/templates/google-business-profile-posts" className="hover:text-foreground transition-colors">
              Google Business Profile Posts →
            </Link>
          </div>
        </Container>
      </div>
    </div>
  );
}
