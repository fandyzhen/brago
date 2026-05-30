"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/button";
import { useTrialState } from "./use-trial-state";
import { SignupModal } from "./components/signup-modal";

type Industry = "pressure_washing" | "auto_detailing" | "cleaning";

const SERVICE_TYPES: Record<Industry, string[]> = {
  pressure_washing: ["driveway", "patio", "siding / house wash", "walkway", "deck", "fence", "roof"],
  auto_detailing: ["interior detail", "exterior wash", "ceramic coating", "paint correction", "polish", "headlight restoration", "wheel cleaning", "engine bay"],
  cleaning: ["deep clean", "move-in cleaning", "move-out cleaning", "recurring", "post construction", "office cleaning", "window cleaning", "carpet cleaning"],
};

type Tone = "friendly" | "professional" | "local_pride";
type Lang = "en" | "es";

type UploadedPhoto = {
  id: string;          // gpp_* once uploaded; pending_* before
  previewUrl: string;  // local objectURL
  remoteUrl?: string;  // R2 URL after upload
  status: "uploading" | "done" | "failed";
};

type ResultPayload = {
  bestPhotoId: string | null;
  whyThisPhoto?: string | null;
  caption: string;
  policyOk: boolean;
};

const MAX_PHOTOS = 10;
const MAX_CONCURRENT_UPLOADS = 3;

