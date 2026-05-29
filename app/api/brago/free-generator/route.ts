import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FALLBACK_TEMPLATES: Record<string, string> = {
  driveway:
    "Knocked out a driveway in {city} today. Pulled out years of grime and dark stains and the concrete came back bright. If yours is starting to look the same, the Call button on our Google profile is the easiest way to reach us.",
  patio:
    "Patio in {city} got a deep clean today. Cleared off the green mildew that builds up after a wet stretch, so it's ready for grilling weather.",
  siding:
    "House wash done in {city}. Soft-washed the siding so we didn't push water behind the panels, and pulled off the buildup that makes a place look dingy from the street.",
  walkway:
    "Walkway cleaning in {city}. Took the slick algae layer off so it's safer to walk on, and the brick color came back through.",
  deck:
    "Deck wash in {city}. Used a lower pressure pass for the wood grain and the boards came out cleaner without raising fibers.",
};

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const city = (form.get("city") as string | null)?.trim() || "your neighborhood";
  const serviceType = (form.get("serviceType") as string | null) || "driveway";
  const template = FALLBACK_TEMPLATES[serviceType] ?? FALLBACK_TEMPLATES.driveway;
  const caption = template.replace(/\{city\}/g, city);

  return NextResponse.json({
    caption,
    source: "fallback-template",
    note:
      "Free draft from a template. Sign up to use Brago's full caption engine — best after shot, history-aware wording, and Spanish output.",
  });
}
