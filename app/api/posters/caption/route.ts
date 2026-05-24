import { getActiveSessionUser } from "@/lib/auth/session";
import { createChatCompletion } from "@/lib/volcano-engine/chat";

type CaptionRequest = {
  industry?: string;       // "pressure_washing" | "auto_detailing"
  channel?: string;        // "google_business_profile" | "facebook_nextdoor" | "instagram"
  serviceType?: string;    // e.g. "driveway", "patio", "exterior"
  businessName?: string;
  serviceArea?: string;
  description?: string;    // what the user did on this job (free-text)
};

type CaptionResponse = {
  headlines: string[];
  caption: string;
};

function buildPrompt(input: CaptionRequest): string {
  const industryLabel =
    input.industry === "auto_detailing" ? "auto detailing" : "pressure washing";

  const channelLabel =
    input.channel === "instagram"
      ? "Instagram"
      : input.channel === "facebook_nextdoor"
      ? "Facebook / Nextdoor"
      : "Google Business Profile";

  const contextLines: string[] = [];
  if (input.description) contextLines.push(`What we did: ${input.description}`);
  if (input.serviceType) contextLines.push(`Service: ${input.serviceType}`);
  if (input.businessName) contextLines.push(`Business: ${input.businessName}`);
  if (input.serviceArea) contextLines.push(`Area: ${input.serviceArea}`);
  contextLines.push(`Platform: ${channelLabel}`);

  return `You are a local home services marketing expert.

Generate exactly 3 poster headlines and 1 social media post caption for a ${industryLabel} job completion post.

Context:
${contextLines.join("\n")}

RULES for headlines:
- Each headline must be 12–36 characters (count carefully)
- Showcase the result, not the company
- Use active, confident tone
- No hashtags
- Good examples: "Driveway Fully Restored", "Cleaned. Ready to Impress.", "Before & After — Done Right"

RULES for ${channelLabel} caption:
- 120–220 characters
- Professional and trust-building, not salesy
- Mention service area if provided
${input.channel === "instagram" ? "- Include 3-5 relevant local service hashtags" : input.channel === "facebook_nextdoor" ? "- Sound like a local neighbor sharing a win, not an ad" : "- No hashtags, professional tone for GBP"}

Return ONLY valid JSON, no markdown, no explanation:
{"headlines":["<headline 1>","<headline 2>","<headline 3>"],"caption":"<caption text>"}`;
}

function stubResponse(input: CaptionRequest): CaptionResponse {
  const verbsByIndustry: Record<string, [string, string, string]> = {
    pressure_washing: ["Spotless", "Brought Back to New", "Gone in Hours"],
    auto_detailing: ["Mirror Finish", "Showroom Clean", "Like-New Inside"],
  };
  const industryKey =
    input.industry === "auto_detailing" ? "auto_detailing" : "pressure_washing";
  const v = verbsByIndustry[industryKey];

  // Pull a short noun from the description if available
  const noun = (() => {
    if (!input.description) return "Job";
    const m = input.description.match(/\b([A-Z][a-z]+|[a-z]{4,})\b/);
    return m?.[1] ?? "Job";
  })();
  const headlines = [
    `${noun} ${v[0]}`.slice(0, 36),
    `${input.businessName ?? "We"} ${v[1]}`.slice(0, 36),
    `Fresh Results in ${input.serviceArea ?? "Your Area"}`.slice(0, 36),
  ];
  const captionBase = input.description
    ? `${input.description} — call us for a free quote!`
    : `${input.businessName ?? "Our crew"} just wrapped up another local job — call for a free quote!`;
  return { headlines, caption: captionBase.slice(0, 220) };
}

function parseResult(content: string): CaptionResponse {
  // Extract JSON from content (handle markdown code blocks if LLM wraps it)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in LLM response");

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  if (
    !Array.isArray(parsed.headlines) ||
    parsed.headlines.length === 0 ||
    typeof parsed.caption !== "string"
  ) {
    throw new Error("Invalid response shape");
  }

  const headlines = (parsed.headlines as unknown[])
    .filter((h): h is string => typeof h === "string")
    .slice(0, 3);

  if (headlines.length === 0) throw new Error("No valid headlines");

  return { headlines, caption: parsed.caption };
}

export async function POST(request: Request): Promise<Response> {
  // Auth
  const access = await getActiveSessionUser(request.headers);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  // Parse body
  let body: CaptionRequest = {};
  try {
    body = (await request.json()) as CaptionRequest;
  } catch {
    // Body is optional — use empty defaults
  }

  // Call LLM — on any failure (network, bad JSON, schema mismatch) fall back to
  // a deterministic stub so the UI always has 3 candidate headlines + a caption.
  try {
    const completion = await createChatCompletion(
      [{ role: "user", content: buildPrompt(body) }],
      { temperature: 0.8, max_tokens: 512 }
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const result = parseResult(content);

    return Response.json(result, { status: 200 });
  } catch (err) {
    console.warn("[posters/caption] LLM call failed, returning stub:", err);
    return Response.json(stubResponse(body), { status: 200 });
  }
}
