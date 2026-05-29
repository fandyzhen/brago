import "server-only";
import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { captionHistory } from "@/lib/db/schema";
import type { CaptionLanguage, Industry } from "@/lib/brago/types";

export function extractOpeningPhrase(text: string): string {
  const trimmed = (text ?? "")
    .trim()
    .replace(/^[^\w]+/, "")
    .replace(/\n/g, " ");
  const firstSentence = trimmed.split(/[.!?]/)[0] ?? "";
  return firstSentence.split(/\s+/).slice(0, 6).join(" ").toLowerCase();
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "of",
  "in",
  "on",
  "at",
  "for",
  "to",
  "is",
  "was",
  "were",
  "with",
  "this",
  "that",
  "we",
  "i",
  "you",
  "your",
  "our",
  "my",
  "it",
  "its",
  "they",
  "them",
  "their",
  "got",
  "go",
  "gone",
  "from",
  "by",
]);

export function extractKeyPhrases(text: string, max = 5): string[] {
  const words = (text ?? "")
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const counts = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (STOP_WORDS.has(a) || STOP_WORDS.has(b)) continue;
    if (a.length < 3 || b.length < 3) continue;
    const phrase = `${a} ${b}`;
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, max)
    .map(([phrase]) => phrase);
}

export type RecordHistoryInput = {
  userId: string;
  googlePostId?: string | null;
  captionText: string;
  language: CaptionLanguage;
  industry: Industry;
  serviceType: string;
};

export async function recordCaptionHistory(
  input: RecordHistoryInput,
): Promise<string> {
  const id = randomUUID();
  const opening = extractOpeningPhrase(input.captionText);
  const keys = extractKeyPhrases(input.captionText);
  await db.insert(captionHistory).values({
    id,
    userId: input.userId,
    googlePostId: input.googlePostId ?? null,
    captionText: input.captionText,
    language: input.language,
    industry: input.industry,
    serviceType: input.serviceType,
    openingPhrase: opening,
    keyPhrasesJson: JSON.stringify(keys),
  });
  return id;
}

export async function getRecentHistory(
  userId: string,
  serviceType: string,
  limit = 10,
) {
  return db
    .select()
    .from(captionHistory)
    .where(
      and(
        eq(captionHistory.userId, userId),
        eq(captionHistory.serviceType, serviceType),
      ),
    )
    .orderBy(desc(captionHistory.createdAt))
    .limit(limit);
}
