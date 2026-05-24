import { POSTER_TEMPLATES } from "./public-metadata";
import type { BragoTemplateMeta } from "@/lib/server/poster-templates/shared/types";

/**
 * 根据上传图片的宽高比挑选最合适的 single-pair 模板（不含 collage）。
 *
 * - `landscape` 偏 split / card_pair（左右分屏 / 横向对比卡片）
 * - `portrait`  偏 stacked / hero_photo（上下叠 / 大图主导）
 * - `square`    全部模板均可，不做强偏好
 *
 * 同分内随机洗牌，保证每次推荐都有新鲜感；模板数量不足 N 时按现有数量返回。
 * Multi-area `collage` 模板永远排除（走另一个流程）。
 */

export type ImageOrientation = "landscape" | "portrait" | "square";

type LayoutFamily = BragoTemplateMeta["layoutFamily"];

/** 给定 width × height，返回 landscape / portrait / square。 */
export function detectOrientation(width: number, height: number): ImageOrientation {
  if (!width || !height || width <= 0 || height <= 0) return "square";
  const ratio = width / height;
  if (ratio >= 1.1) return "landscape";
  if (ratio <= 0.9) return "portrait";
  return "square";
}

/** 每种 orientation 下各 layoutFamily 的"适配分数"（高 = 更优先推荐）。 */
const FIT_SCORE: Record<ImageOrientation, Record<LayoutFamily, number>> = {
  landscape: {
    split: 3,
    card_pair: 3,
    diagonal: 2,
    hero_photo: 2,
    stacked: 1,
    collage: 0,
  },
  portrait: {
    stacked: 3,
    hero_photo: 3,
    diagonal: 2,
    card_pair: 1,
    split: 1,
    collage: 0,
  },
  square: {
    hero_photo: 2,
    split: 2,
    stacked: 2,
    card_pair: 2,
    diagonal: 2,
    collage: 0,
  },
};

/**
 * 按 orientation 推荐最多 `count` 个 single-pair 模板。
 * 模板不足时按现有数量返回（不抛错）。
 */
export function pickPreviewTemplates(
  orientation: ImageOrientation,
  count = 3
): BragoTemplateMeta[] {
  const candidates = POSTER_TEMPLATES.filter((t) => t.layoutFamily !== "collage");
  if (candidates.length === 0) return [];

  const scored = candidates.map((t) => ({
    template: t,
    score: FIT_SCORE[orientation][t.layoutFamily] ?? 1,
    rand: Math.random(),
  }));
  scored.sort((a, b) => b.score - a.score || a.rand - b.rand);

  return scored.slice(0, Math.min(count, candidates.length)).map((s) => s.template);
}
