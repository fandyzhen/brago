"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Sparkles, Trash2 } from "lucide-react";
import { Container } from "@/components/container";
import { cn } from "@/lib/utils";

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

const STATUS_STYLE: Record<Post["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  ready: { label: "Ready for Google", className: "bg-brand text-brand-foreground" },
  posted_manually: { label: "Posted to Google", className: "bg-green-600 text-white" },
  archived: { label: "Archived", className: "bg-secondary text-muted-foreground" },
};

const REWRITES: { key: string; label: string }[] = [
  { key: "rewrite", label: "Rewrite" },
  { key: "shorter", label: "Shorter" },
  { key: "more_local", label: "More local" },
  { key: "less_salesy", label: "Less salesy" },
];

export default function GooglePostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

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

  const copyCaption = () => {
    if (!post?.caption) return;
    navigator.clipboard.writeText(post.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-paper-glow min-h-screen">
        <Container className="max-w-xl py-12">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-6 aspect-square w-full animate-pulse rounded-2xl bg-muted" />
        </Container>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-paper-glow min-h-screen">
        <Container className="max-w-xl py-12">
          <p className="text-sm">{error ?? "Post not found."}</p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium underline">
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

  const status = STATUS_STYLE[post.status];

  return (
    <div className="bg-paper-glow relative min-h-screen pb-12">
      <Container className="max-w-xl py-8 md:py-12">
        {/* Header */}
        <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Google post · {post.serviceType}
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          {post.serviceArea ? `${post.serviceArea} · ${post.serviceType}` : post.serviceType}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={cn("rounded-full px-2.5 py-1 font-semibold", status.className)}>
            {status.label}
          </span>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 font-medium text-muted-foreground">
            {post.language.toUpperCase()}
          </span>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 font-medium text-muted-foreground">
            {post.imageMode === "before_after_proof" ? "Before & after" : "Single after"}
          </span>
          {aiAvailable === false && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
              Photo AI not connected
            </span>
          )}
        </div>

        {/* Hero photo */}
        <div className="mt-6">
          {heroSrc ? (
            <img
              src={heroSrc}
              alt=""
              className="w-full rounded-2xl border border-border shadow-sm"
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              No photos uploaded.
            </div>
          )}
          {recommendedPhoto?.whySelected && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none text-brand" />
              <span>
                <span className="font-semibold text-foreground">Why this shot:</span>{" "}
                {recommendedPhoto.whySelected}
              </span>
            </p>
          )}
        </div>

        {recRisks &&
          (recRisks.visibleFace ||
            recRisks.visibleLicensePlate ||
            recRisks.visibleHouseNumber) && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
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
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand/60 bg-brand px-5 py-3 font-display text-sm font-bold text-brand-foreground shadow-tactile transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            {busy === "Analyzing photos…" ? "Analyzing…" : "Find the best after shot"}
          </button>
        )}

        {/* Mode toggle — segmented control */}
        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary p-1">
            <button
              disabled={!!busy || !post.bestPhotoId}
              onClick={() =>
                callRender({ mode: "single_after", photoId: post.bestPhotoId ?? undefined })
              }
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                post.imageMode === "single_after"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Single after
            </button>
            <button
              disabled={!!busy || !post.beforePhotoId || !post.afterPhotoId}
              onClick={() =>
                callRender({
                  mode: "before_after_proof",
                  beforePhotoId: post.beforePhotoId ?? undefined,
                  afterPhotoId: post.afterPhotoId ?? undefined,
                })
              }
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                post.imageMode === "before_after_proof"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Before &amp; after proof
            </button>
          </div>
        )}

        {proofRec && (
          <p className="mt-2 text-xs text-muted-foreground">
            Brago suggests: <strong className="text-foreground">{proofRec.mode}</strong>. {proofRec.reason}
          </p>
        )}

        {/* Alternatives */}
        {photos.length > 1 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
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
                    onClick={() => callRender({ mode: "single_after", photoId: p.id })}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-xl border transition-all disabled:opacity-50",
                      selected ? "border-brand ring-2 ring-brand" : "border-border hover:border-brand/50",
                    )}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {p.detectedRole && (
                      <span className="absolute bottom-1 left-1 rounded bg-foreground/70 px-1 text-[10px] text-background">
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
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Google caption
          </h2>
          {post.caption ? (
            <>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {post.caption}
              </p>

              {/* Primary: copy */}
              <button
                onClick={copyCaption}
                className={cn(
                  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 font-display text-sm font-bold shadow-tactile transition-all hover:-translate-y-0.5",
                  copied
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-brand/60 bg-brand text-brand-foreground",
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied — paste into Google" : "Copy Google post"}
              </button>

              {/* Secondary: rewrites + language */}
              <div className="mt-3 flex flex-wrap gap-2">
                {REWRITES.map((r) => (
                  <button
                    key={r.key}
                    disabled={!!busy}
                    onClick={() => callRewrite(r.key)}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand/50 hover:bg-hover disabled:opacity-50"
                  >
                    {r.label}
                  </button>
                ))}
                <button
                  disabled={!!busy}
                  onClick={() =>
                    callGenerateCaption({ language: post.language === "en" ? "es" : "en" })
                  }
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand/50 hover:bg-hover disabled:opacity-50"
                >
                  {post.language === "en" ? "Switch to Spanish" : "Switch to English"}
                </button>
              </div>
            </>
          ) : (
            <button
              disabled={!!busy}
              onClick={() => callGenerateCaption()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand/60 bg-brand px-5 py-3 font-display text-sm font-bold text-brand-foreground shadow-tactile transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {busy === "Writing Google caption…" ? "Writing…" : "Write Google caption"}
            </button>
          )}
        </section>

        {/* Status + busy + error */}
        {busy && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
            {busy}
          </p>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-0.5 text-xs text-red-600">
              {/* Friendly framing for upstream AI errors (G10) */}
              {/vision|doubao|401|unauthorized|api key/i.test(error)
                ? "Photo AI isn't connected yet — pick your best after shot from the alternatives above and write the caption (templates still work)."
                : error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={markPosted}
            disabled={!!busy || post.status === "posted_manually"}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-foreground/15 bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/30 disabled:opacity-50"
          >
            {post.status === "posted_manually" ? (
              <>
                <Check className="h-4 w-4 text-green-600" /> Marked as posted
              </>
            ) : (
              "Mark as posted"
            )}
          </button>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground underline hover:text-foreground"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Delete */}
        <button
          onClick={async () => {
            if (
              !window.confirm(
                "Delete this Google post and its photos? This cannot be undone.",
              )
            )
              return;
            await fetch(`/api/brago/google-posts/${postId}/delete`, { method: "POST" });
            window.location.href = "/dashboard";
          }}
          className="mt-8 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete this post
        </button>
      </Container>
    </div>
  );
}
