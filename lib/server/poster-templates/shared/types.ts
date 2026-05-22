import type React from "react";

export type RenderInput = {
  beforeImageDataUrl: string;  // "data:image/jpeg;base64,..."
  afterImageDataUrl: string;
  templateId: string;
  headline: string;            // 最大 36 字符
  businessName?: string;
  phone?: string;
  serviceArea?: string;
  isLicensed?: boolean;
  isInsured?: boolean;
  googleReviewCount?: number;
};

export type RenderFn = (input: RenderInput) => React.ReactElement;

export type BragoTemplateMeta = {
  id: string;
  name: string;
  industry: "pressure_washing" | "auto_detailing";
  channel: "google_business_profile" | "facebook_nextdoor" | "instagram";
  layoutFamily: "split" | "hero_photo" | "stacked" | "collage";
  photoPairCount: 1 | 2 | 3 | 4;
  previewImage: string;  // 公开 URL，用于前端展示预览图
};
