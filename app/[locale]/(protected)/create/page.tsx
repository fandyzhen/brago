"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { Background } from "@/components/background";
import { Button } from "@/components/button";
import { Container } from "@/components/container";

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

  const previews = useMemo(
    () => photos.map((f) => URL.createObjectURL(f)),
    [photos],
  );

  const onIndustryChange = (next: Industry) => {
    setIndustry(next);
    setServiceType(SERVICE_TYPES[next][0]);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 10);
    setPhotos(list);
  };

  const removeAt = (idx: number) => {
    setPhotos((arr) => arr.filter((_, i) => i !== idx));
  };

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

    setStatus("uploading-meta");
    try {
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
      photos.forEach((f, i) => fd.set(`photo_${i}`, f));
      const upRes = await fetch(
        `/api/brago/google-posts/${postId}/photos/upload`,
        { method: "POST", body: fd },
      );
      // Phase 3 lands the photo endpoint; Phase 2 tolerates 404 so the flow still progresses to the output page.
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
    status === "uploading-meta"
      ? "Creating post…"
      : status === "uploading-photos"
        ? "Uploading photos…"
        : status === "done"
          ? "Opening your post…"
          : "Create Google post";

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="relative z-10 py-12 max-w-xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          New Google post
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Today&apos;s job → a Google-ready post
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick the service, add the neighborhood, and upload 1–10 photos. Brago
          picks the best after shot and writes a Google-safe caption.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-4">
          <div className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Industry</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SERVICE_TYPES) as Industry[]).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onIndustryChange(i)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    industry === i
                      ? "bg-foreground text-background"
                      : "border-border"
                  }`}
                >
                  {INDUSTRY_LABEL[i]}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Service type</span>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              {SERVICE_TYPES[industry].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Service area or neighborhood</span>
            <input
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="e.g. South Austin"
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Job photos (1–10)</span>
            <input
              type="file"
              multiple
              accept="image/*,.heic,.heif"
              onChange={(e) => onFiles(e.target.files)}
              className="text-xs"
            />
            <span className="text-xs text-muted-foreground">
              JPEG / PNG / WebP / HEIC supported.
            </span>
          </label>

          {previews.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {previews.map((src, idx) => (
                <li
                  key={src}
                  className="relative aspect-square overflow-hidden rounded-md border border-border"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-[10px] px-1.5 py-0.5"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>I have permission to use these photos for marketing.</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={
              status === "uploading-meta" || status === "uploading-photos"
            }
            className="rounded-full"
          >
            {stepLabel}
          </Button>

          <p className="text-xs text-muted-foreground">
            By creating a post you agree to our{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </Container>
    </div>
  );
}
