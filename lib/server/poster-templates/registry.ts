import type { RenderFn } from "./shared/types";
import { driveWayHeroSplit } from "./pressure-washing/driveway-hero-split";
import { drivewayBoldStacked } from "./pressure-washing/driveway-bold-stacked";
import { drivewayLocalShare } from "./pressure-washing/driveway-local-share";

const REGISTRY: Record<string, RenderFn> = {
  pressure_driveway_hero_split: driveWayHeroSplit,
  pressure_driveway_stacked: drivewayBoldStacked,
  pressure_driveway_local_share: drivewayLocalShare,
};

export function getRenderer(templateId: string): RenderFn | null {
  return REGISTRY[templateId] ?? null;
}

export function getRegisteredTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}
