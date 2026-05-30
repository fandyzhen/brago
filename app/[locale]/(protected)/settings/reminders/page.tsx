"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Background } from "@/components/background";
import { Container } from "@/components/container";

type Settings = {
  enabled: boolean;
  dayOfWeek: number;
  hour: number;
  timezone: string;
  pausedUntil: string | null;
};

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  dayOfWeek: 1,
  hour: 9,
  timezone: "America/New_York",
  pausedUntil: null,
};

export default function ReminderSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectedTz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone ||
          DEFAULT_SETTINGS.timezone
        : DEFAULT_SETTINGS.timezone;
    fetch("/api/brago/reminder-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings({
            enabled: d.settings.enabled,
            dayOfWeek: d.settings.dayOfWeek,
            hour: d.settings.hour,
            timezone: d.settings.timezone,
            pausedUntil: d.settings.pausedUntil ?? null,
          });
        } else {
          setSettings({ ...DEFAULT_SETTINGS, timezone: detectedTz });
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/brago/reminder-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: settings.enabled,
          dayOfWeek: settings.dayOfWeek,
          hour: settings.hour,
          timezone: settings.timezone,
          pausedUntilIsoDate: settings.pausedUntil,
        }),
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
      <Container className="relative z-10 py-12 max-w-md">
        <p className="mb-2 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Settings
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Weekly Google reminders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A quick email when we notice your Google profile has gone seven days without a new post.
        </p>

        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) =>
              setSettings((s) => ({ ...s, enabled: e.target.checked }))
            }
          />
          Send me a weekly reminder
        </label>

        <label className="mt-4 grid gap-1 text-sm">
          Day of week
          <select
            value={settings.dayOfWeek}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                dayOfWeek: Number(e.target.value),
              }))
            }
            className="rounded-xl border border-border bg-background px-4 py-2.5 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 grid gap-1 text-sm">
          Hour (0-23, in your timezone)
          <input
            type="number"
            min={0}
            max={23}
            value={settings.hour}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                hour: Math.max(0, Math.min(23, Number(e.target.value) || 0)),
              }))
            }
            className="rounded-xl border border-border bg-background px-4 py-2.5 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>

        <label className="mt-4 grid gap-1 text-sm">
          Timezone
          <input
            value={settings.timezone}
            onChange={(e) =>
              setSettings((s) => ({ ...s, timezone: e.target.value }))
            }
            className="rounded-xl border border-border bg-background px-4 py-2.5 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-2 items-center">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-brand text-brand-foreground px-5 py-2.5 text-sm font-bold shadow-tactile transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save reminders"}
          </button>
          {saved && <p className="text-xs text-green-600">Saved.</p>}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          <Link href="/settings" className="underline">
            Back to settings
          </Link>
        </p>
      </Container>
    </div>
  );
}
