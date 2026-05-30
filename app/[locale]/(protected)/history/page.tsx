"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Background } from "@/components/background";
import { Container } from "@/components/container";
import { Button } from "@/components/button";

// ── Types ─────────────────────────────────────────────────────────────────

type HistoryItem = {
  id: string;
  createdAt: string;
  headline: string;
  templateId: string | null;
  templateName: string | null;
  resultUrl: string | null;
  creditsUsed: number;
};

type HistoryResponse = {
  items: HistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── PosterCard ─────────────────────────────────────────────────────────────

function PosterCard({ item, locale }: { item: HistoryItem; locale: string }) {
  const regenHref = `/${locale}/create?templateId=${encodeURIComponent(item.templateId ?? "")}&headline=${encodeURIComponent(item.headline)}`;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card flex flex-col">
      {/* Thumbnail */}
      <div className="aspect-square bg-muted relative">
        {item.resultUrl ? (
          <img
            src={item.resultUrl}
            alt={item.headline}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No preview
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-0.5 flex-1">
        <p className="text-sm font-medium truncate" title={item.headline}>
          {item.headline}
        </p>
        {item.templateName && (
          <p className="text-xs text-muted-foreground">{item.templateName}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{timeAgo(item.createdAt)}</span>
          <span>{item.creditsUsed} credits</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        {item.resultUrl ? (
          <a
            href={item.resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-1.5 rounded-lg border border-border hover:bg-hover transition-colors"
          >
            Open
          </a>
        ) : (
          <span className="flex-1 text-center text-xs py-1.5 rounded-lg border border-border opacity-40 cursor-not-allowed select-none">
            Open
          </span>
        )}
        <Link
          href={regenHref}
          className="flex-1 text-center text-xs font-bold py-1.5 rounded-lg bg-brand text-brand-foreground hover:opacity-90 transition-opacity"
        >
          Re-generate
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();

  const fetchHistory = useCallback(async (nextCursor: string | null = null) => {
    const params = new URLSearchParams({ limit: "20" });
    if (nextCursor) params.set("cursor", nextCursor);

    const res = await fetch(`/api/posters/history?${params.toString()}`);
    if (!res.ok) return;
    const data: HistoryResponse = await res.json();
    return data;
  }, []);

  // Initial load
  useEffect(() => {
    fetchHistory()
      .then((data) => {
        if (data) {
          setItems(data.items);
          setCursor(data.nextCursor);
          setHasMore(data.hasMore);
        } else {
          setError("Failed to load history. Please refresh the page.");
        }
      })
      .catch(() => setError("Failed to load history. Please refresh the page."))
      .finally(() => setLoading(false));
  }, [fetchHistory]);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchHistory(cursor);
      if (data) {
        setItems((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load more posts. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight mb-1">Post History</h1>
              <p className="text-sm text-muted-foreground">
                Your previously generated social posts.
              </p>
            </div>
            <Link href={`/${locale}/create`}>
              <Button>Create new</Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                No posts yet. Generate your first social post!
              </p>
              <Link href={`/${locale}/create`}>
                <Button>Create your first post</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                  <PosterCard key={item.id} item={item} locale={locale} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </Container>
    </div>
  );
}
