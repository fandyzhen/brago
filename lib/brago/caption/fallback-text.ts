import "server-only";
import type {
  CaptionInput,
  CaptionResult,
  TextProvider,
} from "./text-provider";

const ES_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bToday\b/gi, "Hoy"],
  [/\bCleaned up\b/gi, "Limpiamos"],
  [/\bcleaning\b/gi, "limpieza"],
  [/\bdriveway\b/gi, "entrada de auto"],
  [/\bpatio\b/gi, "patio"],
  [/\bwindow\b/gi, "ventana"],
  [/\bsiding\b/gi, "revestimiento"],
  [/\bdeck\b/gi, "terraza"],
  [/\binterior detail\b/gi, "detallado interior"],
];

export function createFallbackTextProvider(): TextProvider {
  return {
    name: "fallback-template",
    async generateGoogleCaption(input: CaptionInput): Promise<CaptionResult> {
      const example =
        input.templateExamples[0] ??
        "Took care of a {serviceType} in {area} today.";
      const city = input.serviceArea ?? "your neighborhood";
      let caption = example
        .replace(/\{city\}/g, city)
        .replace(/\{serviceType\}/g, input.serviceType)
        .replace(/\{area\}/g, city);
      if (input.language === "es") {
        for (const [re, target] of ES_REPLACEMENTS) {
          caption = caption.replace(re, target);
        }
      }
      return {
        caption,
        language: input.language,
        source: "fallback-template",
      };
    },
  };
}
