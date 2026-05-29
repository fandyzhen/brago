import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brandVoiceProfile } from "@/lib/db/schema";
import {
  type BrandVoiceProfile,
  type CustomerLanguage,
  DEFAULT_BRAND_VOICE,
} from "./types";

export async function getBrandVoice(
  userId: string,
): Promise<BrandVoiceProfile> {
  const rows = await db
    .select()
    .from(brandVoiceProfile)
    .where(eq(brandVoiceProfile.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return DEFAULT_BRAND_VOICE;
  try {
    const parsed = JSON.parse(row.voiceJson) as BrandVoiceProfile;
    return { ...DEFAULT_BRAND_VOICE, ...parsed };
  } catch {
    return DEFAULT_BRAND_VOICE;
  }
}

export async function getCustomerLanguage(
  userId: string,
): Promise<CustomerLanguage> {
  const rows = await db
    .select({ lang: brandVoiceProfile.customerLanguage })
    .from(brandVoiceProfile)
    .where(eq(brandVoiceProfile.userId, userId))
    .limit(1);
  return (rows[0]?.lang as CustomerLanguage | undefined) ?? "en";
}

export async function saveBrandVoice(
  userId: string,
  voice: BrandVoiceProfile,
  brandProfileId?: string | null,
): Promise<string> {
  const existing = await db
    .select({ id: brandVoiceProfile.id })
    .from(brandVoiceProfile)
    .where(eq(brandVoiceProfile.userId, userId))
    .limit(1);

  const payload = {
    voiceJson: JSON.stringify(voice),
    customerLanguage: voice.customerLanguage,
    brandProfileId: brandProfileId ?? null,
  };

  if (existing[0]) {
    await db
      .update(brandVoiceProfile)
      .set(payload)
      .where(eq(brandVoiceProfile.id, existing[0].id));
    return existing[0].id;
  }

  const id = randomUUID();
  await db.insert(brandVoiceProfile).values({ id, userId, ...payload });
  return id;
}
