"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/container";
import { Background } from "@/components/background";

type Post = {
  id: string;
  industry: string;
  serviceType: string;
  serviceArea: string | null;
  status: "draft" | "ready" | "posted_manually" | "archived";
  language: "en" | "es";
  imageMode: "single_after" | "before_after_proof";
  bestPhotoId: string | null;
  beforePhotoId: string | null;
  afterPhotoId: string | null;
  caption: string | null;
  finalImageUrl: string | null;
  proofRecommendationJson: string | null;
};

type Photo = {
  id: string;
  thumbnailUrl: string | null;
  processedUrl: string | null;
  originalUrl: string;
  detectedRole: string | null;
  roleConfidence: number | null;
  bestAfterScore: number | null;
  whySelected: string | null;
  riskFlagsJson: string | null;
};

const STATUS_LABEL: Record<Post["status"], string> = {
  draft: "Draft",
  ready: "Ready for Google",
  posted_manually: "Posted to Google",
  archived: "Archived",
};

export default function GooglePostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!postId) return;
    setError(null);
    try {
      const res = await fetch(`/api/brago/google-posts/${postId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load");
      setPost(data.post as Post);
      setPhotos((data.photos ?? []) as Photo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const onMarkPosted = async () => {
    if (!postId) return;
    setMarking(true);
    try {
      await fetch(`/api/brago/google-posts/${postId}/mark-posted`, {
        method: "POST",
      });
      await refetch();
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <Container className="relative z-10 py-12">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </Container>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <Container className="relative z-10 py-12 max-w-xl">
          <p className="text-sm">{error ?? "Post not found."}</p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm underline">
            Back to dashboard
          </Link>
        </Container>
      </div>
    );
  }

  const preview = photos[0];

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="relative z-10 py-12 max-w-xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Google post for {post.serviceType}
        </p>
        <h1 className="text-2xl font-bold">
          {post.serviceArea ? `${post.serviceArea} · ${post.serviceType}` : post.serviceType}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Status: {STATUS_LABEL[post.status]} · {post.language.toUpperCase()} · Mode: {post.imageMode === "before_after_proof" ? "Before & after proof" : "Single after"}
        </p>

        {/* Hero photo / placeholder */}
        <div className="mt-6">
          {post.finalImageUrl ? (
            <img
              src={post.finalImageUrl}
              alt=""
              className="w-full rounded-2xl border border-border"
            />
          ) : preview ? (
            <img
              src={preview.thumbnailUrl ?? preview.processedUrl ?? preview.originalUrl}
              alt=""
              className="w-full rounded-2xl border border-border"
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Photos and AI selection wire up in the next phase.
            </div>
          )}
        </div>

        {/* Photos grid */}
        {photos.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-md border border-border"
              >
                <img
                  src={p.thumbnailUrl ?? p.processedUrl ?? p.originalUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {p.detectedRole && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 text-white text-[10px] px-1">
                    {p.detectedRole}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Caption placeholder */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-medium mb-2">Caption</h2>
          {post.caption ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Caption generation lands in Phase 5. Once enabled, click &ldquo;Write Google caption&rdquo; below.
            </p>
          )}
        </section>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={onMarkPosted}
            disabled={marking || post.status === "posted_manually"}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            {post.status === "posted_manually" ? "Marked as posted" : "Mark as posted"}
          </button>
          {post.caption && (
            <button
              onClick={() => post.caption && navigator.clipboard.writeText(post.caption)}
              className="rounded-full bg-foreground text-background px-4 py-2 text-sm"
            >
              Copy Google post
            </button>
          )}
          <Link
            href="/dashboard"
            className="rounded-full px-4 py-2 text-sm text-muted-foreground underline"
          >
            Back to dashboard
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </Container>
    </div>
  );
}
