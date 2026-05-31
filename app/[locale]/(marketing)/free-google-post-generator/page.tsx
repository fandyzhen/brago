import { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n.config";
import { generatePageMetadata } from "@/lib/metadata";
import { Container } from "@/components/container";
import { getActiveSessionUser } from "@/lib/auth/session";
import { FreeGeneratorClient } from "./client";

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "freeTrial" });
  return generatePageMetadata({
    locale,
    path: "/free-google-post-generator",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function FreeGoogleGeneratorPage(props: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await props.params;
  const hdrs = await headers();
  const access = await getActiveSessionUser(hdrs);
  const isLoggedIn = !!access?.ok;

  const t = await getTranslations({ locale, namespace: "freeTrial" });

  return (
    <div className="bg-paper-glow relative overflow-hidden">
      {/* No top padding here — the marketing layout already reserves space for the fixed nav */}
      <Container className="relative z-20 pb-12 md:pb-24 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 font-display text-[11px] md:text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {isLoggedIn ? "Create a Google post" : "Free trial · No card needed"}
        </p>
        <h1 className="font-display text-2xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
          {t("title")}
        </h1>
        {/* Subtitle hidden on mobile to keep the form above the fold.
            The text remains in i18n + page metadata for SEO. */}
        <p className="mt-3 hidden text-muted-foreground max-w-2xl md:block">{t("subtitle")}</p>

        <FreeGeneratorClient isLoggedIn={isLoggedIn} />
      </Container>
    </div>
  );
}
