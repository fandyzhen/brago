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
    <div className="bg-background min-h-screen">
      <Container className="py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Google posts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every Google post you drafted, newest first.
            </p>
          </div>
          <Link
            href="/create"
            className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            New post
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 py-16 text-center text-neutral-500">
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
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900"
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
                  <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs text-neutral-400">
                    No image
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="text-sm font-medium line-clamp-1">{p.headline}</p>
                  <p className="text-xs text-neutral-400 mt-1">
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
