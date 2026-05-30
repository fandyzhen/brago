import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import {
  copyR2Object,
  keyFromPublicUrl,
  buildClaimedKey,
} from "@/lib/brago/r2-upload";

export async function claimAnonymousPost(
  userId: string,
  anonId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(googlePost)
    .where(eq(googlePost.anonId, anonId))
    .limit(1);
  const post = rows[0];
  if (!post) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(googlePost)
      .set({ userId, anonId: null })
      .where(eq(googlePost.id, post.id));
    await tx
      .update(googlePostPhoto)
      .set({ userId })
      .where(eq(googlePostPhoto.googlePostId, post.id));
  });

  // R2 file migration is outside the tx (R2 has no rollback).
  // Failure here leaves the user with a DB-claimed post but anon-tmp URLs;
  // those URLs still work for ~24h until R2 lifecycle clears them.
  try {
    const photos = await db
      .select()
      .from(googlePostPhoto)
      .where(eq(googlePostPhoto.googlePostId, post.id));
    for (const p of photos) {
      const srcKey = keyFromPublicUrl(p.originalUrl);
      if (!srcKey || !srcKey.startsWith("anon-tmp/")) continue;
      const suffix = srcKey.split("/").pop() || "img.jpg";
      const destKey = buildClaimedKey(userId, post.id, p.id, suffix);
      const newUrl = await copyR2Object(srcKey, destKey);
      await db
        .update(googlePostPhoto)
        .set({ originalUrl: newUrl })
        .where(eq(googlePostPhoto.id, p.id));
    }
  } catch (error) {
    console.error("[claim] R2 migration partial failure:", error);
  }

  return post.id;
}
