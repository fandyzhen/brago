import { redirect } from "next/navigation";
import type { Locale } from "@/i18n.config";

/**
 * `/create` retired — all users (anonymous and authed) share the unified
 * funnel at `/free-google-post-generator`. The result page locks/unlocks
 * Copy/Download/Spanish/Regen by session state. This file stays as a
 * permanent redirect so any old links keep working.
 */
export default async function RetiredCreatePage(props: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await props.params;
  const prefix = locale === "en" ? "" : `/${locale}`;
  redirect(`${prefix}/free-google-post-generator`);
}
