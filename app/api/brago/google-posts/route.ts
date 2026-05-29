import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSessionUser } from "@/lib/auth/session";
import {
  createGooglePost,
  listGooglePostsByUser,
} from "@/lib/brago/google-posts";
import { recordConsent } from "@/lib/brago/upload-consents";

export const runtime = "nodejs";

const createSchema = z.object({
  industry: z.enum(["pressure_washing", "auto_detailing", "cleaning"]),
  serviceType: z.string().min(1).max(64),
  serviceArea: z.string().max(120).optional(),
  jobLocation: z.string().max(200).optional(),
  language: z.enum(["en", "es"]).optional(),
  brandProfileId: z.string().optional(),
  hasMarketingPermission: z.boolean(),
});

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitParam)
    ? Math.min(50, Math.max(1, Math.floor(limitParam)))
    : 20;
  const rows = await listGooglePostsByUser(access.user.id, limit);
  return NextResponse.json({ posts: rows });
}

export async function POST(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  if (!parsed.data.hasMarketingPermission) {
    return NextResponse.json(
      {
        error:
          "You must confirm you have permission to use these photos for marketing.",
      },
      { status: 400 },
    );
  }

  const postId = await createGooglePost({
    userId: access.user.id,
    industry: parsed.data.industry,
    serviceType: parsed.data.serviceType,
    serviceArea: parsed.data.serviceArea,
    jobLocation: parsed.data.jobLocation,
    language: parsed.data.language,
    brandProfileId: parsed.data.brandProfileId,
  });

  await recordConsent({
    userId: access.user.id,
    googlePostId: postId,
    hasMarketingPermission: true,
  });

  return NextResponse.json({ postId });
}
