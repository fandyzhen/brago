import "server-only";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  OVERLAY_BOTTOM_PCT,
  OVERLAY_HEIGHT_PCT,
  THUMBNAIL_TEST_EDGE,
} from "./constants";

const STOP_WORDS_FOR_OVERLAY = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "for",
  "with",
  "to",
]);

export function buildOverlayText(
  city: string | null | undefined,
  service: string,
): string {
  const cityClean = (city ?? "").trim();
  const serviceClean = (service ?? "").trim();
  if (!cityClean && !serviceClean) return "";

  function take(words: string[], max: number): string[] {
    const filtered = words.filter(
      (w) => w && !STOP_WORDS_FOR_OVERLAY.has(w.toLowerCase()),
    );
    return filtered.slice(0, max);
  }

  const cityWords = take(cityClean.split(/\s+/), 3);
  const remaining = Math.max(1, 5 - cityWords.length);
  const serviceWords = take(serviceClean.split(/\s+/), remaining);

  const parts: string[] = [];
  if (cityWords.length) parts.push(cityWords.join(" ").toUpperCase());
  if (serviceWords.length) parts.push(serviceWords.join(" ").toUpperCase());
  return parts.join(" · ");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOverlaySvg(text: string): Buffer {
  if (!text) {
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"/>`,
      "utf-8",
    );
  }
  const fontPx = Math.round(CANVAS_HEIGHT * (OVERLAY_HEIGHT_PCT / 100));
  const yFromTop = Math.round(
    CANVAS_HEIGHT - CANVAS_HEIGHT * (OVERLAY_BOTTOM_PCT / 100),
  );
  const safe = escapeXml(text);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
  <style>
    .ovl { font: 800 ${fontPx}px Inter, "Helvetica Neue", Arial, sans-serif;
           fill: #ffffff; stroke: #000000; stroke-width: 2; paint-order: stroke fill;
           text-anchor: middle; letter-spacing: 1.5px; }
  </style>
  <text x="${CANVAS_WIDTH / 2}" y="${yFromTop}" class="ovl">${safe}</text>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

/**
 * 合成可读性 gate（spec §1.6）。
 * 不引入 tesseract.js（重依赖）；用启发式：
 *   resized_font_px = full_font_px * (150 / CANVAS_WIDTH)
 *   approx_char_width_px ≈ resized_font_px * 0.55
 *   total_text_width_px ≈ char_count * approx_char_width_px
 *   pass 条件：
 *     - resized_font_px ≥ 9（人眼对 sans-serif 全大写最小可读高度）
 *     - total_text_width_px ≤ 150 - 2*margin（margin 取 8px）
 */
export function passesThumbnailReadability(text: string): boolean {
  if (!text) return true;
  const fullFontPx = CANVAS_HEIGHT * (OVERLAY_HEIGHT_PCT / 100);
  const resizedFontPx = fullFontPx * (THUMBNAIL_TEST_EDGE / CANVAS_WIDTH);
  if (resizedFontPx < 9) return false;
  const charWidth = resizedFontPx * 0.55;
  const totalWidth = text.length * charWidth;
  return totalWidth <= THUMBNAIL_TEST_EDGE - 16;
}
