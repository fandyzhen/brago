import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix } from './i18n.config';

export const proxy = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  localeDetection: false,
});

export const config = {
  matcher: [
    '/',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
