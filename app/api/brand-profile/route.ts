import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { brandProfile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";

const updateBrandProfileSchema = z.object({
  businessName: z.string().max(120).optional(),
  phone: z.string().max(32).optional(),
  serviceArea: z.string().max(120).optional(),
  isLicensed: z.boolean().optional(),
  isInsured: z.boolean().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  googleReviewCount: z.number().int().min(0).max(999999).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const rows = await db
      .select()
      .from(brandProfile)
      .where(eq(brandProfile.userId, access.user.id))
      .limit(1);

    return NextResponse.json({ brandProfile: rows[0] ?? null });
  } catch (err) {
    console.error("[brand-profile GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

  const parsed = updateBrandProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const existing = await db
      .select({ id: brandProfile.id })
      .from(brandProfile)
      .where(eq(brandProfile.userId, access.user.id))
      .limit(1);

    let row;
    if (existing.length > 0) {
      // Update
      const updated = await db
        .update(brandProfile)
        .set({
          businessName: data.businessName,
          phone: data.phone,
          serviceArea: data.serviceArea,
          isLicensed: data.isLicensed,
          isInsured: data.isInsured,
          logoUrl: data.logoUrl || null,
          googleReviewCount: data.googleReviewCount ?? null,
          updatedAt: new Date(),
        })
        .where(eq(brandProfile.userId, access.user.id))
        .returning();
      row = updated[0];
    } else {
      // Insert
      const inserted = await db
        .insert(brandProfile)
        .values({
          id: crypto.randomUUID(),
          userId: access.user.id,
          businessName: data.businessName,
          phone: data.phone,
          serviceArea: data.serviceArea,
          isLicensed: data.isLicensed ?? false,
          isInsured: data.isInsured ?? false,
          logoUrl: data.logoUrl || null,
          googleReviewCount: data.googleReviewCount ?? null,
        })
        .returning();
      row = inserted[0];
    }

    return NextResponse.json({ brandProfile: row });
  } catch (err) {
    console.error("[brand-profile PUT]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
