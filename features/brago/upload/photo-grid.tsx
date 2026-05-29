"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo } from "react";

export function PhotoGrid({
  files,
  onRemove,
}: {
  files: File[];
  onRemove?: (index: number) => void;
}) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [urls]);

  if (urls.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-2">
      {urls.map((u, i) => (
        <li
          key={u}
          className="relative aspect-square overflow-hidden rounded-md border border-border"
        >
          <img src={u} alt="" className="h-full w-full object-cover" />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-[10px] px-1.5 py-0.5"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
