// spec §1.3 / §1.4 / §1.5 — 所有合成参数集中在此处。
// 修改前务必先读 spec，并在 PR 描述里说明触发了哪条研究依据。

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 900; // 4:3
export const SAFE_ZONE_PCT = 70; // 中心 70% 矩形为 safe-zone

export const BEFORE_INSET_WIDTH_PCT = 22; // 右下角 before 内嵌宽度
export const BEFORE_INSET_MARGIN_PCT = 4; // 距右 / 距下 margin
export const BEFORE_INSET_STROKE_PX = 3;

export const OVERLAY_HEIGHT_PCT = 8; // 文字字号 = canvas 高度 × 6-8%
export const OVERLAY_BOTTOM_PCT = 10; // 距底部 10% 高度

export const WATERMARK_HEIGHT_PCT = 12; // logo 高度
export const WATERMARK_MARGIN_PCT = 5;
export const WATERMARK_OPACITY = 0.7;

export const TEXT_WATERMARK_HEIGHT_PCT = 3.5;
export const TEXT_WATERMARK_OPACITY = 0.8;

export const THUMBNAIL_TEST_EDGE = 150; // spec §1.6 缩略图可读性 gate
export const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // Google 上限
