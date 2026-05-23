import { MetadataRoute } from 'next'

// localePrefix: 'as-needed' — English (default) has no prefix, Chinese has /zh/ prefix
// English:  https://example.com/pricing
// Chinese:  https://example.com/zh/pricing

type RouteConfig = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

const PUBLIC_ROUTES: RouteConfig[] = [
  // Core
  { path: '',                                           changeFrequency: 'daily',   priority: 1.0 },
  { path: '/pricing',                                   changeFrequency: 'weekly',  priority: 0.9 },
  // Industry pages
  { path: '/industries',                                changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/industries/pressure-washing-marketing',    changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/industries/auto-detailing-marketing',      changeFrequency: 'weekly',  priority: 0.9 },
  // Template pages
  { path: '/templates',                                 changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/templates/google-business-profile-posts',  changeFrequency: 'weekly',  priority: 0.8 },
  // Marketing / legal
  { path: '/blog',                                      changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/contact',                                   changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy',                                   changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms',                                     changeFrequency: 'monthly', priority: 0.3 },
  { path: '/cookies',                                   changeFrequency: 'monthly', priority: 0.3 },
  { path: '/refund',                                    changeFrequency: 'monthly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,           // English — no locale prefix
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        'x-default': `${baseUrl}${path}`,
        en: `${baseUrl}${path}`,
        zh: `${baseUrl}/zh${path}`,
      },
    },
  }))
}
