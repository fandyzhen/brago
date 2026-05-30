import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { contactMessage } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  locale: z.string().trim().max(8).optional(),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  let parsed;
  try {
    const body = await request.json();
    parsed = contactSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, company, message, locale } = parsed;
  const id = crypto.randomUUID();
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent") || null;

  let emailDelivered = false;
  const inbox = process.env.CONTACT_INBOX_EMAIL;
  if (inbox) {
    const safeBody = escapeHtml(message).replace(/\n/g, "<br />");
    const result = await sendEmail({
      to: inbox,
      subject: `New contact from ${name} (${company})`,
      replyTo: email,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color:#111;margin:0 0 16px;">New contact form submission</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#222;">
            <tr><td style="padding:6px 0;color:#666;">Name</td><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Company</td><td style="padding:6px 0;">${escapeHtml(company)}</td></tr>
            <tr><td style="padding:6px 0;color:#666;">Locale</td><td style="padding:6px 0;">${escapeHtml(locale ?? "-")}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#f6f6f6;border-radius:8px;line-height:1.6;">
            ${safeBody}
          </div>
        </div>
      `,
    });
    emailDelivered = result.success;
    if (!result.success) {
      console.error("[contact] Email delivery failed", result.error);
    }
  } else {
    console.warn("[contact] CONTACT_INBOX_EMAIL not configured; skipping email send");
  }

  try {
    await db.insert(contactMessage).values({
      id,
      name,
      email,
      company,
      message,
      locale: locale ?? null,
      ipAddress,
      userAgent,
      emailDelivered,
    });
  } catch (error) {
    console.error("[contact] DB insert failed", error);
    return NextResponse.json(
      { error: "Failed to save your message. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, id }, { status: 200 });
}
