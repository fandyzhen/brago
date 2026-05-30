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
      {/* pt-20 / md:pt-24 reserves room for the fixed top-4 nav (~60-72px tall).
          Pages should not add their own top padding to clear the nav. */}
      <div className="pt-20 md:pt-24">{children}</div>
      <Footer />
    </main>
  );
}
