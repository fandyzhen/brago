import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import {
  assertTrialQuota,
  TrialQuotaExceededError,
  hashIp,
  getClientIp,
} from "@/lib/brago/anonymous/quota";
import { writeAnonIdCookie } from "@/lib/brago/anonymous/cookies";

export const runtime = "nodejs";

const bodySchema = z.object({
  industry: z.string().min(1).max(32),
  serviceType: z.string().min(1).max(64),
  // accept null + missing so the client can lazy-create the post before the
  // user has filled in location/brand info
  serviceArea: z.string().max(200).nullable().optional(),
  brandName: z.string().max(120).nullable().optional(),
  brandPhone: z.string().max(40).nullable().optional(),
  tone: z.enum(["friendly", "professional", "local_pride"]).optional(),
  language: z.enum(["en", "es"]),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const ip = getClientIp(req.headers);
  const ipHash = hashIp(ip);
  const anonId = `anon_${crypto.randomUUID()}`;

  try {
    await assertTrialQuota({ ipHash, anonId });
  } catch (error) {
    if (error instanceof TrialQuotaExceededError) {
      return NextResponse.json(
        { error: "trial_used", message: "Daily free trial reached. Sign up to keep going." },
        { status: 429 },
      );
    }
    throw error;
  }

  const postId = `gp_${crypto.randomUUID()}`;
  await db.insert(googlePost).values({
    id: postId,
    userId: null,
    anonId,
    industry: parsed.industry,
    serviceType: parsed.serviceType,
    serviceArea: parsed.serviceArea ?? null,
    language: parsed.language,
    status: "draft",
    imageMode: "single_after",
  });

  await writeAnonIdCookie(anonId);

  return NextResponse.json({
    postId,
    anonId,
    brand: { name: parsed.brandName, phone: parsed.brandPhone ?? null, tone: parsed.tone },
  });
}
