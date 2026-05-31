import "server-only";
import { getBrandVoice } from "@/lib/brago/brand-voice";
import {
  getRecentHistory,
  recordCaptionHistory,
} from "./history";
import { currentSeasonFor, findTemplates } from "./templates";
import { checkGooglePolicy } from "./policy";
import {
  getTextProvider,
  isAiTextAvailable,
} from "./text-provider";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";

export type GenerateCaptionInput = {
  userId: string;
  googlePostId?: string | null;
  industry: Industry;
  serviceType: string;
  serviceArea: string | null;
  language: CaptionLanguage;
  customInstruction?: string;
};

export type GenerateCaptionOutput = {
  caption: string;
  source: "ai" | "fallback-template";
  policy: ReturnType<typeof checkGooglePolicy>;
  usedTemplateIds: string[];
  recentCaptions: string[];
};

export async function generateCaption(
  input: GenerateCaptionInput,
): Promise<GenerateCaptionOutput> {
  const [voice, history] = await Promise.all([
    getBrandVoice(input.userId),
    getRecentHistory(input.userId, input.serviceType, 10),
  ]);

  const templates = findTemplates({
    industry: input.industry,
    serviceType: input.serviceType,
    season: currentSeasonFor(),
    limit: 5,
  });

  const avoidOpenings = history
    .map((h) => h.openingPhrase ?? "")
    .filter(Boolean);
  const avoidPhrases: string[] = [];
  for (const h of history) {
    try {
      const parsed = JSON.parse(h.keyPhrasesJson ?? "[]") as string[];
      avoidPhrases.push(...parsed);
    } catch {
      // ignore malformed history rows
    }
    if (avoidPhrases.length > 12) break;
  }

  const claims = voice.verifiedClaims ?? {};
  const allowVerifiedClaims = Boolean(
    claims.licensed || claims.insured || claims.familyOwned,
  );

  const provider = getTextProvider();
  let caption = "";
  let lastIssues: string[] = [];
  let usedSource: "ai" | "fallback-template" = "ai";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await provider.generateGoogleCaption({
        industry: input.industry,
        serviceType: input.serviceType,
        serviceArea: input.serviceArea,
        language: input.language,
        brandVoice: voice,
        templateExamples: templates.map((t) =>
          t.templateText.replace(
            /\{city\}/g,
            input.serviceArea ?? "your neighborhood",
          ),
        ),
        avoidOpenings,
        avoidPhrases: avoidPhrases.slice(0, 12),
        customInstruction:
          attempt > 0
            ? `Previous attempt violated: ${lastIssues.join(", ")}. Fix those issues.`
            : input.customInstruction,
      });
      const policy = checkGooglePolicy(res.caption, {
        allowVerifiedClaims,
        language: input.language,
        ctx: {
          serviceType: input.serviceType,
          serviceArea: input.serviceArea,
        },
        recentCaptions: history.map((h) => h.captionText),
      });
      if (policy.valid) {
        caption = res.caption;
        usedSource = res.source;
        break;
      }
      lastIssues = policy.issues;
    } catch (err) {
      console.error(
        `[brago caption] provider error attempt=${attempt}`,
        err,
      );
      lastIssues = ["provider_error"];
      break;
    }
  }

  if (!caption) {
    const fallback =
      templates[0]?.templateText ??
      "Took care of a {serviceType} in {city} today.";
    caption = fallback
      .replace(/\{city\}/g, input.serviceArea ?? "your neighborhood")
      .replace(/\{serviceType\}/g, input.serviceType);
    usedSource = "fallback-template";
  }

  try {
    await recordCaptionHistory({
      userId: input.userId,
      googlePostId: input.googlePostId,
      captionText: caption,
      language: input.language,
      industry: input.industry,
      serviceType: input.serviceType,
    });
  } catch (err) {
    console.error("[brago caption] failed to record history", err);
  }

  const finalPolicy = checkGooglePolicy(caption, {
    allowVerifiedClaims,
    language: input.language,
    ctx: {
      serviceType: input.serviceType,
      serviceArea: input.serviceArea,
    },
    recentCaptions: history.map((h) => h.captionText),
  });
  return {
    caption,
    source: usedSource,
    policy: finalPolicy,
    usedTemplateIds: templates.map((t) => t.id),
    recentCaptions: history.map((h) => h.captionText),
  };
}

export function isCaptionAiAvailable(): boolean {
  return isAiTextAvailable();
}
