import "server-only";
import { cookies as nextCookies } from "next/headers";

export const ANON_COOKIE_PRIMARY = "brago_anon_id";
export const ANON_COOKIE_BACKUP = "brago_anon_id_persist";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

export async function readAnonIdFromRequestCookies(
  cookieHeader: string | null,
): Promise<string | null> {
  if (!cookieHeader) return null;
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    map.set(k, rest.join("="));
  }
  return map.get(ANON_COOKIE_PRIMARY) || map.get(ANON_COOKIE_BACKUP) || null;
}

export async function writeAnonIdCookie(anonId: string): Promise<void> {
  const cookieStore = await nextCookies();
  const opts = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    httpOnly: false,
  };
  cookieStore.set(ANON_COOKIE_PRIMARY, anonId, opts);
  cookieStore.set(ANON_COOKIE_BACKUP, anonId, opts);
}

export async function clearAnonIdCookies(): Promise<void> {
  const cookieStore = await nextCookies();
  cookieStore.delete(ANON_COOKIE_PRIMARY);
  cookieStore.delete(ANON_COOKIE_BACKUP);
}
