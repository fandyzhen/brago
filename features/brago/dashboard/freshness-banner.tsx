"use client";

import { useEffect, useState } from "react";

type Snapshot = {
  lastPostAt: string | null;
  streakDays: number;
  status: "fresh" | "stale" | "empty";
  label: string;
};

export function FreshnessBanner() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/brago/freshness")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setSnap(d as Snapshot);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snap) return null;
  const color =
    snap.status === "fresh"
      ? "bg-green-100 text-green-900"
      : snap.status === "stale"
        ? "bg-yellow-100 text-yellow-900"
        : "bg-foreground/5 text-foreground";

  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${color}`}>
      <div className="font-medium">{snap.label}</div>
      {snap.streakDays > 1 && (
        <div className="text-xs mt-0.5">
          {snap.streakDays}-day posting streak
        </div>
      )}
    </div>
  );
}
