import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { post } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { Container } from "@/components/container";

export const dynamic = "force-dynamic";

const CHANNEL_LABEL: Record<string, string> = {
  google_business_profile: "Google",
  facebook_nextdoor: "Facebook / Nextdoor",
  instagram: "Instagram",
};

const INDUSTRY_LABEL: Record<string, string> = {
  pressure_washing: "Pressure Washing",
  auto_detailing: "Auto Detailing",
};

export default async function PostsPage() {
  const h = await headers();
  const access = await getActiveSessionUser(h);
  if (!access.ok) redirect("/login?next=/posts");

  const rows = await db
    .select()
    .from(post)
    .where(eq(post.userId, access.user.id))
    .orderBy(desc(post.createdAt))
    .limit(50);

  return (
    <div className="bg-paper-glow min-h-screen">
      <Container className="py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Your Google posts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every Google post you drafted, newest first.
            </p>
          </div>
          <Link
            href="/create"
            className="rounded-xl bg-brand text-brand-foreground px-4 py-2 text-sm font-bold shadow-tactile transition-all hover:-translate-y-0.5"
          >
            New post
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
            <p>No posts yet.</p>
            <Link
              href="/create"
              className="mt-3 inline-block text-sm underline hover:text-foreground"
            >
              Create your first post
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border overflow-hidden bg-card shadow-sm transition-shadow hover:shadow-tactile"
              >
                {p.outputUrl ? (
                  <a href={p.outputUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.outputUrl}
                      alt={p.headline}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="text-sm font-medium line-clamp-1">{p.headline}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {INDUSTRY_LABEL[p.industry] ?? p.industry} ·{" "}
                    {CHANNEL_LABEL[p.channel] ?? p.channel}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
