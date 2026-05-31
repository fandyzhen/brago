export type PostKind =
  | "completed_job"
  | "team_intro"
  | "seasonal_info"
  | "education";

// spec §2.5：post 类型 → CTA 映射。
const ALLOWED_CTA_PHRASES: Record<PostKind, RegExp[]> = {
  completed_job: [/\bcall now\b/i, /\bcall today\b/i, /\bbook\b/i, /\bllama\b/i],
  team_intro: [/\blearn more\b/i, /\bconoce\b/i, /\bmás info\b/i],
  seasonal_info: [/\blearn more\b/i, /\bmás info\b/i],
  education: [/\blearn more\b/i, /\bmás info\b/i],
};

const FORBIDDEN_CTA_ANYWHERE: RegExp[] = [
  /\bbuy now\b/i,
  /\border online\b/i,
  /\bget offer\b/i,
  /\bsign up\b/i,
];

const EDUCATION_KEYWORDS =
  /\b(how to|what is|why|guide|tips|when to|choose|difference between)\b/i;
const TEAM_KEYWORDS =
  /\b(meet (?:our|the)|our team|our crew|years (?:in|of) business)\b/i;
const SEASONAL_KEYWORDS =
  /\b(spring|summer|fall|winter|holiday|pre[- ]holiday|seasonal)\b/i;

export function classifyPostKind(text: string): PostKind {
  if (EDUCATION_KEYWORDS.test(text)) return "education";
  if (TEAM_KEYWORDS.test(text)) return "team_intro";
  if (SEASONAL_KEYWORDS.test(text)) return "seasonal_info";
  return "completed_job";
}

export function isCtaAligned(kind: PostKind, body: string): boolean {
  if (FORBIDDEN_CTA_ANYWHERE.some((re) => re.test(body))) return false;
  // 若 body 中找不到任何 CTA 短语，按 aligned 处理（spec 没要求强制有 CTA）
  const allCta = [
    /\bcall (?:now|today)\b/i,
    /\bbook\b/i,
    /\blearn more\b/i,
    /\bbuy now\b/i,
    /\border online\b/i,
    /\bget offer\b/i,
    /\bsign up\b/i,
    /\bllama\b/i,
    /\bmás info\b/i,
  ];
  const hasAny = allCta.some((re) => re.test(body));
  if (!hasAny) return true;
  const allowed = ALLOWED_CTA_PHRASES[kind];
  return allowed.some((re) => re.test(body));
}
