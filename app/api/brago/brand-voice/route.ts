import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getBrandVoice, saveBrandVoice } from "@/lib/brago/brand-voice";

export const runtime = "nodejs";

const voiceSchema = z.object({
  speaker: z.enum(["local_owner", "crew", "premium_service"]),
  tone: z.array(z.string().max(48)).max(8),
  avoid: z.array(z.string().max(48)).max(8),
  customerLanguage: z.enum(["en", "es", "mixed"]),
  serviceAreas: z.array(z.string().max(80)).max(20),
  verifiedClaims: z
    .object({
      licensed: z.boolean().optional(),
      insured: z.boolean().optional(),
      familyOwned: z.boolean().optional(),
      yearsInBusiness: z.number().int().min(0).max(120).optional(),
      reviewCount: z.number().int().min(0).max(99999).optional(),
    })
    .default({}),
  ctaStyle: z.enum(["call_now_button", "soft_contact", "no_cta"]),
  brandProfileId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const voice = await getBrandVoice(access.user.id);
  return NextResponse.json({ voice });
}

export async function PUT(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = voiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid voice profile" },
      { status: 400 },
    );
  }
  const { brandProfileId, ...voice } = parsed.data;
  const id = await saveBrandVoice(access.user.id, voice, brandProfileId);
  return NextResponse.json({ id });
}
