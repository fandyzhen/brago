// Shared TypeScript types for the Brago Google-Ready Posts P0 stack.
// See docs/superpowers/plans/2026-05-29-brago-google-ready-posts-INDEX.md
// and the spec at /Volumes/FZD/开发项目/Brago项目前期/2026-05-29-1-brago-google-ready-posts-p0-spec.md.

export type Industry = "pressure_washing" | "auto_detailing" | "cleaning";

export type CaptionLanguage = "en" | "es";

export type CustomerLanguage = "en" | "es" | "mixed";

export type Speaker = "local_owner" | "crew" | "premium_service";

export type CtaStyle = "call_now_button" | "soft_contact" | "no_cta";

export type ImageMode = "single_after" | "before_after_proof";

export type GooglePostStatus = "draft" | "ready" | "posted_manually" | "archived";

export type PhotoRole = "before" | "after" | "process" | "detail" | "team" | "other";

export type BrandVoiceProfile = {
  speaker: Speaker;
  tone: string[];
  avoid: string[];
  customerLanguage: CustomerLanguage;
  serviceAreas: string[];
  verifiedClaims: {
    licensed?: boolean;
    insured?: boolean;
    familyOwned?: boolean;
    yearsInBusiness?: number;
    reviewCount?: number;
  };
  ctaStyle: CtaStyle;
};

export type CropHint = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  preferredAspectRatio: "1:1" | "4:3";
};

export type PhotoRiskFlags = {
  visibleFace: boolean;
  visibleLicensePlate: boolean;
  visibleHouseNumber: boolean;
  tooBlurryToUse: boolean;
  tooDarkToUse: boolean;
  likelyCustomerPrivateProperty: boolean;
};

export type ProofRecommendation = {
  mode: ImageMode;
  beforePhotoId?: string;
  afterPhotoId?: string;
  pairConfidence: number;
  transformationScore: number;
  reason: string;
};

export type PhotoVisionAnalysisItem = {
  photoId: string;
  role: PhotoRole;
  roleConfidence: number;
  bestAfterScore: number;
  scores: {
    resultVisibility: number;
    transformationStrength: number;
    subjectCompleteness: number;
    trustSignal: number;
    googleFit: number;
  };
  cropHint: CropHint;
  riskFlags: PhotoRiskFlags;
  why: string;
};

export type PhotoVisionAnalysis = {
  photos: PhotoVisionAnalysisItem[];
  recommendedPhotoId: string | null;
  alternatives: string[];
  proofRecommendation: ProofRecommendation;
};

export type GbpPolicyIssue =
  | "phone_number_detected"
  | "url_detected"
  | "too_long"
  | "too_many_emojis"
  | "shouting_text"
  | "unverified_claim"
  | "ai_cliche"
  | "em_dash_detected"
  | "missing_title"
  | "title_all_caps"
  | "length_out_of_range"
  | "value_prop_missing"
  | "blacklisted_phrase"
  | "cta_misaligned"
  | "similar_to_recent";

export type PolicyCheckResult = {
  valid: boolean;
  issues: GbpPolicyIssue[];
};

export type GoogleCaptionTemplate = {
  id: string;
  industry: Industry;
  serviceTypes: string[];
  seasons: Array<"spring" | "summer" | "fall" | "winter" | "any">;
  themes: string[];
  tone: "casual" | "professional" | "neighborly" | "premium";
  templateText: string;
  avoid: string[];
  example: string;
};

export const DEFAULT_BRAND_VOICE: BrandVoiceProfile = {
  speaker: "local_owner",
  tone: ["friendly", "neighborly"],
  avoid: ["too_salesy", "too_corporate", "fake_guarantees"],
  customerLanguage: "en",
  serviceAreas: [],
  verifiedClaims: {},
  ctaStyle: "call_now_button",
};

export const INDUSTRY_LABEL: Record<Industry, string> = {
  pressure_washing: "Pressure washing",
  auto_detailing: "Auto detailing",
  cleaning: "Cleaning",
};
