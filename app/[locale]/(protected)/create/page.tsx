"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Background } from "@/components/background";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import {
  detectOrientation,
  pickPreviewTemplates,
  type ImageOrientation,
} from "@/lib/poster-templates/orientation-match";
import type { BragoTemplateMeta } from "@/lib/server/poster-templates/shared/types";

// ── Types ──────────────────────────────────────────────────────────────────

type BrandProfile = {
  businessName?: string | null;
  phone?: string | null;
  serviceArea?: string | null;
  isLicensed?: boolean;
  isInsured?: boolean;
  googleReviewCount?: number | null;
};

type Thumbnail = {
  templateId: string;
  name: string;
  thumbnailDataUrl: string;
};

type PreviewBatch = {
  batchId: string;
  thumbnails: Thumbnail[];
  aiFinalizeEnabled: boolean;
  expiresAt: number;
};

type GenerateState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; batch: PreviewBatch; selectedIndex: number }
  | { status: "error"; message: string };

type CaptionSuggestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; headlines: string[]; caption: string }
  | { status: "error"; message: string };

type BrandGateState =
  | { status: "loading" }
  | { status: "needs_brand" } // 已 router.replace 出去，渲染占位即可
  | { status: "ready"; brand: BrandProfile };

// ── Photo Drop Zone ────────────────────────────────────────────────────────

