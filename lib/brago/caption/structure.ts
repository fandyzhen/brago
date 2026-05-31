import type { GbpPolicyIssue } from "@/lib/brago/types";

const TIME_ANCHOR_RE =
  /\b(today|this morning|this afternoon|tonight|yesterday|last (?:week|night)|before (?:the )?(?:holiday|weekend|christmas|thanksgiving))\b|\b(hoy|esta mañana|esta tarde|anoche|ayer|antes del (?:fin de semana|feriado))\b/i;

const ALL_CAPS_WORD_RE = /\b[A-ZÁÉÍÓÚÑ]{2,}\b/g;

export type StructureContext = {
  serviceType: string;
  serviceArea: string | null;
};

export type StructureResult = {
  title: string;
  body: string;
  issues: GbpPolicyIssue[];
};

export function parseCaptionParts(text: string): {
  title: string;
  body: string;
} {
  const trimmed = (text ?? "").trim();
  // spec §2.1：标题与正文以一个空白行隔开；若无空行，视为无标题。
  const split = trimmed.split(/\n\s*\n+/);
  if (split.length >= 2 && split[0].length <= 80) {
    return {
      title: split[0].trim(),
      body: split.slice(1).join("\n\n").trim(),
    };
  }
  return { title: "", body: trimmed };
}

function isAllCaps(s: string): boolean {
  const caps = (s.match(ALL_CAPS_WORD_RE) ?? []).length;
  const words = s.split(/\s+/).filter(Boolean).length;
  if (words === 0) return false;
  // 标题至少 60% 单词全大写视为 shouting
  return caps / words >= 0.6;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valuePropAnchorsHit(
  first100: string,
  ctx: StructureContext,
): number {
  let hits = 0;
  const lower = first100.toLowerCase();
  // 服务匹配：用 serviceType 的第一个有意义 token
  const serviceTokens = ctx.serviceType
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter((t) => t.length >= 4);
  if (
    serviceTokens.some((t) => lower.includes(t)) ||
    /\b(clean|cleaning|wash|detail|polish|coating|limpieza|lavado)\b/i.test(
      first100,
    )
  ) {
    hits += 1;
  }
  // 地点匹配
  if (
    ctx.serviceArea &&
    new RegExp(`\\b${escapeRegExp(ctx.serviceArea)}\\b`, "i").test(first100)
  ) {
    hits += 1;
  }
  // 时间锚定
  if (TIME_ANCHOR_RE.test(first100)) {
    hits += 1;
  }
  return hits;
}

export function checkCaptionStructure(
  text: string,
  ctx: StructureContext,
): StructureResult {
  const { title, body } = parseCaptionParts(text);
  const issues: GbpPolicyIssue[] = [];

  // spec §2.1：标题必须存在、不全大写、30-50 字符（允许 ±20% 弹性 → 24-60）
  if (!title) {
    issues.push("missing_title");
  } else if (isAllCaps(title)) {
    issues.push("title_all_caps");
  }

  // spec §2.1：正文 100-300 字符（不含标题）
  const bodyLen = body.length;
  if (bodyLen < 100 || bodyLen > 300) {
    issues.push("length_out_of_range");
  }

  // spec §2.2：前 100 字必须含至少 2 个 value-prop 锚定（服务 / 地点 / 时间）
  const hits = valuePropAnchorsHit(body.slice(0, 100), ctx);
  if (hits < 2) issues.push("value_prop_missing");

  return { title, body, issues };
}
