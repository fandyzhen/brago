import type { BragoTemplateMeta } from "@/lib/server/poster-templates/shared/types";

// 这个文件可以被 client 端 import。
// 不要在这里 import 任何 lib/server/poster-templates/ 下的渲染逻辑。

export const POSTER_TEMPLATES: BragoTemplateMeta[] = [
  {
    id: "pressure_driveway_hero_split",
    name: "Driveway Hero Split",
    industry: "pressure_washing",
    channel: "google_business_profile",
    layoutFamily: "hero_photo",
    photoPairCount: 1,
    intent: "trust",
    phoneDefault: "visible",
    previewImage: "/template-previews/pressure_driveway_hero_split.webp",
  },
  {
    id: "pressure_driveway_stacked",
    name: "Driveway Bold Stacked",
    industry: "pressure_washing",
    channel: "instagram",
    layoutFamily: "stacked",
    photoPairCount: 1,
    intent: "portfolio",
    phoneDefault: "hidden",
    previewImage: "/template-previews/pressure_driveway_stacked.webp",
  },
  {
    id: "pressure_driveway_local_share",
    name: "Local Job Share",
    industry: "pressure_washing",
    channel: "facebook_nextdoor",
    layoutFamily: "split",
    photoPairCount: 1,
    intent: "recent_job",
    phoneDefault: "subtle",
    previewImage: "/template-previews/pressure_driveway_local_share.webp",
  },
];

export function getTemplateById(id: string): BragoTemplateMeta | undefined {
  return POSTER_TEMPLATES.find((t) => t.id === id);
}
