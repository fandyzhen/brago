import "server-only";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { uploadConsent } from "@/lib/db/schema";

export type RecordConsentInput = {
  userId: string;
  googlePostId?: string | null;
  hasMarketingPermission: boolean;
  acceptedTermsVersion?: string;
};

export async function recordConsent(input: RecordConsentInput): Promise<string> {
  const id = randomUUID();
  await db.insert(uploadConsent).values({
    id,
    userId: input.userId,
    googlePostId: input.googlePostId ?? null,
    hasMarketingPermission: input.hasMarketingPermission,
    acceptedTermsVersion: input.acceptedTermsVersion ?? "v1",
  });
  return id;
}