export function FreeGeneratorClient() {
  const t = useTranslations("freeTrial");
  const locale = useLocale();
  const { save } = useTrialState();

  const [industry, setIndustry] = useState<Industry>("pressure_washing");
  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES.pressure_washing[0]);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [styleOpen, setStyleOpen] = useState(false);
  const [tone, setTone] = useState<Tone>("friendly");
  const [language, setLanguage] = useState<Lang>(locale === "zh" ? "en" : (locale as Lang));
  const [consent, setConsent] = useState(false);

  const [postId, setPostId] = useState<string | null>(null);
  const [anonId, setAnonId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<"idle" | "creating" | "vision" | "caption" | "done" | "error" | "quota">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  const uploadedCount = photos.filter(p => p.status === "done").length;
  const canGenerate = uploadedCount >= 1 && location.trim().length > 0 && consent && generating === "idle";

  // ensure we have an anon google_post before uploading
  const ensurePost = async (): Promise<{ postId: string; anonId: string } | null> => {
    if (postId && anonId) return { postId, anonId };
    setGenerating("creating");
    try {
      const res = await fetch("/api/brago/anonymous/google-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          serviceType,
          serviceArea: location.trim() || null,
          brandName: "Trial",       // server still requires it; placeholder, unused downstream
          tone,
          language,
        }),
      });
      if (res.status === 429) {
        setGenerating("quota");
        return null;
      }
      if (!res.ok) {
        setError(t("steps.generating.failed"));
        setGenerating("error");
        return null;
      }
      const data = (await res.json()) as { postId: string; anonId: string };
      setPostId(data.postId);
      setAnonId(data.anonId);
      setGenerating("idle");
      return { postId: data.postId, anonId: data.anonId };
    } catch {
      setError(t("steps.generating.failed"));
      setGenerating("error");
      return null;
    }
  };

  const uploadFiles = async (files: File[]) => {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    const accept = files.slice(0, room).filter(f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);

    // Render placeholders immediately
    const pending: UploadedPhoto[] = accept.map(f => ({
      id: `pending_${crypto.randomUUID()}`,
      previewUrl: URL.createObjectURL(f),
      status: "uploading",
    }));
    setPhotos(prev => [...prev, ...pending]);

    // Ensure post exists (lazy on first upload)
    const ctx = await ensurePost();
    if (!ctx) {
      // post creation failed; mark placeholders failed
      setPhotos(prev => prev.map(p => pending.find(q => q.id === p.id) ? { ...p, status: "failed" } : p));
      return;
    }

    // Parallel upload with concurrency cap
    let cursor = 0;
    const runOne = async () => {
      while (cursor < accept.length) {
        const i = cursor++;
        const file = accept[i];
        const ph = pending[i];
        try {
          const fd = new FormData();
          fd.set("file", file);
          fd.set("anonId", ctx.anonId);
          fd.set("postId", ctx.postId);
          const res = await fetch("/api/brago/anonymous/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("upload");
          const data = (await res.json()) as { photoId: string; url: string };
          setPhotos(prev => prev.map(p =>
            p.id === ph.id ? { ...p, id: data.photoId, remoteUrl: data.url, status: "done" } : p,
          ));
        } catch {
          setPhotos(prev => prev.map(p =>
            p.id === ph.id ? { ...p, status: "failed" } : p,
          ));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, accept.length) }, runOne));
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const onIndustryChange = (next: Industry) => {
    setIndustry(next);
    if (!SERVICE_TYPES[next].includes(serviceType)) {
      setServiceType(SERVICE_TYPES[next][0]);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate || !postId || !anonId) return;
    setError(null);
    setGenerating("vision");
    try {
      const aRes = await fetch(`/api/brago/anonymous/google-posts/${postId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId }),
      });
      const analyze = aRes.ok
        ? (await aRes.json() as { recommendation: { bestPhotoId: string | null; why: string | null } })
        : { recommendation: { bestPhotoId: photos[0]?.id ?? null, why: null } };

      setGenerating("caption");

      // pack user note + tone into customContext for the AI
      const customContext = [
        tone !== "friendly" ? `Use a ${tone === "professional" ? "professional" : "local-pride"} tone.` : "",
        note.trim(),
      ].filter(Boolean).join(" ").trim();

      const cRes = await fetch(`/api/brago/anonymous/google-posts/${postId}/generate-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, customContext: customContext || undefined }),
      });
      if (!cRes.ok) {
        setGenerating("error");
        setError(t("steps.generating.failed"));
        return;
      }
      const caption = (await cRes.json()) as { caption: string; policy: { ok?: boolean } };
      const payload: ResultPayload = {
        bestPhotoId: analyze.recommendation?.bestPhotoId ?? photos[0]?.id ?? null,
        whyThisPhoto: analyze.recommendation?.why ?? null,
        caption: caption.caption,
        policyOk: caption.policy?.ok !== false,
      };
      setResult(payload);
      save({
        usedDate: new Date().toISOString().slice(0, 10),
        postId,
        anonId,
        brand: { name: "Trial", tone },
      });
      setGenerating("done");
    } catch {
      setGenerating("error");
      setError(t("steps.generating.failed"));
    }
  };

  // ---- Render branches ----

  if (generating === "quota") {
    return (
      <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-center shadow-tactile">
        <h2 className="font-display text-xl font-bold">{t("steps.quotaUsed.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("steps.quotaUsed.body")}</p>
        <button
          onClick={() => setSignupOpen(true)}
          className="mt-5 rounded-xl bg-brand text-brand-foreground px-6 py-3 text-base font-bold"
        >
          {t("steps.quotaUsed.cta")}
        </button>
        <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} postId={postId} anonId={anonId} locale={locale} />
      </div>
    );
  }

  if (generating === "done" && result) {
    const bestPhoto = photos.find(p => p.id === result.bestPhotoId) ?? photos[0];
    return (
      <div className="mt-10 grid gap-5 rounded-3xl border border-border bg-card p-6 shadow-tactile">
        <h2 className="font-display text-xl font-bold">{t("steps.result.title")}</h2>
        {bestPhoto && (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bestPhoto.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">Brago</span>
              {result.policyOk && <span className="text-xs">{t("steps.result.policyOk")}</span>}
            </div>
            {result.whyThisPhoto && (
              <div className="border-t border-border bg-background p-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{t("steps.result.whyThisPhoto")}</span> {result.whyThisPhoto}
              </div>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("steps.result.captionLabel")}</div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{result.caption}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[t("steps.result.lockedCopy"), t("steps.result.lockedDownload"), t("steps.result.lockedSpanish"), t("steps.result.lockedRegen")].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setSignupOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-card"
            >
              <Lock className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSignupOpen(true)}
          className="rounded-2xl bg-brand text-brand-foreground px-6 py-4 text-base font-bold shadow-tactile transition-all hover:-translate-y-0.5"
        >
          {t("steps.result.unlockCta")}
          <span className="ml-2 text-sm font-normal opacity-80">— {t("steps.result.unlockSubtext")}</span>
        </button>
        <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} postId={postId} anonId={anonId} locale={locale} />
      </div>
    );
  }

  if (generating === "vision" || generating === "caption" || generating === "creating") {
    return (
      <div className="mt-10 grid place-items-center gap-4 rounded-3xl border border-border bg-card p-12 shadow-tactile">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">
          {generating === "vision" && t("steps.generating.vision")}
          {generating === "caption" && t("steps.generating.caption")}
          {generating === "creating" && t("steps.generating.creating")}
        </p>
      </div>
    );
  }

  // ---- Main form (single page) ----

  return (
    <div className="mt-10 grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-tactile">
      {/* Industry */}
      <Section title={t("form.industry.title")}>
        <PillRow>
          {(Object.keys(SERVICE_TYPES) as Industry[]).map(i => (
            <Pill key={i} active={industry === i} onClick={() => onIndustryChange(i)}>
              {t(`form.industry.options.${i}`)}
            </Pill>
          ))}
        </PillRow>
      </Section>

      {/* Service type */}
      <Section title={t("form.serviceType.title")}>
        <PillRow>
          {SERVICE_TYPES[industry].map(s => (
            <Pill key={s} active={serviceType === s} onClick={() => setServiceType(s)}>
              {s}
            </Pill>
          ))}
        </PillRow>
      </Section>

      {/* Photos */}
      <Section title={t("form.photos.title")}>
        <PhotoGrid
          photos={photos}
          onPick={uploadFiles}
          onRemove={removePhoto}
          hint={
            uploadedCount === 0
              ? t("form.photos.hintEmpty")
              : uploadedCount < 3
                ? t("form.photos.hintMore", { count: 3 - uploadedCount })
                : t("form.photos.hintReady")
          }
        />
      </Section>

      {/* Location */}
      <Section title={t("form.location.title")}>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder={t("form.location.placeholder")}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("form.location.helper")}</p>
      </Section>

      {/* Note */}
      <Section title={t("form.note.title")} subtitle={t("form.note.optional")}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t("form.note.placeholder")}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("form.note.helper")}</p>
      </Section>

      {/* Style drawer (collapsed by default) */}
      <div className="rounded-2xl border border-border">
        <button
          type="button"
          onClick={() => setStyleOpen(v => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
        >
          <span className="font-medium text-foreground">
            {t("form.style.title")} · <span className="text-muted-foreground">{t(`form.style.toneOptions.${tone}`)} · {language === "en" ? "English" : "Español"}</span>
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${styleOpen ? "rotate-180" : ""}`} />
        </button>
        {styleOpen && (
          <div className="grid gap-4 border-t border-border p-4">
            <div className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("form.style.toneLabel")}</span>
              <div className="flex flex-wrap gap-2">
                {(["friendly", "professional", "local_pride"] as Tone[]).map(tn => (
                  <Pill key={tn} active={tone === tn} onClick={() => setTone(tn)}>
                    {t(`form.style.toneOptions.${tn}`)}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("form.style.languageLabel")}</span>
              <div className="flex gap-2">
                {(["en", "es"] as Lang[]).map(l => (
                  <Pill key={l} active={language === l} onClick={() => setLanguage(l)}>
                    {l === "en" ? "English" : "Español"}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span className="leading-relaxed">
          {t.rich("form.consent.text", {
            link: chunks => (
              <a href={`/${locale === "en" ? "" : locale + "/"}privacy`.replace("//", "/")} target="_blank" rel="noreferrer" className="underline">{chunks}</a>
            ),
          })}
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button variant="accent" disabled={!canGenerate} onClick={handleGenerate} className="w-full py-4 text-base">
        {t("form.generateCta")}
      </Button>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} postId={postId} anonId={anonId} locale={locale} />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2.5">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
        {subtitle && <span className="text-xs uppercase tracking-wide text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-foreground hover:bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function PhotoGrid(props: {
  photos: UploadedPhoto[];
  onPick: (files: File[]) => void;
  onRemove: (id: string) => void;
  hint: string;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-5">
        {props.photos.map(p => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="" className={`h-full w-full object-cover ${p.status !== "done" ? "opacity-60" : ""}`} />
            {p.status === "uploading" && (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-white drop-shadow" />
              </div>
            )}
            {p.status === "failed" && (
              <div className="absolute inset-0 grid place-items-center bg-red-900/40 text-xs text-white">failed</div>
            )}
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
        {props.photos.length < MAX_PHOTOS && (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-background/40 text-3xl text-muted-foreground hover:border-foreground/40">
            +
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) props.onPick(files);
              }}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{props.hint}</p>
    </>
  );
}
