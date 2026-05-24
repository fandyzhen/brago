/**
 * Server-side in-memory cache for poster preview batches.
 *
 * Lifecycle:
 *   preview-batch endpoint  → setBatch()       (thumbnails only)
 *   finalize endpoint       → getBatch()       (read originals to render 1080)
 *   finalize endpoint       → markIndexUsed()  (after charging + writing post)
 *
 * Eviction:
 *   - 30 min TTL on each entry
 *   - LRU cap at MAX_ENTRIES (oldest createdAt gets evicted on overflow)
 *   - Periodic cleanupExpired() runs every 5 min
 */

export type BatchItem = {
  templateId: string;
  name: string;
  thumbnailDataUrl: string;
};

export type BatchBrandFields = {
  businessName?: string;
  phone?: string;
  serviceArea?: string;
  isLicensed: boolean;
  isInsured: boolean;
  googleReviewCount?: number;
};

export type BatchEntry = {
  userId: string;
  beforeDataUrl: string;
  afterDataUrl: string;
  headline: string;
  description?: string;
  brandFields: BatchBrandFields;
  items: BatchItem[];
  usedIndices: Set<number>;
  downloadedDataUrls: Map<number, string>;
  createdAt: number;
  expiresAt: number;
};

export type BatchEntryInput = Omit<
  BatchEntry,
  "usedIndices" | "downloadedDataUrls" | "createdAt" | "expiresAt"
>;

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 200;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const cache = new Map<string, BatchEntry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanupTimer() {
  if (cleanupTimer || typeof setInterval !== "function") return;
  cleanupTimer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
  // Don't keep Node process alive on this timer
  if (typeof (cleanupTimer as unknown as { unref?: () => void }).unref === "function") {
    (cleanupTimer as unknown as { unref: () => void }).unref();
  }
}

export function setBatch(batchId: string, input: BatchEntryInput): void {
  const now = Date.now();
  cache.set(batchId, {
    ...input,
    usedIndices: new Set<number>(),
    downloadedDataUrls: new Map<number, string>(),
    createdAt: now,
    expiresAt: now + TTL_MS,
  });
  evictIfOverCap();
  ensureCleanupTimer();
}

export function getBatch(batchId: string): BatchEntry | undefined {
  const entry = cache.get(batchId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(batchId);
    return undefined;
  }
  return entry;
}

export function deleteBatch(batchId: string): void {
  cache.delete(batchId);
}

export function markIndexUsed(batchId: string, index: number, hiResDataUrl: string): void {
  const entry = cache.get(batchId);
  if (!entry) return;
  entry.usedIndices.add(index);
  entry.downloadedDataUrls.set(index, hiResDataUrl);
}

export function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(id);
  }
}

function evictIfOverCap(): void {
  if (cache.size <= MAX_ENTRIES) return;
  const overflow = cache.size - MAX_ENTRIES;
  // Map iteration order is insertion order in JS — oldest first
  let i = 0;
  for (const id of cache.keys()) {
    if (i >= overflow) break;
    cache.delete(id);
    i++;
  }
}

/** Test-only: clear cache + cancel timer. */
export function _resetForTests(): void {
  cache.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
