import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n.config";
import { Archivo, Hanken_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";

// Display: industrial grotesque with billboard confidence (headlines, the "brag").
const fontDisplay = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

// Body: warm, highly legible humanist grotesque — easy to read on a phone on a job site.
const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
import { ThemeProvider } from "@/context/theme-provider";
import { Toaster } from "sonner";
import Analytics from "@/src/analytics/analytics";
import "../globals.css";

export default async function LocaleLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={cn(
          fontSans.variable,
          fontDisplay.variable,
          "font-sans bg-background text-foreground antialiased min-h-screen w-full"
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          enableSystem
          disableTransitionOnChange
          defaultTheme="light"
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <Toaster position="top-right" richColors />
            <Analytics />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
