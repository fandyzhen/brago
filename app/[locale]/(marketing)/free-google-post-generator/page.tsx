import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
  if (access?.ok) {
    const prefix = locale === "en" ? "" : `/${locale}`;
    redirect(`${prefix}/create`);
  }

  const t = await getTranslations({ locale, namespace: "freeTrial" });

  return (
    <div className="bg-paper-glow relative overflow-hidden">
      <Container className="relative z-20 py-16 md:py-24 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Free trial · No credit card
        </p>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">{t("subtitle")}</p>

        <FreeGeneratorClient />
      </Container>
    </div>
  );
}
