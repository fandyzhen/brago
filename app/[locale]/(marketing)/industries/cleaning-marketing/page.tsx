import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Cleaning Marketing Posts | Brago",
  description:
    "Turn carpet, move-out, window, and commercial cleaning jobs into Google Business Profile, Facebook, Nextdoor, and Instagram posts.",
};

const HEADLINE_EXAMPLES = [
  "Move-out clean done in four hours — keys handed back the same day.",
  "Twelve years of carpet traffic — gone in one visit.",
  "Recent deep clean in Round Rock. Before/after says it all.",
  "Window streak-free guarantee, no callbacks.",
  "Message us for a free quote.",
];

const CAPTION_EXAMPLES = [
  {
    channel: "Google Business Profile",
    text: "Just wrapped a 3-bedroom move-out clean in North Austin — kitchen, baths, baseboards, inside the oven. Place is ready for the next tenant. We're licensed and insured, serving Austin and surrounding areas. Check out our Google reviews and give us a call for a free estimate.",
  },
  {
    channel: "Facebook / Nextdoor",
    text: "Another deep clean done in the neighborhood! Before and after — carpets, baseboards, and kitchen all got the full treatment. If your home, rental, or office could use a refresh, send us a message. We're local, licensed, and insured. 📍 Serving Austin, TX",
  },
  {
    channel: "Instagram",
    text: "Move-out clean ✔️ Before → After. Carpet steam, full kitchen detail, baths spotless. Licensed & insured. Link in bio for a quote. #cleaningservice #austintx #beforeandafter",
  },
];

const FAQS = [
  {
    q: "Does Brago work with photos I took on my phone?",
    a: "Yes. Brago is built for real job photos, not studio shots. Phone photos — even uneven lighting in kitchens or bathrooms — work fine. The template handles the layout so your results look polished.",
  },
  {
    q: "Can I use the same post on Google, Facebook, and Instagram?",
    a: "You select one channel per post. Each channel has a different information density — Google shows your phone and review count more prominently, Instagram keeps the photo front and center. You can create separate posts for each channel from the same job photos.",
  },
  {
    q: "Do I need to know how to design anything?",
    a: "No design skills required. You upload before/after photos, pick where you're posting, and Brago generates the post. You review the headline and caption, then download.",
  },
  {
    q: "Will this help me rank higher on Google?",
    a: "Brago doesn't promise ranking improvements. Posting regularly on Google Business Profile keeps your profile active and shows potential customers recent work — that's what the posts are for.",
  },
  {
    q: "What if the before photo looks embarrassing for my client?",
    a: "Crop tight on the area, not the room. A close-up of a stained carpet square or grimy oven rack tells the story without identifying the home. Most homeowners are fine with it once they see the after — but always ask before posting.",
  },
];

export default function CleaningMarketingPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="border-b border-border">
        <Container className="py-10 md:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Cleaning Marketing
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Cleaning Marketing Posts
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Turn finished carpet, move-out, window, and commercial cleaning jobs into proof posts for
              Google Business Profile, Facebook, Nextdoor, and Instagram.
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
                See cleaning examples
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
              You have the photos. Posting takes too long.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Cleaning crews finish three, four, sometimes ten jobs a day — carpets, move-outs, offices.
              The problem isn&apos;t results. It&apos;s turning those results into something you can actually post
              between jobs.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Buying leads is expensive. Before/after proof is free advertising.",
                "Canva templates take too long when you're driving between jobs all day.",
                "Potential clients trust real job photos more than any ad copy.",
                "You need something you can post every week without overthinking it.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Cleaning job scenes Brago handles
            </h3>
            {[
              { scene: "Carpet Cleaning", detail: "Stain removal and high-traffic zones — clearest before/after in the trade." },
              { scene: "Move-Out / Turnover Cleans", detail: "Kitchens, baths, baseboards. Perfect for property managers on Nextdoor." },
              { scene: "Window Cleaning", detail: "Streak-free shots and reflection detail. Strong residential and commercial proof." },
              { scene: "Tile & Grout", detail: "Color restoration before/after that surprises homeowners — great Instagram content." },
              { scene: "Commercial / Office", detail: "End-of-shift reset photos. Builds trust with new business clients." },
            ].map((item) => (
              <div key={item.scene} className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground text-sm">{item.scene}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* Before/after proof section */}
      <div id="examples" className="border-y border-border bg-secondary/30">
        <Container className="py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground max-w-2xl">
            Why before/after works for cleaning marketing
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
            Cleaning is one of the few trades where results are immediately visible to anyone — no expertise
            required. A streaky window versus a clean one, a stained carpet versus a fresh one: customers
            see it in a fraction of a second. That makes before/after photos your most powerful marketing
            asset — not ads, not testimonials alone.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              {
                channel: "Google Business Profile",
                use: "Show recent jobs with your service area, review count, and license/insurance. Keep your profile active and build search trust.",
                style: "Formal. Include phone number, service area, and trust badges.",
              },
              {
                channel: "Facebook / Nextdoor",
                use: "Property managers and homeowners on Nextdoor convert best when posts feel like a neighborhood update, not an ad.",
                style: "Conversational. Light on sales pressure. Encourage messages over hard CTAs.",
              },
              {
                channel: "Instagram",
                use: "Build a portfolio of finished work. Less phone number, more visual proof. Works well for recurring content that shows consistency.",
                style: "Visual-first. Keep captions short. Use a few relevant hashtags.",
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
          Cleaning headline examples
        </h2>
        <p className="mt-3 text-muted-foreground">
          Short, specific, and believable. No invented prices or fake guarantees.
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
        <p className="mt-3 text-muted-foreground">
          Brago generates captions matched to the channel&apos;s tone. You can edit before downloading.
        </p>
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
              { step: "3", label: "Review headline and caption", detail: "Edit or accept the AI-generated text." },
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
        <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              FAQ
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-display font-extrabold text-foreground">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Real questions cleaning company owners asked us before signing up.
              Don&apos;t see yours?{" "}
              <Link
                href="/contact"
                className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
              >
                Ask us directly
              </Link>
              .
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-border p-6">
                <p className="font-semibold text-foreground text-sm">{faq.q}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* CTA */}
      <div className="border-t border-border">
        <Container className="py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
            Turn your next finished job into a marketing post
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            No design skills needed. Upload photos, pick a channel, and you&apos;re done.
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
            <Link href="/industries/auto-detailing-marketing" className="hover:text-foreground transition-colors">
              Auto Detailing Marketing →
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
