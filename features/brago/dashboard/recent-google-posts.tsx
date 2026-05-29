"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GooglePostCard, type GooglePostCardProps } from "./google-post-card";

type PostRow = GooglePostCardProps & { createdAt: string };

export function RecentGooglePosts() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brago/google-posts?limit=8")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.posts ?? []) as Array<Record<string, unknown>>;
        setPosts(
          list.map((p) => ({
            id: String(p.id),
            serviceType: String(p.serviceType ?? ""),
            serviceArea: (p.serviceArea as string | null) ?? null,
            status: (p.status as PostRow["status"]) ?? "draft",
            language: (p.language as PostRow["language"]) ?? "en",
            thumbnailUrl: null,
            createdAt: String(p.createdAt ?? ""),
          })),
        );
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading recent Google posts…</p>;
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <p>No Google posts yet.</p>
        <Link
          href="/create"
          className="mt-3 inline-block text-sm underline text-foreground"
        >
          Upload today&apos;s job
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {posts.map((p) => (
        <GooglePostCard key={p.id} {...p} />
      ))}
    </div>
  );
}
