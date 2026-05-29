"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Background } from "@/components/background";
import { Container } from "@/components/container";

function UnsubscribeInner() {
  const params = useSearchParams();
  const userId = params.get("u");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [paused, setPaused] = useState<string | null>(null);

  const call = async (method: "POST" | "PUT") => {
    if (!userId) return;
    setState("loading");
    try {
      const res = await fetch("/api/brago/reminders/unsubscribe", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      if (method === "PUT") setPaused(data.pausedUntil);
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <Container className="relative z-10 py-16 max-w-md">
      <h1 className="text-2xl font-bold">Weekly Google reminders</h1>
      {!userId ? (
        <p className="mt-4 text-sm text-red-600">Missing user token.</p>
      ) : state === "done" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {paused
            ? `Paused until ${new Date(paused).toLocaleDateString()}.`
            : "You will not receive any more weekly reminders. We hope to see you back."}
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          <button
            onClick={() => call("PUT")}
            disabled={state === "loading"}
            className="rounded-full border border-border px-4 py-2 text-sm"
          >
            Pause for 4 weeks
          </button>
          <button
            onClick={() => call("POST")}
            disabled={state === "loading"}
            className="rounded-full bg-foreground text-background px-4 py-2 text-sm"
          >
            Unsubscribe
          </button>
          {state === "error" && (
            <p className="text-sm text-red-600">Something went wrong.</p>
          )}
        </div>
      )}
    </Container>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="relative min-h-screen">
      <Background />
      <Suspense fallback={<div className="py-16 text-sm">Loading…</div>}>
        <UnsubscribeInner />
      </Suspense>
    </div>
  );
}
