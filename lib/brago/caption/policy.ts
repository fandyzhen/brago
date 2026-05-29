import type { GbpPolicyIssue, PolicyCheckResult } from "@/lib/brago/types";

// Matches things like 512-555-1234, (512) 555-1234, 5125551234, +1 512 555 1234
const PHONE_RE = /(?:\+?\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/;

// Matches absolute URLs and bare .com/.net/etc. (loose but cheap)
const URL_RE = /(?:https?:\/\/|www\.|[\w-]{2,}\.(?:com|net|org|co|io|us|biz|info|app|shop)\b)/i;

const EM_DASH_RE = /—/;

// Two-plus consecutive all-caps words of 4+ letters each.
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

// Verified-claim probe: spec 18 says we must not assert credentials we have not verified.
// This regex catches naked claims; the caption engine will only emit these when the brand
// voice flag is on.
const UNVERIFIED_CLAIM_RE = /\b(licensed and insured|fully insured|licensed\s+(?:in|and))\b/i;

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export type PolicyCheckOptions = {
  // Set true when the brand voice has confirmed the relevant claim — that
  // means an "unverified_claim" hit is OK and should be skipped.
  allowVerifiedClaims?: boolean;
};

export function checkGooglePolicy(
  text: string,
  options: PolicyCheckOptions = {},
): PolicyCheckResult {
  const issues: GbpPolicyIssue[] = [];
  const trimmed = (text ?? "").trim();
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
  }
}
