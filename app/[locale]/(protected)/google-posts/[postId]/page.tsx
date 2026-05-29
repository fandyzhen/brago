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

type RiskFlags = {
  visibleFace: boolean;
  visibleLicensePlate: boolean;
  visibleHouseNumber: boolean;
  tooBlurryToUse: boolean;
  tooDarkToUse: boolean;
  likelyCustomerPrivateProperty: boolean;
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  const refetch = useCallback(async () => {
    if (!postId) return;
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

  const callAnalyze = async () => {
    if (!postId) return;
    setBusy("Analyzing photos…");
    setError(null);
    try {
      const res = await fetch(`/api/brago/google-posts/${postId}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analyze failed");
      if (typeof data.aiAvailable === "boolean") setAiAvailable(data.aiAvailable);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setBusy(null);
    }
  };

  const callGenerateCaption = async (overrides: {
    language?: Post["language"];
    style?: string;
  } = {}) => {
    if (!postId) return;
    setBusy("Writing Google caption…");
    setError(null);
    try {
      const res = await fetch(
        `/api/brago/google-posts/${postId}/generate-caption`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: overrides.language ?? post?.language,
            customInstruction: overrides.style,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Caption failed");
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caption failed");
    } finally {
      setBusy(null);
    }
  };

  const callRewrite = async (style: string) => {
    if (!postId) return;
    setBusy(`Rewriting (${style})…`);
    setError(null);
    try {
      const res = await fetch(`/api/brago/google-posts/${postId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Rewrite failed");
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setBusy(null);
    }
  };

  const callRender = async (input: {
    mode?: Post["imageMode"];
    photoId?: string;
    beforePhotoId?: string;
    afterPhotoId?: string;
  } = {}) => {
    if (!postId) return;
    setBusy("Generating Google photo…");
    setError(null);
    try {
      const res = await fetch(
        `/api/brago/google-posts/${postId}/render-photo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: input.mode ?? post?.imageMode,
            photoId: input.photoId,
            beforePhotoId: input.beforePhotoId,
            afterPhotoId: input.afterPhotoId,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Render failed");
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render failed");
    } finally {
      setBusy(null);
    }
  };

  const markPosted = async () => {
    if (!postId) return;
    setBusy("Marking…");
    try {
      await fetch(`/api/brago/google-posts/${postId}/mark-posted`, {
        method: "POST",
      });
      await refetch();
    } finally {
      setBusy(null);
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

  const recommendedPhoto =
    photos.find((p) => p.id === post.bestPhotoId) ?? photos[0] ?? null;
  let recRisks: RiskFlags | null = null;
  if (recommendedPhoto?.riskFlagsJson) {
    try {
      recRisks = JSON.parse(recommendedPhoto.riskFlagsJson) as RiskFlags;
    } catch {
      recRisks = null;
    }
  }
  const proofRec = post.proofRecommendationJson
    ? (() => {
        try {
          return JSON.parse(post.proofRecommendationJson);
        } catch {
          return null;
        }
      })()
    : null;

  const heroSrc =
    post.finalImageUrl ??
    recommendedPhoto?.processedUrl ??
    recommendedPhoto?.thumbnailUrl ??
    recommendedPhoto?.originalUrl ??
    null;

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
          Status: {STATUS_LABEL[post.status]} · {post.language.toUpperCase()} · Mode:{" "}
          {post.imageMode === "before_after_proof" ? "Before & after proof" : "Single after"}
          {aiAvailable === false ? " · Photo AI not connected" : ""}
        </p>

        {/* Hero photo */}
        <div className="mt-6">
          {heroSrc ? (
            <img
              src={heroSrc}
              alt=""
              className="w-full rounded-2xl border border-border"
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No photos uploaded.
            </div>
          )}
          {recommendedPhoto?.whySelected && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Why this photo?</span> {recommendedPhoto.whySelected}
            </p>
          )}
        </div>

        {recRisks &&
          (recRisks.visibleFace ||
            recRisks.visibleLicensePlate ||
            recRisks.visibleHouseNumber) && (
            <div className="mt-3 rounded-md bg-yellow-100 text-yellow-900 text-xs px-3 py-2">
              {recRisks.visibleFace && "⚠ Face visible. "}
              {recRisks.visibleLicensePlate && "⚠ License plate visible. "}
              {recRisks.visibleHouseNumber && "⚠ House number visible. "}
              Review before posting.
            </div>
          )}

        {/* Find best after shot */}
        {photos.length > 0 && !post.bestPhotoId && (
          <button
            disabled={!!busy}
            onClick={callAnalyze}
            className="mt-4 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy === "Analyzing photos…" ? "Analyzing…" : "Find the best after shot"}
          </button>
        )}

        {/* Mode toggle */}
        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              disabled={!!busy || !post.bestPhotoId}
              onClick={() =>
                callRender({
                  mode: "single_after",
                  photoId: post.bestPhotoId ?? undefined,
                })
              }
              className={`rounded-md border px-3 py-2 text-xs ${
                post.imageMode === "single_after"
                  ? "bg-foreground text-background"
                  : "border-border"
              } disabled:opacity-50`}
            >
              Single after
            </button>
            <button
              disabled={
                !!busy || !post.beforePhotoId || !post.afterPhotoId
              }
              onClick={() =>
                callRender({
                  mode: "before_after_proof",
                  beforePhotoId: post.beforePhotoId ?? undefined,
                  afterPhotoId: post.afterPhotoId ?? undefined,
                })
              }
              className={`rounded-md border px-3 py-2 text-xs ${
                post.imageMode === "before_after_proof"
                  ? "bg-foreground text-background"
                  : "border-border"
              } disabled:opacity-50`}
            >
              Before & after proof
            </button>
          </div>
        )}

        {proofRec && (
          <p className="mt-2 text-xs text-muted-foreground">
            Brago suggests: <strong>{proofRec.mode}</strong>. {proofRec.reason}
          </p>
        )}

        {/* Alternatives */}
        {photos.length > 1 && (
          <details className="mt-4">
            <summary className="text-xs cursor-pointer text-muted-foreground">
              See alternatives ({photos.length} photos)
            </summary>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((p) => {
                const src = p.thumbnailUrl ?? p.processedUrl ?? p.originalUrl;
                const selected = p.id === post.bestPhotoId;
                return (
                  <button
                    key={p.id}
                    disabled={!!busy}
                    onClick={() =>
                      callRender({ mode: "single_after", photoId: p.id })
                    }
                    className={`relative aspect-square overflow-hidden rounded-md border ${
                      selected ? "ring-2 ring-blue-500" : "border-border"
                    } disabled:opacity-50`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {p.detectedRole && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 text-white text-[10px] px-1">
                        {p.detectedRole}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </details>
        )}

        {/* Caption */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-medium mb-2">Caption</h2>
          {post.caption ? (
            <>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    post.caption && navigator.clipboard.writeText(post.caption)
                  }
                  className="rounded-full bg-foreground text-background px-3 py-1.5 text-xs"
                >
                  Copy Google post
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => callRewrite("rewrite")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Rewrite
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => callRewrite("shorter")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Shorter
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => callRewrite("more_local")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  More local
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => callRewrite("less_salesy")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Less salesy
                </button>
                <button
                  disabled={!!busy}
                  onClick={() =>
                    callGenerateCaption({
                      language: post.language === "en" ? "es" : "en",
                    })
                  }
                  className="rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {post.language === "en"
                    ? "Switch to Spanish"
                    : "Switch to English"}
                </button>
              </div>
            </>
          ) : (
            <button
              disabled={!!busy}
              onClick={() => callGenerateCaption()}
              className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy === "Writing Google caption…"
                ? "Writing…"
                : "Write Google caption"}
            </button>
          )}
        </section>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={markPosted}
            disabled={!!busy || post.status === "posted_manually"}
            className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            {post.status === "posted_manually" ? "Marked as posted" : "Mark as posted"}
          </button>
          <Link
            href="/dashboard"
            className="rounded-full px-4 py-2 text-sm text-muted-foreground underline"
          >
            Back to dashboard
          </Link>
        </div>

        {busy && <p className="mt-3 text-xs text-muted-foreground">{busy}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={async () => {
            if (
              !window.confirm(
                "Delete this Google post and its photos? This cannot be undone.",
              )
            )
              return;
            await fetch(`/api/brago/google-posts/${postId}/delete`, {
              method: "POST",
            });
            window.location.href = "/dashboard";
          }}
          className="mt-8 text-xs text-red-600 underline"
        >
          Delete this post
        </button>
      </Container>
    </div>
  );
}
