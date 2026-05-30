"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/container";
import { Background } from "@/components/background";
import { DEFAULT_BRAND_VOICE, type BrandVoiceProfile } from "@/lib/brago/types";

const TONE_OPTIONS = [
  "friendly",
  "neighborly",
  "casual",
  "professional",
  "premium",
];
const AVOID_OPTIONS = [
  "too_salesy",
  "too_corporate",
  "too_funny",
  "too_many_emojis",
  "fake_guarantees",
];

const SPEAKER_LABEL: Record<BrandVoiceProfile["speaker"], string> = {
  local_owner: "Friendly local owner",
  crew: "Skilled blue-collar crew",
  premium_service: "Premium professional service",
};

const CUSTOMER_LANG_LABEL: Record<BrandVoiceProfile["customerLanguage"], string> = {
  en: "English-speaking customers",
  es: "Spanish-speaking customers",
  mixed: "Mixed neighborhood",
};

const CTA_LABEL: Record<BrandVoiceProfile["ctaStyle"], string> = {
  call_now_button: "Direct people to the Call button on Google",
  soft_contact: "Soft contact mention",
  no_cta: "No CTA",
};

export default function VoiceSettingsPage() {
  const [voice, setVoice] = useState<BrandVoiceProfile>(DEFAULT_BRAND_VOICE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brago/brand-voice")
      .then((r) => r.json())
      .then((d) => {
        if (d.voice) setVoice({ ...DEFAULT_BRAND_VOICE, ...d.voice });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/brago/brand-voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voice),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Save failed");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
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

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="relative z-10 py-12 max-w-xl">
        <p className="mb-2 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Settings
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Your posting style</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Brago uses these preferences when writing your Google captions. Only mention verified claims that you can actually back up.
        </p>

        <div className="mt-8 grid gap-6">
          <section>
            <h2 className="font-display text-sm font-bold mb-2">Speaker</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SPEAKER_LABEL) as Array<BrandVoiceProfile["speaker"]>).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setVoice((v) => ({ ...v, speaker: s }))}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    voice.speaker === s ? "border-brand bg-brand text-brand-foreground" : "border-border"
                  }`}
                >
                  {SPEAKER_LABEL[s]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-sm font-bold mb-2">Tone</h2>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setVoice((v) => ({ ...v, tone: toggle(v.tone, t) }))
                  }
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    voice.tone.includes(t)
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-sm font-bold mb-2">Avoid</h2>
            <div className="flex flex-wrap gap-2">
              {AVOID_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setVoice((v) => ({ ...v, avoid: toggle(v.avoid, t) }))
                  }
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    voice.avoid.includes(t)
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border"
                  }`}
                >
                  {t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-sm font-bold mb-2">Main customer language</h2>
            <select
              value={voice.customerLanguage}
              onChange={(e) =>
                setVoice((v) => ({
                  ...v,
                  customerLanguage: e.target.value as BrandVoiceProfile["customerLanguage"],
                }))
              }
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {(Object.keys(CUSTOMER_LANG_LABEL) as Array<BrandVoiceProfile["customerLanguage"]>).map((k) => (
                <option key={k} value={k}>
                  {CUSTOMER_LANG_LABEL[k]}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h2 className="font-display text-sm font-bold mb-2">CTA style</h2>
            <select
              value={voice.ctaStyle}
              onChange={(e) =>
                setVoice((v) => ({
                  ...v,
                  ctaStyle: e.target.value as BrandVoiceProfile["ctaStyle"],
                }))
              }
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {(Object.keys(CTA_LABEL) as Array<BrandVoiceProfile["ctaStyle"]>).map((k) => (
                <option key={k} value={k}>
                  {CTA_LABEL[k]}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h2 className="font-display text-sm font-bold mb-2">Verified claims</h2>
            <p className="text-xs text-muted-foreground mb-2">
              Only enable items you can actually verify (license number, insurance certificate, etc.). Brago will not mention claims you have not turned on here.
            </p>
            <div className="grid gap-2 text-xs">
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={!!voice.verifiedClaims.licensed}
                  onChange={(e) =>
                    setVoice((v) => ({
                      ...v,
                      verifiedClaims: { ...v.verifiedClaims, licensed: e.target.checked },
                    }))
                  }
                />{" "}
                Licensed
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={!!voice.verifiedClaims.insured}
                  onChange={(e) =>
                    setVoice((v) => ({
                      ...v,
                      verifiedClaims: { ...v.verifiedClaims, insured: e.target.checked },
                    }))
                  }
                />{" "}
                Insured
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={!!voice.verifiedClaims.familyOwned}
                  onChange={(e) =>
                    setVoice((v) => ({
                      ...v,
                      verifiedClaims: { ...v.verifiedClaims, familyOwned: e.target.checked },
                    }))
                  }
                />{" "}
                Family owned
              </label>
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-brand text-brand-foreground px-5 py-2.5 text-sm font-bold shadow-tactile transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save posting style"}
          </button>
          {saved && <p className="text-xs text-green-600">Saved.</p>}

          <p className="text-xs text-muted-foreground">
            <Link href="/settings" className="underline">Back to settings</Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
