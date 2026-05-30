"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ImagePlus, Camera, Check } from "lucide-react";
import { Container } from "@/components/container";
import { PhotoGrid } from "@/features/brago/upload/photo-grid";
import { usePhotoPrepare } from "@/features/brago/upload/use-photo-prepare";
import { cn } from "@/lib/utils";

type Industry = "pressure_washing" | "auto_detailing" | "cleaning";

const INDUSTRY_LABEL: Record<Industry, string> = {
  pressure_washing: "Pressure washing",
  auto_detailing: "Auto detailing",
  cleaning: "Cleaning",
};

const SERVICE_TYPES: Record<Industry, string[]> = {
  pressure_washing: [
    "driveway",
    "patio",
    "siding / house wash",
    "walkway",
    "deck",
    "fence",
    "roof",
  ],
  auto_detailing: [
    "interior detail",
    "exterior wash",
    "wheel cleaning",
    "pet hair removal",
    "paint correction",
    "ceramic coating",
    "mobile detail",
  ],
  cleaning: [
    "carpet cleaning",
    "move-out cleaning",
    "window cleaning",
    "commercial cleaning",
    "tile and grout",
    "post-construction",
    "short term rental turnover",
  ],
};

type StepStatus =
  | "idle"
  | "preparing"
  | "uploading-meta"
  | "uploading-photos"
  | "done"
  | "error";

