import type {
  CaptionLanguage,
  GbpPolicyIssue,
  PolicyCheckResult,
} from "@/lib/brago/types";
import { containsBlacklistedPhrase } from "./blacklist";
import {
  checkCaptionStructure,
  parseCaptionParts,
  type StructureContext,
} from "./structure";
import { isTooSimilar } from "./similarity";
import { classifyPostKind, isCtaAligned } from "./cta-alignment";

// 旧 gate（spec §2.6 保留 + 强化）
const PHONE_RE =
  /(?:\+?\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/;
const URL_RE =
  /(?:https?:\/\/|www\.|[\w-]{2,}\.(?:com|net|org|co|io|us|biz|info|app|shop)\b)/i;
const EM_DASH_RE = /—/;
// 2个以上连续 4+ 字大写词视为 shouting
const ALL_CAPS_RUN = /\b[A-Z]{4,}\b(?:\s+\b[A-Z]{4,}\b){1,}/;

const AI_CLICHES: RegExp[] = [
  /\blooking to\b/i,
  /\bwhether you need\b/i,
  /\btransform your\b/i,
  /\bsay goodbye to\b/i,
  /\bwe take pride in\b/i,
  /\banother satisfying job\b/i,
  /\bbrought back to life\b/i,
  /\btough grime\b/i,
  /\bsatisfying result\b/i,
];

const UNVERIFIED_CLAIM_RE =
  /\b(licensed and insured|fully insured|licensed\s+(?:in|and))\b/i;

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export type PolicyCheckOptions = {
  allowVerifiedClaims?: boolean;
  language?: CaptionLanguage;
  ctx?: StructureContext;
  recentCaptions?: string[];
};

export function checkGooglePolicy(
  text: string,
  options: PolicyCheckOptions = {},
): PolicyCheckResult {
  const issues: GbpPolicyIssue[] = [];
  const trimmed = (text ?? "").trim();
  const language = options.language ?? "en";

  // 原有 gate
  if (trimmed.length > 1500) issues.push("too_long");
  if (PHONE_RE.test(trimmed)) issues.push("phone_number_detected");
  if (URL_RE.test(trimmed)) issues.push("url_detected");
  if (EM_DASH_RE.test(trimmed)) issues.push("em_dash_detected");
  if (ALL_CAPS_RUN.test(trimmed)) issues.push("shouting_text");
  if (AI_CLICHES.some((re) => re.test(trimmed))) issues.push("ai_cliche");
  if (!options.allowVerifiedClaims && UNVERIFIED_CLAIM_RE.test(trimmed)) {
    issues.push("unverified_claim");
  }
  const emojiCount = (trimmed.match(EMOJI_RE) ?? []).length;
  if (emojiCount > 2) issues.push("too_many_emojis");

  // 新 gate
  if (containsBlacklistedPhrase(trimmed, language)) {
    issues.push("blacklisted_phrase");
  }

  if (options.ctx) {
    const struct = checkCaptionStructure(trimmed, options.ctx);
    for (const issue of struct.issues) {
      if (!issues.includes(issue)) issues.push(issue);
    }
    // CTA 对齐（用 structure 解析出来的 body）
    const kind = classifyPostKind(struct.body);
    if (!isCtaAligned(kind, struct.body)) issues.push("cta_misaligned");
  } else {
    // 即使没有 ctx 也要至少解析出 body 做 CTA 对齐
    const { body } = parseCaptionParts(trimmed);
    const kind = classifyPostKind(body);
    if (!isCtaAligned(kind, body)) issues.push("cta_misaligned");
  }

  if (options.recentCaptions && options.recentCaptions.length > 0) {
    if (isTooSimilar(trimmed, options.recentCaptions)) {
      issues.push("similar_to_recent");
    }
  }

  return { valid: issues.length === 0, issues };
}

export function policyIssueLabel(issue: GbpPolicyIssue): string {
  switch (issue) {
    case "phone_number_detected":
      return "Phone number detected — let Google's Call button handle that.";
    case "url_detected":
      return "URL detected — keep links out of the caption.";
    case "too_long":
      return "Caption is over 1500 characters.";
    case "too_many_emojis":
      return "Too many emojis (max 2).";
    case "shouting_text":
      return "Avoid ALL-CAPS marketing shouts.";
    case "unverified_claim":
      return "Unverified claim — only mention licenses/insurance after you confirm them in Posting style.";
    case "ai_cliche":
      return "Sounds AI-generated — make it more specific.";
    case "em_dash_detected":
      return "Avoid em dashes.";
    case "missing_title":
      return "Add a one-line title separated from the body by a blank line.";
    case "title_all_caps":
      return "Title should be in normal case, not ALL CAPS.";
    case "length_out_of_range":
      return "Body should be 100-300 characters.";
    case "value_prop_missing":
      return "First 100 chars must include the service, the area, or a time anchor.";
    case "blacklisted_phrase":
      return "Sounds like a template — avoid 'trusted/expert/best in [city]' phrasing.";
    case "cta_misaligned":
      return "CTA doesn't match the post intent (e.g. don't use 'Call now' on a how-to post).";
    case "similar_to_recent":
      return "Too similar to a recent caption — Google may flag template farming.";
  }
}