function PhotoDropZone({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped && dropped.type.startsWith("image/")) onFile(dropped);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden
        ${
          dragging
            ? "border-neutral-400 bg-neutral-100 dark:bg-neutral-800"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50 dark:bg-neutral-900"
        }`}
      style={{ minHeight: 220 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {previewUrl ? (
        <>
          <img src={previewUrl} alt={label} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-mono tracking-widest uppercase px-2 py-1 rounded-full">
            {label}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
            <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium transition-opacity">
              Click to replace
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-6 text-center pointer-events-none">
          <UploadIcon />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
          <p className="text-xs text-neutral-400">Click or drag an image here</p>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-400"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ── 读取图片宽高（用 after 图为准） ────────────────────────────────────────

async function readImageOrientation(file: File): Promise<ImageOrientation> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(detectOrientation(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("square");
    };
    img.src = url;
  });
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initHeadline = decodeURIComponent(searchParams.get("headline") ?? "");

  const [brandGate, setBrandGate] = useState<BrandGateState>({ status: "loading" });
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [orientation, setOrientation] = useState<ImageOrientation | null>(null);
  const [pickedTemplates, setPickedTemplates] = useState<BragoTemplateMeta[]>([]);
  const [description, setDescription] = useState("");
  const [headline, setHeadline] = useState(initHeadline);
  const [generateState, setGenerateState] = useState<GenerateState>({ status: "idle" });
  const [captionState, setCaptionState] = useState<CaptionSuggestState>({ status: "idle" });
  const [captionCopied, setCaptionCopied] = useState(false);
  const [downloadedIndices, setDownloadedIndices] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ── Brand 门槛 ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/brand-profile")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const bp: BrandProfile | null = data?.brandProfile ?? null;
        const hasBusinessName = !!bp?.businessName && bp.businessName.trim().length > 0;
        if (!hasBusinessName) {
          setBrandGate({ status: "needs_brand" });
          router.replace("/settings/brand?returnTo=/create");
          return;
        }
        setBrandGate({ status: "ready", brand: bp! });
      })
      .catch(() => {
        if (!cancelled) setBrandGate({ status: "ready", brand: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ── 图片就位后：测宽高比 + 选 3 个模板 ────────────────────────────────────
  useEffect(() => {
    if (!beforeFile || !afterFile) return;
    let cancelled = false;
    readImageOrientation(afterFile).then((o) => {
      if (cancelled) return;
      setOrientation(o);
      setPickedTemplates(pickPreviewTemplates(o, 3));
    });
    return () => {
      cancelled = true;
    };
  }, [beforeFile, afterFile]);

  const canGenerate = useMemo(
    () =>
      brandGate.status === "ready" &&
      !!beforeFile &&
      !!afterFile &&
      headline.trim().length > 0 &&
      pickedTemplates.length > 0 &&
      generateState.status !== "generating",
    [brandGate.status, beforeFile, afterFile, headline, pickedTemplates.length, generateState.status]
  );

  const handleReshuffle = () => {
    if (!orientation) return;
    setPickedTemplates(pickPreviewTemplates(orientation, 3));
    setGenerateState({ status: "idle" });
    setDownloadedIndices(new Set());
    setDownloadError(null);
  };

  const handleGenerate = async () => {
    if (!beforeFile || !afterFile || pickedTemplates.length === 0) return;
    setGenerateState({ status: "generating" });
    setDownloadedIndices(new Set());
    setDownloadError(null);
    const brand = brandGate.status === "ready" ? brandGate.brand : {};
    try {
      const fd = new FormData();
      fd.append("beforeImage", beforeFile);
      fd.append("afterImage", afterFile);
      fd.append("headline", headline.trim().slice(0, 36));
      if (description.trim()) fd.append("description", description.trim().slice(0, 80));
      fd.append("templateIds", JSON.stringify(pickedTemplates.map((t) => t.id)));
      if (brand.businessName) fd.append("businessName", brand.businessName);
      if (brand.phone) fd.append("phone", brand.phone);
      if (brand.serviceArea) fd.append("serviceArea", brand.serviceArea);
      fd.append("isLicensed", String(brand.isLicensed ?? false));
      fd.append("isInsured", String(brand.isInsured ?? false));
      if (brand.googleReviewCount != null) {
        fd.append("googleReviewCount", String(brand.googleReviewCount));
      }

      const res = await fetch("/api/posters/preview-batch", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setGenerateState({ status: "error", message: err.error ?? "Render failed" });
        return;
      }
      const data = (await res.json()) as PreviewBatch;
      if (!data.thumbnails || data.thumbnails.length === 0) {
        setGenerateState({ status: "error", message: "Render failed for all templates" });
        return;
      }
      setGenerateState({ status: "done", batch: data, selectedIndex: 0 });
    } catch {
      setGenerateState({ status: "error", message: "Network error, please try again." });
    }
  };

  const handleSuggest = async () => {
    setCaptionState({ status: "loading" });
    try {
      const first = pickedTemplates[0];
      const res = await fetch("/api/posters/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: first?.industry,
          channel: first?.channel,
          description: description.trim() || undefined,
          businessName: brandGate.status === "ready" ? brandGate.brand.businessName : undefined,
          serviceArea: brandGate.status === "ready" ? brandGate.brand.serviceArea : undefined,
        }),
      });
      if (!res.ok) {
        setCaptionState({ status: "error", message: "Could not generate suggestions." });
        return;
      }
      const data = (await res.json()) as { headlines: string[]; caption: string };
      setCaptionState({ status: "done", headlines: data.headlines, caption: data.caption });
    } catch {
      setCaptionState({ status: "error", message: "Network error." });
    }
  };

  const handleCopyCaption = async () => {
    if (captionState.status !== "done") return;
    try {
      await navigator.clipboard.writeText(captionState.caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDownload = async () => {
    if (generateState.status !== "done" || downloading) return;
    const { batch, selectedIndex } = generateState;
    const isNewIndex = !downloadedIndices.has(selectedIndex);
    if (batch.aiFinalizeEnabled && isNewIndex) {
      if (!window.confirm("Each new layout costs 10 credits (AI runs again). Continue?")) {
        return;
      }
    }
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/posters/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.batchId, index: selectedIndex }),
      });
      if (res.status === 410) {
        setDownloadError("Preview expired, please regenerate.");
        setGenerateState({ status: "idle" });
        return;
      }
      if (res.status === 402) {
        setDownloadError("Insufficient credits — top up to download.");
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDownloadError(d.error ?? "Download failed");
        return;
      }
      const data = (await res.json()) as { url: string; charged: number };
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `${batch.thumbnails[selectedIndex].templateId}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDownloadedIndices((prev) => {
        const next = new Set(prev);
        next.add(selectedIndex);
        return next;
      });
    } catch {
      setDownloadError("Network error, please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setGenerateState({ status: "idle" });
    setDownloadedIndices(new Set());
    setDownloadError(null);
  };

  // ── Brand gate loading / redirect placeholder ────────────────────────────
  if (brandGate.status === "loading" || brandGate.status === "needs_brand") {
    return (
      <div className="relative min-h-screen">
        <Background />
        <Container className="relative z-10 py-24">
          <p className="text-neutral-500 text-sm text-center">
            {brandGate.status === "loading" ? "Loading…" : "Redirecting to brand setup…"}
          </p>
        </Container>
      </div>
    );
  }

  const brand = brandGate.brand;
  const downloadLabel = (() => {
    if (generateState.status !== "done") return "Download";
    const { batch, selectedIndex } = generateState;
    if (downloadedIndices.has(selectedIndex)) return "Download again";
    return batch.aiFinalizeEnabled ? "Download · 10 credits" : "Download";
  })();

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="relative z-10 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-bold mb-1">Create Post</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            Upload before &amp; after photos, describe the job, and we&apos;ll generate 3 layouts for you.
          </p>

          {/* Brand info bar */}
          <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              Using brand info:{" "}
              <strong className="text-neutral-700 dark:text-neutral-300">
                {brand.businessName || "—"}
              </strong>
              {brand.phone ? <> · {brand.phone}</> : null}
              {brand.serviceArea ? <> · {brand.serviceArea}</> : null}
            </span>
            <Link
              href="/settings/brand?returnTo=/create"
              className="underline hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Edit
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10">
            {/* ── Left column: inputs ── */}
            <div className="space-y-8">
              {/* Photos */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Photos
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <PhotoDropZone label="Before" file={beforeFile} onFile={setBeforeFile} />
                  <PhotoDropZone label="After" file={afterFile} onFile={setAfterFile} />
                </div>
                {orientation && (
                  <p className="mt-2 text-xs text-neutral-400">
                    Detected {orientation} orientation — we picked {pickedTemplates.length}{" "}
                    matching template{pickedTemplates.length === 1 ? "" : "s"} for you.{" "}
                    <button
                      type="button"
                      onClick={handleReshuffle}
                      className="underline hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      Reshuffle
                    </button>
                  </p>
                )}
              </section>

              {/* Describe the work */}
              <section>
                <label className="block text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Describe the work <span className="text-neutral-400 normal-case font-normal">(≤80 char, helps AI suggest a headline)</span>
                </label>
                <textarea
                  maxLength={80}
                  rows={2}
                  placeholder="e.g. Cleaned a stubborn driveway in 3 hours, all stains gone"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 resize-none"
                />
                <p className="text-xs text-neutral-400 mt-1">{description.length}/80 characters</p>
              </section>

              {/* Headline */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                    Headline on poster
                  </h2>
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={captionState.status === "loading" || pickedTemplates.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                  >
                    {captionState.status === "loading" ? (
                      <>
                        <SpinnerIcon size={12} /> Generating&hellip;
                      </>
                    ) : (
                      <>✨ AI Suggest</>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={36}
                  placeholder="Before & After Driveway Clean"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
                />
                <p className="text-xs text-neutral-400 mt-1">{headline.length}/36 characters</p>

                {captionState.status === "done" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {captionState.headlines.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setHeadline(h.slice(0, 36))}
                        className="px-3 py-1 rounded-full text-xs border border-neutral-300 dark:border-neutral-600 hover:border-neutral-500 dark:hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
                {captionState.status === "error" && (
                  <p className="mt-2 text-xs text-red-500">{captionState.message}</p>
                )}
              </section>

              {/* Platform Caption */}
              {captionState.status === "done" && (
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                    Platform Caption
                  </h2>
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {captionState.caption}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="mt-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                    >
                      {captionCopied ? "✓ Copied!" : "Copy caption"}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Copy and paste this when you publish your post.
                  </p>
                </section>
              )}

              {/* Generate button */}
              <div className="flex gap-3 items-center">
                <Button onClick={handleGenerate} disabled={!canGenerate}>
                  {generateState.status === "generating" ? (
                    <span className="flex items-center gap-2">
                      <SpinnerIcon /> Generating 3 previews…
                    </span>
                  ) : (
                    "Generate 3 previews"
                  )}
                </Button>
                {generateState.status === "error" && (
                  <p className="text-sm text-red-600 dark:text-red-400">{generateState.message}</p>
                )}
              </div>
            </div>

            {/* ── Right column: previews ── */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                Previews
              </h2>

              <AnimatePresence mode="wait">
                {generateState.status === "done" ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    {/* 主预览图（缩略图等比放大显示） */}
                    <img
                      src={generateState.batch.thumbnails[generateState.selectedIndex].thumbnailDataUrl}
                      alt={`Preview ${generateState.selectedIndex + 1}`}
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg"
                    />

                    {/* 3 张缩略图 */}
                    <div className="grid grid-cols-3 gap-2">
                      {generateState.batch.thumbnails.map((t, i) => (
                        <button
                          key={t.templateId}
                          type="button"
                          onClick={() =>
                            setGenerateState((prev) =>
                              prev.status === "done" ? { ...prev, selectedIndex: i } : prev
                            )
                          }
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                            i === generateState.selectedIndex
                              ? "border-neutral-900 dark:border-white"
                              : "border-transparent hover:border-neutral-400"
                          }`}
                          title={t.name}
                        >
                          <img src={t.thumbnailDataUrl} alt={t.name} className="w-full aspect-square object-cover" />
                          {downloadedIndices.has(i) && (
                            <span className="absolute top-1 right-1 text-[10px] bg-green-500 text-white px-1 rounded">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-neutral-400 text-center">
                      Click a thumbnail to switch · template:{" "}
                      <strong>{generateState.batch.thumbnails[generateState.selectedIndex].name}</strong>
                    </p>

                    <div className="flex gap-2">
                      <Button onClick={handleDownload} disabled={downloading} className="flex-1">
                        {downloading ? (
                          <span className="flex items-center gap-2">
                            <SpinnerIcon /> Preparing…
                          </span>
                        ) : (
                          downloadLabel
                        )}
                      </Button>
                      <button
                        onClick={handleReset}
                        className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        New
                      </button>
                    </div>
                    {downloadError && (
                      <p className="text-xs text-red-500 text-center">{downloadError}</p>
                    )}
                  </motion.div>
                ) : generateState.status === "generating" ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                    style={{ aspectRatio: "1/1" }}
                  >
                    <SpinnerIcon size={32} />
                    <p className="text-sm text-neutral-400 mt-3">Rendering 3 templates…</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400 text-sm p-6 text-center"
                    style={{ aspectRatio: "1/1" }}
                  >
                    <p>Previews will appear here</p>
                    <p className="mt-1 text-xs">
                      Upload photos, write a headline, and click Generate.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/*
            Multi-area collage flow is temporarily hidden — the new single-pair
            "3 previews to choose from" UX is the default. If we want collage
            back, build a separate /create/collage page rather than mixing both
            modes into one screen.
          */}
        </motion.div>
      </Container>
    </div>
  );
}

function SpinnerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
