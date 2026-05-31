import { containsBlacklistedPhrase } from "@/lib/brago/caption/blacklist";
import { checkCaptionStructure } from "@/lib/brago/caption/structure";
import { isTooSimilar } from "@/lib/brago/caption/similarity";
import {
  classifyPostKind,
  isCtaAligned,
} from "@/lib/brago/caption/cta-alignment";
import { passesThumbnailReadability } from "@/lib/brago/compose/overlay";
import type { CaptionLanguage } from "@/lib/brago/types";

export type ScoreInput = {
  caption: string;
  language: CaptionLanguage;
  ctx: { serviceType: string; serviceArea: string | null };
  recentCaptions: string[];
  image: {
    isAiGenerated: boolean;
    hasBragoWatermark: boolean;
    overlayText: string;
  };
};

export type MustPassGate =
  | "no_ai_generated_image"
  | "no_brago_watermark_on_image"
  | "has_overlay_text_3_to_5_words"
  | "thumbnail_text_readable_at_150px"
  | "caption_has_title_proper_case"
  | "no_all_caps_in_title"
  | "caption_100_to_300_chars"
  | "first_100_chars_has_value_prop"
  | "no_blacklisted_phrases"
  | "caption_not_70pct_similar_recent_30d";

export type ScoreBreakdown = {
  authenticity: number;
  thumbnailClarity: number;
  captionCraft: number;
  ctaAlignment: number;
  localSpecificity: number;
  antiTemplate: number;
};

export type ScoreResult = {
  score: number;
  mustPassFailures: MustPassGate[];
  breakdown: ScoreBreakdown;
};

function countOverlayWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((t) => t && t !== "·").length;
}

const EMPTINESS_WORDS = [
  "trusted",
  "professional",
  "expert",
  "reliable",
  "quality",
  "best",
];

export function scoreOutput(input: ScoreInput): ScoreResult {
  const must: MustPassGate[] = [];
  const { caption, image, ctx, recentCaptions, language } = input;

  if (image.isAiGenerated) must.push("no_ai_generated_image");
  if (image.hasBragoWatermark) must.push("no_brago_watermark_on_image");
  const overlayWords = countOverlayWords(image.overlayText);
  if (overlayWords < 3 || overlayWords > 5) {
    must.push("has_overlay_text_3_to_5_words");
  }
  if (!passesThumbnailReadability(image.overlayText)) {
    must.push("thumbnail_text_readable_at_150px");
  }

  const struct = checkCaptionStructure(caption, ctx);
  if (struct.issues.includes("missing_title")) {
    must.push("caption_has_title_proper_case");
  }
  if (struct.issues.includes("title_all_caps")) must.push("no_all_caps_in_title");
  // spec §3.1：长度门控基于整个 caption（含标题），100-300 字符
  const captionLen = caption.trim().length;
  if (captionLen < 100 || captionLen > 300) {
    must.push("caption_100_to_300_chars");
  }
  if (struct.issues.includes("value_prop_missing")) {
    must.push("first_100_chars_has_value_prop");
  }
  if (containsBlacklistedPhrase(caption, language)) {
    must.push("no_blacklisted_phrases");
  }
  if (isTooSimilar(caption, recentCaptions)) {
    must.push("caption_not_70pct_similar_recent_30d");
  }

  const breakdown: ScoreBreakdown = {
    authenticity: 0,
    thumbnailClarity: 0,
    captionCraft: 0,
    ctaAlignment: 0,
    localSpecificity: 0,
    antiTemplate: 0,
  };

  if (must.length > 0) {
    return { score: 0, mustPassFailures: must, breakdown };
  }

  // 加权评分（spec §3.2）
  const body = struct.body;
  const lower = caption.toLowerCase();

  // Authenticity (25)
  const emptinessHits = EMPTINESS_WORDS.filter((w) => lower.includes(w)).length;
  breakdown.authenticity = Math.max(0, 25 - emptinessHits * 8);

  // Thumbnail clarity (20) — 已通过 must-pass readability，给基础 16，overlay 字数刚好 4 则满 20
  breakdown.thumbnailClarity = overlayWords === 4 ? 20 : 16;

  // Caption craft (15)
  const sentences = body.split(/[.!?]/).filter((s) => s.trim());
  const avgWords =
    sentences.reduce((a, s) => a + s.split(/\s+/).filter(Boolean).length, 0) /
      Math.max(1, sentences.length);
  breakdown.captionCraft = avgWords < 20 ? 15 : 9;

  // CTA alignment (10)
  const kind = classifyPostKind(body);
  breakdown.ctaAlignment = isCtaAligned(kind, body) ? 10 : 0;

  // Local specificity (15)
  breakdown.localSpecificity =
    ctx.serviceArea && body.toLowerCase().includes(ctx.serviceArea.toLowerCase())
      ? 15
      : 8;

  // Anti-template (15) — 已通过 similarity must-pass，给基础 12；无模板黑名单命中 +3
  breakdown.antiTemplate = 12 + 3;

  const score =
    breakdown.authenticity +
    breakdown.thumbnailClarity +
    breakdown.captionCraft +
    breakdown.ctaAlignment +
    breakdown.localSpecificity +
    breakdown.antiTemplate;

  return { score, mustPassFailures: [], breakdown };
}
