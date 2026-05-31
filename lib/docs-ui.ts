import { defineI18nUI } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { localeNames } from '@/i18n.config';
import { docsI18n } from '@/lib/docs-i18n';
import { websiteConfig } from '@/constants/website';

export const docsI18nUI = defineI18nUI(docsI18n, {
  translations: {
    en: {
      displayName: localeNames.en,
      search: 'Search docs',
    },
  },
});

export function getDocsBaseOptions(_locale: string): BaseLayoutProps {
  return {
    i18n: docsI18n,
    nav: {
      title: websiteConfig.docsName,
      url: '/docs',
    },
  };
}
