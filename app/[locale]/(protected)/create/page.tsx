"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Background } from "@/components/background";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { POSTER_TEMPLATES } from "@/lib/poster-templates/public-metadata";
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

type GenerateState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; url: string; filename: string }
  | { status: "error"; message: string };

type CaptionSuggestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; headlines: string[]; caption: string }
  | { status: "error"; message: string };

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
  const previewUrl = file ? URL.createObjectURL(file) : null;

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
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden
        ${dragging
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
          <img
            src={previewUrl}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Label overlay */}
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-mono tracking-widest uppercase px-2 py-1 rounded-full">
            {label}
          </div>
          {/* Replace hint */}
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
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: BragoTemplateMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-xl border-2 overflow-hidden text-left transition-all focus:outline-none
        ${selected
          ? "border-neutral-900 dark:border-white ring-2 ring-neutral-900 dark:ring-white"
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
        }`}
    >
      {/* Preview image */}
      <div className="w-full bg-neutral-200 dark:bg-neutral-800 aspect-square flex items-center justify-center overflow-hidden">
        <img
          src={template.previewImage}
          alt={template.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-medium truncate">{template.name}</p>
        <p className="text-xs text-neutral-400 capitalize">{template.industry.replace("_", " ")}</p>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" className="dark:stroke-neutral-900" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type PairFile = { before: File | null; after: File | null; label?: string };

export default function CreatePage() {
  const [pairs, setPairs] = useState<PairFile[]>([{ before: null, after: null }]);
  const searchParams = useSearchParams();
  const initTemplate =
    searchParams.get("templateId") ?? POSTER_TEMPLATES[0]?.id ?? "";
  const initHeadline = decodeURIComponent(searchParams.get("headline") ?? "");

  const [selectedChannel, setSelectedChannel] = useState<"google_business_profile" | "facebook_nextdoor" | "instagram">("google_business_profile");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initTemplate);
  const [headline, setHeadline] = useState(initHeadline);
  const [brand, setBrand] = useState<BrandProfile>({});
  const [generateState, setGenerateState] = useState<GenerateState>({ status: "idle" });
  const [captionState, setCaptionState] = useState<CaptionSuggestState>({ status: "idle" });
  const [captionCopied, setCaptionCopied] = useState(false);

  // Load brand profile for auto-fill
  useEffect(() => {
    fetch("/api/brand-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.brandProfile) setBrand(data.brandProfile);
      })
      .catch(() => {});
  }, []);

  const filteredTemplates = POSTER_TEMPLATES.filter((t) => t.channel === selectedChannel);

  const selectedMeta = POSTER_TEMPLATES.find((t) => t.id === selectedTemplate);
  const isMultiArea = (selectedMeta?.layoutFamily ?? "split") === "collage";
  const maxPairs = isMultiArea ? 4 : 1;

  // Derive the effective pairs without mutating state in an effect —
  // when the user picks a non-collage template after adding extra areas,
  // we just ignore the trailing entries until they add another area.
  const effectivePairs = pairs.slice(0, maxPairs);

  const canGenerate =
    effectivePairs.length > 0 &&
    effectivePairs.every((p) => p.before && p.after) &&
    selectedTemplate &&
    headline.trim().length > 0;

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    if (effectivePairs.some((p) => !p.before || !p.after)) return;

    setGenerateState({ status: "generating" });

    try {
      const fd = new FormData();
      fd.append("templateId", selectedTemplate);
      fd.append("headline", headline.trim().slice(0, 36));

      if (isMultiArea) {
        effectivePairs.forEach((p, i) => {
          if (p.before) fd.append(`area${i + 1}_before`, p.before);
          if (p.after) fd.append(`area${i + 1}_after`, p.after);
          if (p.label) fd.append(`area${i + 1}_label`, p.label);
        });
      } else {
        if (effectivePairs[0]?.before) fd.append("beforeImage", effectivePairs[0].before);
        if (effectivePairs[0]?.after) fd.append("afterImage", effectivePairs[0].after);
      }

      if (brand.businessName) fd.append("businessName", brand.businessName);
      if (brand.phone) fd.append("phone", brand.phone);
      if (brand.serviceArea) fd.append("serviceArea", brand.serviceArea);
      fd.append("isLicensed", String(brand.isLicensed ?? false));
      fd.append("isInsured", String(brand.isInsured ?? false));
      if (brand.googleReviewCount != null) {
        fd.append("googleReviewCount", String(brand.googleReviewCount));
      }

      const res = await fetch("/api/posters/render", { method: "POST", body: fd });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        const msg =
          res.status === 402
            ? `Insufficient credits — need ${(err as { required?: number }).required ?? 10} credits`
            : (err.error ?? "Render failed");
        setGenerateState({ status: "error", message: msg });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      // eslint-disable-next-line react-hooks/purity -- Date.now is called inside an async event handler, not during render
      const filename = `brago-post-${Date.now()}.png`;
      setGenerateState({ status: "done", url, filename });
    } catch {
      setGenerateState({ status: "error", message: "Network error, please try again." });
    }
  };

  const handleSuggest = async () => {
    setCaptionState({ status: "loading" });
    try {
      // Get industry and channel from selected template meta
      const templateMeta = POSTER_TEMPLATES.find((t) => t.id === selectedTemplate);
      const res = await fetch("/api/posters/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: templateMeta?.industry,
          channel: templateMeta?.channel,
          businessName: brand.businessName,
          serviceArea: brand.serviceArea,
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
      // ignore
    }
  };

  const handleDownload = () => {
    if (generateState.status !== "done") return;
    const a = document.createElement("a");
    a.href = generateState.url;
    a.download = generateState.filename;
    a.click();
  };

  const handleReset = () => {
    setGenerateState({ status: "idle" });
  };

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold mb-1">Create Post</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
            Upload your before &amp; after photos to generate a 1080 × 1080 social post.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
            {/* ── Left column: inputs ── */}
            <div className="space-y-8">
              {/* Photos */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Photos
                </h2>

                <div className="space-y-4">
                  {effectivePairs.map((p, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-widest font-mono text-neutral-500">
                          Area {idx + 1}
                          {isMultiArea && p.label ? ` — ${p.label}` : ""}
                        </p>
                        {isMultiArea && pairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPairs((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-xs text-neutral-400 hover:text-red-500"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <PhotoDropZone
                          label="Before"
                          file={p.before}
                          onFile={(f) =>
                            setPairs((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, before: f } : x))
                            )
                          }
                        />
                        <PhotoDropZone
                          label="After"
                          file={p.after}
                          onFile={(f) =>
                            setPairs((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, after: f } : x))
                            )
                          }
                        />
                      </div>
                      {isMultiArea && (
                        <input
                          type="text"
                          placeholder={`Area label (e.g. ${idx === 0 ? "Driveway" : idx === 1 ? "Patio" : "Siding"})`}
                          value={p.label ?? ""}
                          onChange={(e) =>
                            setPairs((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, label: e.target.value } : x
                              )
                            )
                          }
                          className="mt-1 w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs"
                          maxLength={24}
                        />
                      )}
                    </div>
                  ))}

                  {isMultiArea && pairs.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPairs((prev) => [...prev, { before: null, after: null }])
                      }
                      className="w-full rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 py-3 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      + Add another area
                    </button>
                  )}

                  {isMultiArea && pairs.length >= 4 && (
                    <p className="text-xs text-neutral-400 text-center">
                      Max 4 areas per collage. Need more? Create a carousel instead.
                    </p>
                  )}
                </div>
              </section>

              {/* Channel selection */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Where are you posting?
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "google_business_profile", label: "Google Business Profile" },
                      { value: "facebook_nextdoor", label: "Facebook / Nextdoor" },
                      { value: "instagram", label: "Instagram" },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSelectedChannel(value);
                        const newFiltered = POSTER_TEMPLATES.filter((t) => t.channel === value);
                        if (newFiltered.length > 0 && !newFiltered.find((t) => t.id === selectedTemplate)) {
                          setSelectedTemplate(newFiltered[0].id);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        selectedChannel === value
                          ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                          : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 dark:hover:border-neutral-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Template */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Template
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      selected={selectedTemplate === t.id}
                      onSelect={() => setSelectedTemplate(t.id)}
                    />
                  ))}
                </div>
              </section>

              {/* Headline */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                    Headline
                  </h2>
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={captionState.status === "loading"}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                  >
                    {captionState.status === "loading" ? (
                      <><SpinnerIcon size={12} /> Generating&hellip;</>
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

                {/* AI headline suggestions */}
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

              {/* Platform Caption (shown after AI suggest) */}
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

              {/* Brand info hint */}
              {(brand.businessName || brand.phone || brand.serviceArea) && (
                <p className="text-xs text-neutral-400">
                  Using brand info from your{" "}
                  <Link href="/settings/brand" className="underline hover:text-neutral-600">
                    brand profile
                  </Link>
                  {brand.businessName ? `: ${brand.businessName}` : ""}.
                </p>
              )}

              {/* Generate button */}
              <div className="flex gap-3 items-center">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generateState.status === "generating"}
                >
                  {generateState.status === "generating" ? (
                    <span className="flex items-center gap-2">
                      <SpinnerIcon /> Generating…
                    </span>
                  ) : (
                    "Generate poster"
                  )}
                </Button>

                {generateState.status === "error" && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {generateState.message}
                  </p>
                )}
              </div>
            </div>

            {/* ── Right column: preview ── */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                Preview
              </h2>

              <AnimatePresence mode="wait">
                {generateState.status === "done" ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <img
                      src={generateState.url}
                      alt="Generated poster"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleDownload} className="flex-1">
                        Download PNG
                      </Button>
                      <button
                        onClick={handleReset}
                        className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        New
                      </button>
                    </div>
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
                    <p className="text-sm text-neutral-400 mt-3">Rendering poster…</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400 text-sm"
                    style={{ aspectRatio: "1/1" }}
                  >
                    <p>Your poster will appear here</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
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
