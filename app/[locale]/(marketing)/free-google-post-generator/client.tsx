"use client";

import { useState } from "react";
import { Button } from "@/components/button";

const SERVICE_TYPES = [
  { value: "driveway", label: "Driveway cleaning" },
  { value: "patio", label: "Patio cleaning" },
  { value: "siding", label: "House wash / siding" },
  { value: "walkway", label: "Walkway cleaning" },
  { value: "deck", label: "Deck wash" },
];

export function FreeGeneratorClient() {
  const [city, setCity] = useState("");
  const [serviceType, setServiceType] = useState("driveway");
  const [caption, setCaption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCaption(null);
    setCopied(false);
    try {
      const fd = new FormData();
      fd.set("industry", "pressure_washing");
      fd.set("serviceType", serviceType);
      fd.set("city", city);
      const res = await fetch("/api/brago/free-generator", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate");
      setCaption(data.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <form onSubmit={onGenerate} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-tactile">
      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service type</span>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {SERVICE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">City or neighborhood</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="South Austin"
          className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </label>

      <Button variant="accent" type="submit" disabled={loading}>
        {loading ? "Drafting…" : "Draft my Google caption"}
      </Button>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {caption && (
        <div className="mt-2 rounded-xl border border-border bg-background p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{caption}</p>
          <button
            type="button"
            onClick={copy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/15 px-3 py-1.5 text-xs font-bold text-brand-foreground transition-colors hover:bg-brand/25"
          >
            {copied ? "Copied!" : "Copy caption"}
          </button>
        </div>
      )}
    </form>
  );
}
