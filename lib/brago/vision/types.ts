import type { PhotoVisionAnalysis } from "./schema";
import type { Industry } from "@/lib/brago/types";

export type VisionInput = {
  industry: Industry;
  serviceType: string;
  serviceArea?: string | null;
  photos: Array<{
    photoId: string;
    url: string;
  }>;
};

export type VisionProvider = {
  name: string;
  analyzeGooglePostPhotos(input: VisionInput): Promise<PhotoVisionAnalysis>;
};
