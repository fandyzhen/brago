"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { useTrialState } from "./use-trial-state";
import { UploadStep, type UploadedPhoto } from "./components/upload-step";
import { BrandStep, type BrandInput } from "./components/brand-step";
import { ToneStep, type ToneInput } from "./components/tone-step";
import { GeneratingStep, type GeneratingPhase } from "./components/generating-step";
import { ResultStep, type ResultPayload } from "./components/result-step";
import { SignupModal } from "./components/signup-modal";

type Step = "brand" | "upload" | "tone" | "generating" | "result" | "quota_used";

export function FreeGeneratorClient() {
  const locale = useLocale();
  const { state, hydrated, save } = useTrialState();
  const [step, setStep] = useState<Step>("brand");
  const [anonId, setAnonId] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [brand, setBrand] = useState<BrandInput | null>(null);
  const [tone, setTone] = useState<ToneInput | null>(null);
  const [genPhase, setGenPhase] = useState<GeneratingPhase>("vision");
  const [genError, setGenError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  // If hydrated and trial already used today, show quota-used branch.
  if (hydrated && state && step === "brand" && !result) {
    return (
      <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-center shadow-tactile">
        <h2 className="font-display text-xl font-bold">Today&apos;s free trial is used</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign up to unlock and keep generating. 300 credits included.</p>
        <button
          onClick={() => setSignupOpen(true)}
          className="mt-5 rounded-xl bg-brand text-brand-foreground px-6 py-3 text-base font-bold"
        >
          Create my account
        </button>
        <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} postId={state.postId} anonId={state.anonId} locale={locale} />
      </div>
    );
  }

  // ensurePost is called from UploadStep — but we always have postId by then because brand step creates it.
  const ensurePost = useCallback(async () => {
    if (anonId && postId) return { anonId, postId };
    return null;
  }, [anonId, postId]);

  const handleBrandSubmit = async (b: BrandInput) => {
    setBrand(b);
    try {
      const res = await fetch("/api/brago/anonymous/google-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: "pressure_washing",
          serviceType: b.serviceType,
          serviceArea: b.city,
          brandName: b.brandName,
          brandPhone: b.phone,
          tone: "friendly", // tentative; tone-step finalizes
          language: "en",
        }),
      });
      if (res.status === 429) {
        setStep("quota_used");
        return;
      }
      if (!res.ok) {
        setGenError("Could not start your trial. Please retry.");
        setStep("generating");
        setGenPhase("error");
        return;
      }
      const data = (await res.json()) as { postId: string; anonId: string };
      setPostId(data.postId);
      setAnonId(data.anonId);
      setStep("upload");
    } catch {
      setGenError("Network error. Please retry.");
      setStep("generating");
      setGenPhase("error");
    }
  };

  const handleToneSubmit = async (tnput: ToneInput) => {
    setTone(tnput);
    setStep("generating");
    setGenPhase("vision");
    setGenError(null);
    try {
      const aRes = await fetch(`/api/brago/anonymous/google-posts/${postId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId }),
      });
      const analyzeData = aRes.ok
        ? ((await aRes.json()) as { recommendation: { bestPhotoId: string | null; why: string | null } })
        : { recommendation: { bestPhotoId: photos[0]?.id ?? null, why: null } };

      setGenPhase("caption");
      const cRes = await fetch(`/api/brago/anonymous/google-posts/${postId}/generate-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId }),
      });
      if (!cRes.ok) {
        setGenPhase("error");
        setGenError("Caption generation failed");
        return;
      }
      const captionData = (await cRes.json()) as { caption: string; policy: { ok?: boolean } };
      const payload: ResultPayload = {
        bestPhotoId: analyzeData?.recommendation?.bestPhotoId ?? photos[0]?.id ?? null,
        whyThisPhoto: analyzeData?.recommendation?.why ?? null,
        caption: captionData.caption,
        policyOk: captionData.policy?.ok !== false,
      };
      setResult(payload);
      save({
        usedDate: new Date().toISOString().slice(0, 10),
        postId: postId!,
        anonId: anonId!,
        brand: { name: brand?.brandName ?? "", phone: brand?.phone, tone: tnput.tone },
      });
      setStep("result");
    } catch {
      setGenPhase("error");
      setGenError("Generation failed");
    }
  };

  return (
    <div className="mt-10 grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-tactile">
      {step === "brand" && (
        <BrandStep
          initial={brand ?? {}}
          onSubmit={handleBrandSubmit}
          onBack={() => { /* first step, no-op */ }}
        />
      )}
      {step === "upload" && (
        <UploadStep
          anonId={anonId}
          postId={postId}
          ensurePost={ensurePost}
          photos={photos}
          onAdd={(p) => setPhotos((prev) => [...prev, p])}
          onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
          onNext={() => setStep("tone")}
        />
      )}
      {step === "tone" && (
        <ToneStep
          initial={tone ?? {}}
          onSubmit={handleToneSubmit}
          onBack={() => setStep("upload")}
        />
      )}
      {step === "generating" && <GeneratingStep phase={genPhase} error={genError} />}
      {step === "result" && result && (
        <ResultStep photos={photos} result={result} onUnlock={() => setSignupOpen(true)} />
      )}
      {step === "quota_used" && (
        <div className="grid place-items-center gap-3 p-8 text-center">
          <h2 className="font-display text-xl font-bold">Today&apos;s free trial is used</h2>
          <p className="text-sm text-muted-foreground">Sign up to keep generating — 300 credits included on the house.</p>
          <button
            onClick={() => setSignupOpen(true)}
            className="rounded-xl bg-brand text-brand-foreground px-6 py-3 text-base font-bold"
          >
            Create my account
          </button>
        </div>
      )}

      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        postId={postId}
        anonId={anonId}
        locale={locale}
      />
    </div>
  );
}
