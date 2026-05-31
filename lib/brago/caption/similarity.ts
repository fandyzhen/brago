// spec §2.4：30 天内同一用户 caption 不允许 n-gram 相似度 > 70%。
// 用 character-3-gram jaccard 相似度，便宜、稳定、对小幅措辞改写敏感度合适。

const N = 3;

function ngrams(input: string): Set<string> {
  const norm = input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9áéíóúñü ]/gi, "")
    .trim();
  const set = new Set<string>();
  if (norm.length < N) {
    set.add(norm);
    return set;
  }
  for (let i = 0; i <= norm.length - N; i++) {
    set.add(norm.slice(i, i + N));
  }
  return set;
}

export function ngramSimilarity(a: string, b: string): number {
  const A = ngrams(a);
  const B = ngrams(b);
  if (A.size === 0 && B.size === 0) return 1;
  let intersection = 0;
  for (const g of A) if (B.has(g)) intersection++;
  const union = A.size + B.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const SIMILARITY_THRESHOLD = 0.7;

export function isTooSimilar(
  candidate: string,
  history: string[],
  threshold = SIMILARITY_THRESHOLD,
): boolean {
  return history.some((h) => ngramSimilarity(candidate, h) >= threshold);
}
