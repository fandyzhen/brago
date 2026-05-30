"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/button";

export type UploadedPhoto = {
  id: string;
  url: string;
  previewUrl: string;
};

export function UploadStep(props: {
  anonId: string | null;
  postId: string | null;
  ensurePost: () => Promise<{ anonId: string; postId: string } | null>;
  photos: UploadedPhoto[];
  onAdd: (photo: UploadedPhoto) => void;
  onRemove: (id: string) => void;
  onNext: () => void;
}) {
  const t = useTranslations("freeTrial.steps.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const ctx = props.anonId && props.postId
        ? { anonId: props.anonId, postId: props.postId }
        : await props.ensurePost();
      if (!ctx) throw new Error("Could not start trial");

      const fd = new FormData();
      fd.set("file", file);
      fd.set("anonId", ctx.anonId);
      fd.set("postId", ctx.postId);

      const res = await fetch("/api/brago/anonymous/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e?.error || "Upload failed");
      }
      const data = (await res.json()) as { photoId: string; url: string };
      props.onAdd({ id: data.photoId, url: data.url, previewUrl: URL.createObjectURL(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const f of files) {
      if (props.photos.length >= 10) break;
      await upload(f);
    }
  };

  return (
    <section className="grid gap-4">
      <h2 className="font-display text-xl font-bold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {props.photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => props.onRemove(p.id)}
              className="absolute right-1 top-1 rounded-full bg-background/80 px-2 py-0.5 text-xs"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        {props.photos.length < 10 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border bg-background/40 text-3xl text-muted-foreground hover:border-foreground/40"
          >
            +
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button variant="accent" disabled={props.photos.length < 3 || uploading} onClick={props.onNext}>
        {t("next")}
      </Button>
    </section>
  );
}
