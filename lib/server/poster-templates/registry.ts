import type { RenderFn } from "./shared/types";
import { driveWayHeroSplit } from "./pressure-washing/driveway-hero-split";
import { drivewayBoldStacked } from "./pressure-washing/driveway-bold-stacked";
import { drivewayLocalShare } from "./pressure-washing/driveway-local-share";
import { drivewayReviewTrust } from "./pressure-washing/driveway-review-trust";
import { drivewaySoftQuote } from "./pressure-washing/driveway-soft-quote";
import { drivewayNeighborhood } from "./pressure-washing/driveway-neighborhood";
import { drivewayProjectNo } from "./pressure-washing/driveway-project-no";
import { drivewayPortfolioSplit } from "./pressure-washing/driveway-portfolio-split";

const REGISTRY: Record<string, RenderFn> = {
  pressure_driveway_hero_split: driveWayHeroSplit,
  pressure_driveway_stacked: drivewayBoldStacked,
  pressure_driveway_local_share: drivewayLocalShare,
  pressure_driveway_review_trust: drivewayReviewTrust,
  pressure_driveway_soft_quote: drivewaySoftQuote,
  pressure_driveway_neighborhood: drivewayNeighborhood,
  pressure_driveway_project_no: drivewayProjectNo,
  pressure_driveway_portfolio_split: drivewayPortfolioSplit,
};

export function getRenderer(templateId: string): RenderFn | null {
  return REGISTRY[templateId] ?? null;
}

export function getRegisteredTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}
