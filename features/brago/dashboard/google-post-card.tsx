import Link from "next/link";

export type GooglePostCardProps = {
  id: string;
  serviceType: string;
  serviceArea: string | null;
  status: "draft" | "ready" | "posted_manually" | "archived";
  language: "en" | "es";
  thumbnailUrl?: string | null;
};

const STATUS_LABEL: Record<GooglePostCardProps["status"], string> = {
  draft: "Draft",
  ready: "Ready",
  posted_manually: "Posted",
  archived: "Archived",
};

export function GooglePostCard(p: GooglePostCardProps) {
  return (
    <Link
      href={`/google-posts/${p.id}`}
      className="block rounded-xl border border-border bg-card p-4 hover:bg-foreground/5 transition-colors"
    >
      <div className="flex items-start gap-3">
        {p.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.thumbnailUrl}
            alt=""
            className="h-12 w-12 rounded-md object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-md bg-muted" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{p.serviceType}</div>
          <div className="text-xs text-muted-foreground truncate">
            {p.serviceArea ?? "—"} ·{" "}
            <span data-testid="status">{STATUS_LABEL[p.status]}</span> ·{" "}
            <span data-testid="lang">{p.language.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
