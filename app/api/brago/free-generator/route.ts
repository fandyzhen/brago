import { NextRequest, NextResponse } from "next/server";
import {
  currentSeasonFor,
  findTemplates,
} from "@/lib/brago/caption/templates";
import { checkGooglePolicy } from "@/lib/brago/caption/policy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const city =
    (form.get("city") as string | null)?.trim() || "your neighborhood";
  const serviceType =
    (form.get("serviceType") as string | null) || "driveway";

  const templates = findTemplates({
    industry: "pressure_washing",
    serviceType,
    season: currentSeasonFor(),
    limit: 1,
  });
  const tmpl =
    templates[0]?.templateText ?? "Took care of a {serviceType} in {city} today.";
  const caption = tmpl
    .replace(/\{city\}/g, city)
    .replace(/\{serviceType\}/g, serviceType);
  const policy = checkGooglePolicy(caption);
  return NextResponse.json({
    caption,
    policy,
    source: "fallback-template",
    note:
      "Free draft from a template. Sign up to use Brago's full caption engine — best after shot, history-aware wording, and Spanish output.",
  });
}
