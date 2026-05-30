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

export const photoVisionItemSchema = z.object({
  photoId: z.string(),
  role: z.enum(["before", "after", "process", "detail", "team", "other"]),
  roleConfidence: z.number().min(0).max(1),
  bestAfterScore: z.number().min(0).max(10),
  scores: scoresSchema,
  cropHint: cropHintSchema,
  riskFlags: riskFlagsSchema,
  why: z.string().max(280),
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
