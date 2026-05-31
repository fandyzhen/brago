/**
 * Hero showcase 案例数据 — 5 张真实 Brago-rendered before/after 证明图
 * 配套生成脚本：scripts/generate-homepage-cases.ts
 * 渲染产物：public/hero/cases/{id}.jpg（1200×900，4:3）
 */
export type HeroCase = {
  id: string;
  industry: "cleaning" | "pressure-washing" | "auto-detailing";
  industryLabel: string;
  imagePath: string;
  alt: string;
  title: string;
  body: string;
  /** 喂给 buildOverlayText(city, service) */
  overlay: { city: string; service: string };
  /** 生成脚本用：素材文件相对 research/source-photos/ 的子路径（不含 -before/-after.jpg） */
  source: { dir: string; slug: string };
};

export const HERO_CASES: HeroCase[] = [
  {
    id: "park-slope-kitchen",
    industry: "cleaning",
    industryLabel: "House cleaning",
    imagePath: "/hero/cases/park-slope-kitchen.jpg",
    alt: "Brago-rendered before/after proof image of a gas stovetop deep clean in Park Slope, with the main after shot showing spotless burners and a corner inset of the greasy before state.",
    title: "Park Slope kitchen, fresh by lunch",
    body: "Deep cleaned a gas stovetop in Park Slope this morning. Months of grease off the grates and burners in under an hour. Tap the Call button on our Google profile to book.",
    overlay: { city: "Park Slope", service: "Deep Clean" },
    source: { dir: "cleaning", slug: "stovetop" },
  },
  {
    id: "austin-driveway",
    industry: "pressure-washing",
    industryLabel: "Pressure washing",
    imagePath: "/hero/cases/austin-driveway.jpg",
    alt: "Brago-rendered before/after proof image of an Austin concrete driveway pressure wash, with the main after shot showing fresh light-grey concrete and a corner inset of the stained before state.",
    title: "Austin driveway, curb appeal back",
    body: "Knocked out a stained concrete driveway in Austin this afternoon. Tire marks and grime gone in two passes. Tap the Call button on our Google profile to lock in a slot.",
    overlay: { city: "Austin", service: "Driveway Wash" },
    source: { dir: "pressure-washing", slug: "driveway-01" },
  },
  {
    id: "bellevue-siding",
    industry: "pressure-washing",
    industryLabel: "House washing",
    imagePath: "/hero/cases/bellevue-siding.jpg",
    alt: "Brago-rendered before/after proof image of a Bellevue house siding wash, with the main after shot showing clean siding and a corner inset of the algae-streaked before state.",
    title: "Bellevue siding, like-new in 3 hours",
    body: "House wash on a two-story Bellevue home today. Years of green streaks gone without damaging the paint. Tap the Call button on our Google profile to book a quote.",
    overlay: { city: "Bellevue", service: "Siding Wash" },
    source: { dir: "pressure-washing", slug: "house-siding" },
  },
  {
    id: "denver-suv-interior",
    industry: "auto-detailing",
    industryLabel: "Auto detailing",
    imagePath: "/hero/cases/denver-suv-interior.jpg",
    alt: "Brago-rendered before/after proof image of a Denver SUV interior detail, with the main after shot showing a clean dashboard and seats and a corner inset of the dusty before state.",
    title: "Denver SUV interior, like-new",
    body: "Full interior detail on a Dodge Journey in Denver today. Vacuumed, shampooed, and dressed every panel in one session. Tap the Call button on our Google profile to schedule.",
    overlay: { city: "Denver", service: "Interior Detail" },
    source: { dir: "auto-detailing", slug: "dodge-journey-interior" },
  },
  {
    id: "phoenix-truck-exterior",
    industry: "auto-detailing",
    industryLabel: "Auto detailing",
    imagePath: "/hero/cases/phoenix-truck-exterior.jpg",
    alt: "Brago-rendered before/after proof image of a Phoenix Silverado exterior detail, with the main after shot showing a glossy clean truck and a corner inset of the dusty before state.",
    title: "Phoenix Silverado, mirror finish today",
    body: "Full exterior detail on a Phoenix Silverado today. Wash, clay, polish, and sealant in one stop. Paint feels glass-smooth. Tap the Call button on our Google profile to book.",
    overlay: { city: "Phoenix", service: "Exterior Wash" },
    source: { dir: "auto-detailing", slug: "silverado-exterior" },
  },
  {
    id: "chicago-range-hood",
    industry: "cleaning",
    industryLabel: "Kitchen cleaning",
    imagePath: "/hero/cases/chicago-range-hood.jpg",
    alt: "Brago-rendered before/after proof image of a Chicago kitchen range hood degrease, with the main after shot showing a spotless stainless hood and a corner inset of the grease-caked before state.",
    title: "Chicago range hood, grease-free overnight",
    body: "Cleaning the range hood today in a Chicago kitchen. Filters and fan housing back to bare stainless. Tap the Call button on our Google profile to request a quote.",
    overlay: { city: "Chicago", service: "Range Hood" },
    source: { dir: "cleaning", slug: "range-hood" },
  },
];
