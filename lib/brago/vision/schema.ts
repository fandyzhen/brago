import { z } from "zod";

export const cropHintSchema = z.object({
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(1).max(100),
  heightPct: z.number().min(1).max(100),
  preferredAspectRatio: z.enum(["1:1", "4:3"]),
});

export const riskFlagsSchema = z.object({
  visibleFace: z.boolean(),
  visibleLicensePlate: z.boolean(),
  visibleHouseNumber: z.boolean(),
  tooBlurryToUse: z.boolean(),
  tooDarkToUse: z.boolean(),
  likelyCustomerPrivateProperty: z.boolean(),
});

export const scoresSchema = z.object({
  resultVisibility: z.number().min(0).max(10),
  transformationStrength: z.number().min(0).max(10),
  subjectCompleteness: z.number().min(0).max(10),
  trustSignal: z.number().min(0).max(10),
  googleFit: z.number().min(0).max(10),
});

// 默认值：模型边缘输出（缺字段 / 数值越界）时兜底，避免整条分析因
// 非关键字段而 502。关键结构（photoId / role / 推荐图 / proof.mode）保持严格。
const DEFAULT_SCORES = {
  resultVisibility: 0,
  transformationStrength: 0,
  subjectCompleteness: 0,
  trustSignal: 0,
  googleFit: 0,
};
const DEFAULT_CROP_HINT = {
  xPct: 0,
  yPct: 0,
  widthPct: 100,
  heightPct: 100,
  preferredAspectRatio: "1:1" as const,
};
const DEFAULT_RISK_FLAGS = {
  visibleFace: false,
  visibleLicensePlate: false,
  visibleHouseNumber: false,
  tooBlurryToUse: false,
  tooDarkToUse: false,
  likelyCustomerPrivateProperty: false,
};

export const photoVisionItemSchema = z.object({
  photoId: z.string(),
  role: z.enum(["before", "after", "process", "detail", "team", "other"]),
  roleConfidence: z.number().min(0).max(1).catch(0.5),
  bestAfterScore: z.number().min(0).max(10).catch(0),
  scores: scoresSchema.catch(DEFAULT_SCORES),
  cropHint: cropHintSchema.catch(DEFAULT_CROP_HINT),
  riskFlags: riskFlagsSchema.catch(DEFAULT_RISK_FLAGS),
  why: z.string().max(280).catch(""),
});

export const proofRecommendationSchema = z.object({
  mode: z.enum(["single_after", "before_after_proof"]),
  beforePhotoId: z.string().optional(),
  afterPhotoId: z.string().optional(),
  // single_after 模式下模型常省略这两个数值字段；缺失时给默认 0
  // （语义安全：没有置信度/转换分就当作弱 proof，后处理会保持 single_after）
  pairConfidence: z.number().min(0).max(1).default(0),
  transformationScore: z.number().min(0).max(10).default(0),
  reason: z.string().max(280).default(""),
});

export const photoVisionAnalysisSchema = z.object({
  photos: z.array(photoVisionItemSchema),
  recommendedPhotoId: z.string().nullable(),
  alternatives: z.array(z.string()),
  proofRecommendation: proofRecommendationSchema,
});

export type PhotoVisionAnalysis = z.infer<typeof photoVisionAnalysisSchema>;
