"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Background } from "@/components/background";
import { Button } from "@/components/button";
import { Container } from "@/components/container";

// 仅允许跳回站内相对路径，避免开放重定向漏洞
function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

type BrandProfile = {
  id?: string;
  businessName?: string | null;
  phone?: string | null;
  serviceArea?: string | null;
  isLicensed: boolean;
  isInsured: boolean;
  logoUrl?: string | null;
  googleReviewCount?: number | null;
};

type SaveState = { type: "success" | "error"; message: string } | null;

export default function BrandSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);

  const [form, setForm] = useState<BrandProfile>({
    businessName: "",
    phone: "",
    serviceArea: "",
    isLicensed: false,
    isInsured: false,
    logoUrl: "",
    googleReviewCount: undefined,
  });

  // Load current brand profile
  useEffect(() => {
    fetch("/api/brand-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.brandProfile) {
          setForm({
            businessName: data.brandProfile.businessName ?? "",
            phone: data.brandProfile.phone ?? "",
            serviceArea: data.brandProfile.serviceArea ?? "",
            isLicensed: data.brandProfile.isLicensed ?? false,
            isInsured: data.brandProfile.isInsured ?? false,
            logoUrl: data.brandProfile.logoUrl ?? "",
            googleReviewCount: data.brandProfile.googleReviewCount ?? undefined,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveState(null);

    try {
      const payload: Record<string, unknown> = {
        businessName: form.businessName || undefined,
        phone: form.phone || undefined,
        serviceArea: form.serviceArea || undefined,
        isLicensed: form.isLicensed,
        isInsured: form.isInsured,
        logoUrl: form.logoUrl || undefined,
        googleReviewCount:
          form.googleReviewCount != null ? Number(form.googleReviewCount) : null,
      };

      const res = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveState({ type: "success", message: "Brand profile saved!" });
        // 如果用户是从别处带 returnTo 跳来的，保存成功后自动跳回
        if (returnTo) {
          // 给用户 600ms 看到 "saved" toast 再跳
          setTimeout(() => router.push(returnTo), 600);
        }
      } else {
        const data = await res.json();
        setSaveState({ type: "error", message: data.error ?? "Save failed" });
      }
    } catch {
      setSaveState({ type: "error", message: "Network error, please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="relative z-10 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-xl mx-auto"
        >
          <h1 className="font-display text-2xl font-extrabold tracking-tight mb-1">Brand Profile</h1>
          <p className="text-sm text-muted-foreground mb-8">
            {returnTo
              ? "Fill in your business name to continue. Phone and service area are optional but help your posts."
              : "This info appears on your generated social posts."}
          </p>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Business name</label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Austin Pressure Pros"
                  value={form.businessName ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  maxLength={32}
                  placeholder="e.g. (512) 555-0184"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
              </div>

              {/* Service Area */}
              <div>
                <label className="block text-sm font-medium mb-1">Service area</label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Austin, TX"
                  value={form.serviceArea ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, serviceArea: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
              </div>

              {/* Google Review Count */}
              <div>
                <label className="block text-sm font-medium mb-1">Google review count</label>
                <input
                  type="number"
                  min={0}
                  max={999999}
                  placeholder="e.g. 247"
                  value={form.googleReviewCount ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      googleReviewCount: v === "" ? undefined : parseInt(v, 10),
                    }));
                  }}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-ring/40"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown on your posts as ★★★★★ N Google reviews.
                </p>
              </div>

              {/* Licensed / Insured */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isLicensed}
                    onChange={(e) => setForm((f) => ({ ...f, isLicensed: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Licensed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isInsured}
                    onChange={(e) => setForm((f) => ({ ...f, isInsured: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Insured</span>
                </label>
              </div>

              {/* Save state feedback */}
              {saveState && (
                <p
                  className={`text-sm ${
                    saveState.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {saveState.message}
                </p>
              )}

              <Button variant="accent" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save brand profile"}
              </Button>
            </form>
          )}
        </motion.div>
      </Container>
    </div>
  );
}
