import type { RenderFn } from "./shared/types";
import { driveWayHeroSplit } from "./pressure-washing/driveway-hero-split";
import { drivewayBoldStacked } from "./pressure-washing/driveway-bold-stacked";
import { drivewayLocalShare } from "./pressure-washing/driveway-local-share";
import { drivewayReviewTrust } from "./pressure-washing/driveway-review-trust";
import { drivewaySoftQuote } from "./pressure-washing/driveway-soft-quote";
import { drivewayNeighborhood } from "./pressure-washing/driveway-neighborhood";
import { drivewayProjectNo } from "./pressure-washing/driveway-project-no";
import { drivewayPortfolioSplit } from "./pressure-washing/driveway-portfolio-split";
import { interiorDetailProof } from "./auto-detailing/interior-detail-proof";
import { reviewBadgeDetail } from "./auto-detailing/review-badge-detail";
import { mobileDetailLocalShare } from "./auto-detailing/mobile-detail-local-share";
import { petHairGoneQuote } from "./auto-detailing/pet-hair-gone-quote";
import { drivewayDetailProof } from "./auto-detailing/driveway-detail-proof";
import { portfolioShineSplit } from "./auto-detailing/portfolio-shine-split";
import { projectNoDetail } from "./auto-detailing/project-no-detail";
import { exteriorMultiAreaProof } from "./pressure-washing/exterior-multi-area-proof";
import { fullDetailMultiAreaProof } from "./auto-detailing/full-detail-multi-area-proof";

const REGISTRY: Record<string, RenderFn> = {
  pressure_driveway_hero_split: driveWayHeroSplit,
  pressure_driveway_stacked: drivewayBoldStacked,
  pressure_driveway_local_share: drivewayLocalShare,
  pressure_driveway_review_trust: drivewayReviewTrust,
  pressure_driveway_soft_quote: drivewaySoftQuote,
  pressure_driveway_neighborhood: drivewayNeighborhood,
  pressure_driveway_project_no: drivewayProjectNo,
  pressure_driveway_portfolio_split: drivewayPortfolioSplit,
  detail_interior_proof: interiorDetailProof,
  detail_review_badge: reviewBadgeDetail,
  detail_mobile_local_share: mobileDetailLocalShare,
  detail_pet_hair_quote: petHairGoneQuote,
  detail_driveway_proof: drivewayDetailProof,
  detail_portfolio_shine_split: portfolioShineSplit,
  detail_project_no: projectNoDetail,
  pressure_exterior_multi_area_proof: exteriorMultiAreaProof,
  detail_full_multi_area_proof: fullDetailMultiAreaProof,
};

export function getRenderer(templateId: string): RenderFn | null {
  return REGISTRY[templateId] ?? null;
}

export function getRegisteredTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}
