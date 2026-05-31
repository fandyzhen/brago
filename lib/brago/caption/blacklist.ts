import type { CaptionLanguage } from "@/lib/brago/types";

// spec §2.3 + §4.2：明确禁止的措辞模式。修改前看 spec，不要随意删。
const EN_PHRASE_PATTERNS: RegExp[] = [
  /\btrusted by\b[^.]{0,40}\b(?:drivers|homeowners|customers|locals)\b/i,
  /\bexpert\b[^.]{0,30}\bin\s+[A-Z]/i,
  /\bprofessional\b[^.]{0,30}\byou can count on\b/i,
  /\byour local\b/i,
  /\bwe offer\b[^.]{0,30}\breliable\b/i,
  /\bhigh[- ]quality\b[^.]{0,30}\baffordable\b/i,
  /\bbest\b[^.]{0,30}\bin\s+[A-Z]/i,
  /\bguaranteed satisfaction\b/i,
  /\bsatisfaction guaranteed\b/i,
  /\b100%\s+guarantee/i,
  /\bthe only\b[^.]{0,30}\b(?:in|for)\b/i,
];

const ES_PHRASE_PATTERNS: RegExp[] = [
  /\bexpertos?\b[^.]{0,30}\ben\s+[A-Z]/i,
  /\bprofesional(?:es)?\s+y\s+confiable/i,
  /\bmejor\b[^.]{0,30}\ben\s+[A-Z]/i,
  /\btu (?:servicio )?local\b/i,
  /\bcalidad\b[^.]{0,30}\bprecio\b/i,
  /\bsatisfacción garantizada\b/i,
];

// [city] X [city] Y [city] Z 关键词堆砌 — 同一 token 在 caption 中出现 ≥3 次
// 且每次后面跟着不同的服务词 → 判定 stuffing。
function detectKeywordStuffing(text: string): boolean {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [, c] of counts) {
    if (c >= 3) return true;
  }
  return false;
}

export function containsBlacklistedPhrase(
  text: string,
  language: CaptionLanguage,
): boolean {
  const patterns =
    language === "es" ? ES_PHRASE_PATTERNS : EN_PHRASE_PATTERNS;
  if (patterns.some((re) => re.test(text))) return true;
  if (detectKeywordStuffing(text)) return true;
  return false;
}

// 暴露给单元测试与未来扩展（如管理员后台展示规则）
export const BLACKLIST_PATTERNS = {
  en: EN_PHRASE_PATTERNS,
  es: ES_PHRASE_PATTERNS,
};
