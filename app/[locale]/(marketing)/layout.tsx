import type { Metadata } from "next";
import { NavBar } from "@/features/navigation/components/navbar";
import { Footer } from "@/components/footer";
import { getTranslations } from 'next-intl/server';
import type { Locale } from "@/i18n.config";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: Locale }>
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'seo' });

  return {
    title: t('home.title'),
    description: t('home.description'),
    openGraph: {
      images: [t('home.ogImage')],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
      <NavBar />
      {/* Minimum safe clearance for the fixed top-4 nav: mobile nav bottom ≈ 56px
          (pt-16 = 64), desktop nav bottom ≈ 66px (pt-20 = 80). Tight enough to
          avoid noticeable empty space above hero content. */}
      <div className="pt-16 md:pt-20">{children}</div>
      <Footer />
    </main>
  );
}
