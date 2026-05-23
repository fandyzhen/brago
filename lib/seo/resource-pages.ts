export type ResourcePageMeta = {
  slug: string;
  title: string;
  description: string;
  industry: "pressure_washing" | "auto_detailing";
};

export const RESOURCE_PAGES: ResourcePageMeta[] = [
  {
    slug: "how-to-get-pressure-washing-customers",
    title: "How to Get Pressure Washing Customers | Brago",
    description:
      "Practical ways to get more pressure washing customers. Learn how before/after job proof posts on Google Business Profile, Facebook, and Nextdoor drive referrals and new leads.",
    industry: "pressure_washing",
  },
  {
    slug: "how-to-market-a-pressure-washing-business",
    title: "How to Market a Pressure Washing Business | Brago",
    description:
      "A complete pressure washing marketing guide. Cover Google Business Profile, Facebook, Instagram, referrals, reviews, and weekly before/after post workflows.",
    industry: "pressure_washing",
  },
  {
    slug: "pressure-washing-advertising-ideas",
    title: "Pressure Washing Advertising Ideas | Brago",
    description:
      "Creative pressure washing advertising ideas that work for small crews. Before/after proof posts for Facebook, Instagram, and Google outperform traditional ads.",
    industry: "pressure_washing",
  },
  {
    slug: "pressure-washing-marketing-ideas",
    title: "Pressure Washing Marketing Ideas | Brago",
    description:
      "Weekly pressure washing marketing ideas you can execute in minutes. Use finished job photos to build trust on every platform without a marketing budget.",
    industry: "pressure_washing",
  },
  {
    slug: "auto-detailing-marketing-posts",
    title: "Auto Detailing Marketing Posts | Brago",
    description:
      "Turn auto detailing before/after photos into marketing posts for Google Business Profile, Facebook, and Instagram. Built for mobile detailers and small shops.",
    industry: "auto_detailing",
  },
];

export function getResourcePageMeta(slug: string): ResourcePageMeta | undefined {
  return RESOURCE_PAGES.find((p) => p.slug === slug);
}