export default function CreatePage() {
  const router = useRouter();
  const locale = useLocale();

  const [industry, setIndustry] = useState<Industry>("pressure_washing");
  const [serviceType, setServiceType] = useState<string>(
    SERVICE_TYPES.pressure_washing[0],
  );
  const [serviceArea, setServiceArea] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<StepStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { state: prepareState, prepare } = usePhotoPrepare(10);

  const onIndustryChange = (next: Industry) => {
    setIndustry(next);
    setServiceType(SERVICE_TYPES[next][0]);
  };

  const onFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    setPhotos((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        const dup = merged.some(
          (p) =>
            p.name === f.name &&
            p.size === f.size &&
            p.lastModified === f.lastModified,
        );
        if (!dup) merged.push(f);
      }
      return merged.slice(0, 10);
    });
  };

  const removeAt = (idx: number) => {
    setPhotos((arr) => arr.filter((_, i) => i !== idx));
  };

  const busy =
    status === "preparing" ||
    status === "uploading-meta" ||
    status === "uploading-photos";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Please confirm you have permission to use these photos.");
      return;
    }
    if (photos.length === 0) {
      setError("Add at least one photo.");
      return;
    }

    try {
      setStatus("preparing");
      const prepared = await prepare(photos);
      if (prepared.length === 0) {
        throw new Error("No usable photos after preparation");
      }

      setStatus("uploading-meta");
      const createRes = await fetch("/api/brago/google-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          serviceType,
          serviceArea: serviceArea.trim() || undefined,
          hasMarketingPermission: true,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData?.error ?? "Could not create post");
      }
      const postId: string = createData.postId;

      setStatus("uploading-photos");
      const fd = new FormData();
      prepared.forEach((f, i) => fd.set(`photo_${i}`, f));
      const upRes = await fetch(
        `/api/brago/google-posts/${postId}/photos/upload`,
        { method: "POST", body: fd },
      );
      if (upRes.status === 404) {
        setStatus("done");
        router.push(`/${locale}/google-posts/${postId}`);
        return;
      }
      const upData = await upRes.json().catch(() => ({}));
      if (!upRes.ok) {
        throw new Error(upData?.error ?? "Photo upload failed");
      }
      setStatus("done");
      router.push(`/${locale}/google-posts/${postId}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const stepLabel =
    status === "preparing"
      ? prepareState.status === "preparing"
        ? `Preparing ${prepareState.processed} of ${prepareState.total}…`
        : "Preparing photos…"
      : status === "uploading-meta"
        ? "Creating post…"
        : status === "uploading-photos"
          ? "Uploading photos…"
          : status === "done"
            ? "Opening your post…"
            : "Create Google post";

  return (
    <div className="bg-paper-glow relative min-h-screen pb-28 sm:pb-12">
      <Container className="relative z-10 max-w-xl py-8 md:py-12">
        {/* Header */}
        <p className="mb-2 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" />
          New Google post
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Today&apos;s job, ready for Google
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Add today&apos;s photos and a couple of taps — Brago picks the best after shot and writes a Google-safe caption.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-5">
          {/* Step 1 — Photos (the focal point) */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <StepDot n={1} /> Job photos
            </h2>
            <label
              htmlFor="brago-photos"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card px-6 py-9 text-center transition-colors hover:border-brand/60 active:scale-[0.99]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                {photos.length > 0 ? <ImagePlus className="h-7 w-7" /> : <Camera className="h-7 w-7" />}
              </span>
              <span className="font-display text-base font-bold text-foreground">
                {photos.length > 0 ? "Add more photos" : "Add today's job photos"}
              </span>
              <span className="text-xs text-muted-foreground">
                Tap to take a photo or pick from your phone · 1–10 · JPEG / PNG / HEIC
              </span>
            </label>
            <input
              id="brago-photos"
              type="file"
              multiple
              accept="image/*,.heic,.heif"
              onChange={(e) => {
                const incoming = e.target.files ? Array.from(e.target.files) : [];
                e.target.value = "";
                onFiles(incoming);
              }}
              className="sr-only"
            />
            {photos.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {photos.length} photo{photos.length > 1 ? "s" : ""} ready
                </p>
                <PhotoGrid files={photos} onRemove={removeAt} />
              </div>
            )}
          </section>

          {/* Step 2 — About the job */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <StepDot n={2} /> About the job
            </h2>

            {/* Industry */}
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Industry
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SERVICE_TYPES) as Industry[]).map((i) => (
                <Chip key={i} active={industry === i} onClick={() => onIndustryChange(i)}>
                  {INDUSTRY_LABEL[i]}
                </Chip>
              ))}
            </div>

            {/* Service type — horizontal scroll, no typing */}
            <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Service type
            </p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SERVICE_TYPES[industry].map((s) => (
                <Chip key={s} active={serviceType === s} onClick={() => setServiceType(s)} nowrap>
                  {s}
                </Chip>
              ))}
            </div>

            {/* Service area */}
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Service area <span className="normal-case text-muted-foreground/70">(optional)</span>
              </span>
              <input
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="e.g. South Austin"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>
          </section>

          {/* Consent */}
          <button
            type="button"
            onClick={() => setConsent((c) => !c)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-brand/40"
          >
            <span
              className={cn(
                "flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 transition-colors",
                consent
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-background",
              )}
            >
              {consent && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span className="text-sm text-foreground">
              I have permission to use these photos for marketing.
            </span>
          </button>

          {error && (
            <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            By creating a post you agree to our{" "}
            <Link href="/terms" className="font-medium text-foreground underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-foreground underline">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Sticky action bar — thumb-reachable on phones, inline on desktop */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <div className="mx-auto flex max-w-xl items-center gap-3">
              <div className="hidden text-sm text-muted-foreground sm:block">
                {photos.length > 0
                  ? `${photos.length} photo${photos.length > 1 ? "s" : ""}`
                  : "No photos yet"}
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-xl border border-brand/60 bg-brand px-6 py-3.5 font-display text-base font-bold text-brand-foreground shadow-tactile transition-all hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-px disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
              >
                {busy && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-foreground/40 border-t-brand-foreground" />
                )}
                {stepLabel}
              </button>
            </div>
          </div>
        </form>
      </Container>
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand font-display text-xs font-bold text-brand-foreground">
      {n}
    </span>
  );
}

function Chip({
  children,
  active,
  onClick,
  nowrap,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  nowrap?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:scale-95",
        nowrap && "whitespace-nowrap",
        active
          ? "border-brand bg-brand text-brand-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-brand/40",
      )}
    >
      {children}
    </button>
  );
}
