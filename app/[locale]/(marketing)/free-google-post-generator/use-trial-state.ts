"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "brago_trial_state";

export type TrialState = {
  usedDate: string; // YYYY-MM-DD
  postId: string;
  anonId: string;
  brand: { name: string; phone?: string; tone: string };
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useTrialState() {
  const [state, setState] = useState<TrialState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TrialState;
        if (parsed.usedDate === todayUtc()) {
          setState(parsed);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  const save = useCallback((next: TrialState) => {
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const clear = useCallback(() => {
    setState(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { state, hydrated, save, clear, today: todayUtc() };
}
