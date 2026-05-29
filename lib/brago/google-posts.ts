import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { googlePost, googlePostPhoto } from "@/lib/db/schema";
import type {
  CaptionLanguage,
  GooglePostStatus,
  ImageMode,
  Industry,
} from "./types";

export type CreateGooglePostInput = {
  userId: string;
  brandProfileId?: string | null;
  industry: Industry;
  serviceType: string;
  serviceArea?: string | null;
  jobLocation?: string | null;
  language?: CaptionLanguage;
};

export async function createGooglePost(
  input: CreateGooglePostInput,
): Promise<string> {
  const id = randomUUID();
  await db.insert(googlePost).values({
    id,
    userId: input.userId,
    brandProfileId: input.brandProfileId ?? null,
    industry: input.industry,
    serviceType: input.serviceType,
    serviceArea: input.serviceArea ?? null,
    jobLocation: input.jobLocation ?? null,
    language: input.language ?? "en",
    status: "draft",
    imageMode: "single_after",
    ctaRecommendation: "call_now_button",
  });
  return id;
}

export async function getGooglePostById(postId: string, userId: string) {
  const rows = await db
    .select()
    .from(googlePost)
    .where(and(eq(googlePost.id, postId), eq(googlePost.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listGooglePostsByUser(
  userId: string,
  limit = 20,
) {
  return db
    .select()
    .from(googlePost)
    .where(eq(googlePost.userId, userId))
    .orderBy(desc(googlePost.createdAt))
    .limit(limit);
}

export type UpdateGooglePostPatch = Partial<{
  status: GooglePostStatus;
  bestPhotoId: string | null;
  imageMode: ImageMode;
  beforePhotoId: string | null;
  afterPhotoId: string | null;
  proofRecommendationJson: string | null;
  finalImageUrl: string | null;
  caption: string | null;
  captionPolicyJson: string | null;
  language: CaptionLanguage;
  postedAt: Date | null;
}>;

export async function updateGooglePost(
  postId: string,
  userId: string,
  patch: UpdateGooglePostPatch,
): Promise<string | null> {
  const result = await db
    .update(googlePost)
    .set(patch)
    .where(and(eq(googlePost.id, postId), eq(googlePost.userId, userId)))
    .returning({ id: googlePost.id });
  return result[0]?.id ?? null;
}

export async function markGooglePostPosted(postId: string, userId: string) {
  return updateGooglePost(postId, userId, {
    status: "posted_manually",
    postedAt: new Date(),
  });
}

export async function countPostsThisWeek(userId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(googlePost)
    .where(
      and(
        eq(googlePost.userId, userId),
        gte(googlePost.createdAt, sevenDaysAgo),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function getGooglePostPhotos(postId: string) {
  return db
    .select()
    .from(googlePostPhoto)
    .where(eq(googlePostPhoto.googlePostId, postId));
}
