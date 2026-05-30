"use client";

import { useCallback, useState } from "react";
import { mapWithConcurrency } from "@/lib/brago/concurrency";

export type PrepareStatus =
  | { status: "idle" }
  | { status: "preparing"; processed: number; total: number }
  | { status: "ready"; files: File[] }
  | { status: "error"; message: string };

const HEIC_MIME = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

function isHeic(file: File): boolean {
  if (HEIC_MIME.has(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

type HeicToInput = {
  blob: Blob;
  type?: string;
  quality?: number;
};

type HeicToFn = (input: HeicToInput) => Promise<Blob>;

function pickHeicToFn(mod: unknown): HeicToFn | null {
  if (!mod || typeof mod !== "object") return null;
  const m = mod as Record<string, unknown>;
  if (typeof m.heicTo === "function") return m.heicTo as HeicToFn;
  if (typeof m.default === "function") return m.default as HeicToFn;
  const def = m.default as Record<string, unknown> | undefined;
  if (def && typeof def.heicTo === "function") return def.heicTo as HeicToFn;
  return null;
}

export function usePhotoPrepare(maxFiles = 10) {
  const [state, setState] = useState<PrepareStatus>({ status: "idle" });

  const prepare = useCallback(
    async (input: File[]): Promise<File[]> => {
      const list = input.slice(0, maxFiles);
      if (list.length === 0) {
        setState({ status: "idle" });
        return [];
      }
      setState({ status: "preparing", processed: 0, total: list.length });
      try {
        const compressMod = await import("browser-image-compression");
        const compress = (compressMod.default ?? compressMod) as (
          file: File,
          opts: Record<string, unknown>,
        ) => Promise<File>;
        // HEIC 库懒加载：多个并发任务共享同一次 import，避免重复加载
        let heicToPromise: Promise<HeicToFn> | null = null;
        const getHeicTo = (): Promise<HeicToFn> => {
          if (!heicToPromise) {
            heicToPromise = import("heic-to")
              .catch(() => null)
              .then((mod) => {
                const fn = pickHeicToFn(mod);
                if (!fn) {
                  throw new Error("HEIC conversion library failed to load");
                }
                return fn;
              });
          }
          return heicToPromise;
        };

        let done = 0;
        // 并发上限 3：压缩走 web worker，太多并发会吃满移动端 CPU/内存
        const out = await mapWithConcurrency(list, 3, async (file) => {
          let working: File = file;
          if (isHeic(file)) {
            const heicTo = await getHeicTo();
            const converted = await heicTo({
              blob: file,
              type: "image/jpeg",
              quality: 0.9,
            });
            working = new File(
              [converted],
              file.name.replace(/\.(heic|heif)$/i, ".jpg"),
              { type: "image/jpeg" },
            );
          }
          const compressed = await compress(working, {
            maxSizeMB: 4,
            maxWidthOrHeight: 2000,
            useWebWorker: true,
            fileType: "image/jpeg",
            initialQuality: 0.85,
          });
          done += 1;
          setState({ status: "preparing", processed: done, total: list.length });
          return compressed;
        });

        setState({ status: "ready", files: out });
        return out;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to prepare photos";
        setState({ status: "error", message });
        throw err;
      }
    },
    [maxFiles],
  );

  return {
    state,
    prepare,
    reset: () => setState({ status: "idle" }),
  };
}
