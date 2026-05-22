"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Background } from "@/components/background";
import { Button } from "@/components/button";
import { Container } from "@/components/container";

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
      <Container className="py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-xl mx-auto"
        >
          <h1 className="text-2xl font-bold mb-1">Brand Profile</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
            This info appears on your generated social posts.
          </p>

          {loading ? (
            <p className="text-neutral-400 text-sm">Loading…</p>
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
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
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
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
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
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
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
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                />
                <p className="text-xs text-neutral-400 mt-1">
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

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save brand profile"}
              </Button>
            </form>
          )}
        </motion.div>
      </Container>
    </div>
  );
}
